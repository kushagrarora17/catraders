import { expect, test } from "../test";

test.describe("landing page", () => {
  test("renders every section with CMS reviews and structured data", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const section of ["Why CA Traders", "Product Catalog", "Testimonials", "Service Area", "Contact Us"]) {
      await expect(page.getByText(section, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("list", { name: "Brands we carry" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Cities we serve" })).toBeVisible();

    // Reviews come from Sanity, in sortOrder; hidden (draft) reviews never show.
    const reviews = page.locator("#testimonials");
    await expect(reviews.getByText("Reliable deliveries every week.")).toBeVisible();
    await expect(reviews.getByText("Ranjit K.")).toBeVisible();
    await expect(reviews.getByText("Rated 4 out of 5")).toBeAttached();
    await expect(reviews.getByText("Hidden review.")).toHaveCount(0);

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(jsonLd!)).toMatchObject({ "@context": "https://schema.org" });
  });

  test("service area comes from Sanity", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#service-area");
    await expect(section.getByRole("heading", { name: /Serving\s+Southwestern Ontario/ })).toBeVisible();
    await expect(section.getByText("along the Windsor–Kitchener corridor")).toBeVisible();
    for (const city of ["Windsor", "London", "Kitchener"]) {
      await expect(section.getByRole("list", { name: "Cities we serve" }).getByText(`${city}, ON`)).toBeVisible();
    }
  });

  test("hero product categories link to the filtered catalog", async ({ page }) => {
    await page.goto("/");
    const categories = page.getByRole("list", { name: "Product categories" });
    await expect(categories.getByRole("link")).toHaveCount(4);
    await categories.getByRole("link", { name: /Engine Oils/ }).click();
    await expect(page).toHaveURL(/\/products\?category=engine-oils$/);
  });

  test("brand cards stay still on hover while the marquee pauses", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("list", { name: "Brands we carry" }).getByRole("listitem").first();
    const strip = card.locator("xpath=ancestor::div[contains(@class,'animate-marquee')]");
    // The strip is always moving, so hover its (stable) container rather than a card.
    await strip.locator("xpath=..").hover();
    await expect(strip).toHaveCSS("animation-play-state", "paused");
    await expect(card).toHaveCSS("translate", "none");
    await expect(card).toHaveCSS("box-shadow", "none");
  });

  test("header links to the catalog and the quote list", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("link", { name: "Quote list" }).click();
    await expect(page).toHaveURL(/\/quote$/);
    await expect(page.getByRole("heading", { name: "Quote list" })).toBeVisible();
  });

  test("mobile menu opens, navigates and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();

    await toggle.click();
    await page.locator("header").getByRole("link", { name: "Testimonials" }).click();
    await expect(page).toHaveURL(/#testimonials$/);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();

    // Growing to desktop width closes an open menu.
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByRole("button", { name: "Close menu" })).toBeHidden();
  });
});

test.describe("inquiry form", () => {
  const fill = async (page: import("@playwright/test").Page) => {
    await page.getByLabel("Your Name").fill("Jordan Lee");
    await page.getByLabel("Business Name").fill("Lee Auto Repair");
    await page.getByLabel("Phone Number").fill("(519) 555-0101");
    await page.getByLabel("Email Address").fill("kush-claude@agentmail.to");
    await page.getByRole("combobox", { name: "City" }).selectOption("Windsor");
    await page.getByLabel("Product Category").selectOption("Coolant");
    await page.getByLabel("Message / Order Details").fill("Two pallets of 50/50 coolant.");
  };

  test("shows validation errors and focuses the first invalid field", async ({ page }) => {
    await page.goto("/#contact");
    await page.getByRole("button", { name: /Send Inquiry/ }).click();
    await expect(page.getByText("Enter your name")).toBeVisible();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByLabel("Your Name")).toBeFocused();
  });

  test("submits, shows the reference, and can start again", async ({ page }) => {
    await page.goto("/#contact");
    await fill(page);
    await page.getByRole("button", { name: /Send Inquiry/ }).click();

    const status = page.getByRole("status");
    await expect(status).toContainText("Thanks — inquiry received");
    await expect(status).toContainText(/INQ-\d{4}-\d{5}/);

    await page.getByRole("button", { name: "Send another inquiry" }).click();
    await expect(page.getByLabel("Your Name")).toHaveValue("");
  });

  test("shows server-side errors", async ({ page }) => {
    await page.route("/api/inquiries", (route) =>
      route.fulfill({
        status: 400,
        json: {
          success: false,
          error: "VALIDATION_FAILED",
          message: "Please correct the highlighted fields.",
          issues: [{ path: "phone", message: "Enter a valid phone number" }],
        },
      }),
    );
    await page.goto("/#contact");
    await fill(page);
    await page.getByRole("button", { name: /Send Inquiry/ }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("Please correct the highlighted fields.");
    await expect(page.getByText("Enter a valid phone number")).toBeVisible();
    await expect(page.getByLabel("Phone Number")).toBeFocused();
  });

  test("city drop-down lists service-area cities A–Z, with Others for anywhere else", async ({ page }) => {
    await page.goto("/#contact");
    const city = page.getByRole("combobox", { name: "City" });
    await expect(city.locator("option")).toHaveText(["— Select your city —", "Kitchener", "London", "Windsor", "Others"]);

    await fill(page);
    await city.selectOption("Others");
    const other = page.getByLabel("Your City");
    await expect(other).toBeFocused();
    await page.getByRole("button", { name: /Send Inquiry/ }).click();
    await expect(page.getByText("Enter your city")).toBeVisible();
    await expect(other).toBeFocused();

    await other.fill("Toronto");
    const submitted = page.waitForRequest("/api/inquiries");
    await page.getByRole("button", { name: /Send Inquiry/ }).click();
    expect((await submitted).postDataJSON()).toMatchObject({ city: "Toronto" });
    await expect(page.getByRole("status")).toContainText("Thanks — inquiry received");

    await page.getByRole("button", { name: "Send another inquiry" }).click();
    await expect(page.getByRole("combobox", { name: "City" })).toHaveValue("");
    await expect(page.getByLabel("Your City")).toBeHidden();
  });

  test("reports network failures", async ({ page }) => {
    await page.route("/api/inquiries", (route) => route.abort());
    await page.goto("/#contact");
    await fill(page);
    await page.getByRole("button", { name: /Send Inquiry/ }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("Network error");
  });
});

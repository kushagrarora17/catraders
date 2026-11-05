import { expect, test } from "../test";
import { MOCK_URL } from "../env";
import { mockDoc, resetContent, sendWebhook } from "../helpers";

test.describe("product listing", () => {
  test("lists automotive products only, with facets", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
    await expect(page.getByText("4 products")).toBeVisible();
    await expect(page.getByText("Stroller")).toHaveCount(0);
    await expect(page.getByText("Liqui Moly")).toHaveCount(0);

    // Only filterable attributes with matching products show up as facets.
    await expect(page.getByRole("group", { name: "Viscosity Grade" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Colour" })).toHaveCount(0);
    await expect(page.getByLabel("4 L (3)")).toBeVisible();
  });

  test("filters by search, stock and attributes, and clears", async ({ page }) => {
    await page.goto("/products");

    await page.getByLabel("Search products", { exact: true }).fill("castrol");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/q=castrol/);
    await expect(page.getByText("1 product", { exact: true })).toBeVisible();

    await page.getByLabel("Search products", { exact: true }).fill("");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).not.toHaveURL(/q=castrol/);
    await page.getByLabel("In stock only").check();
    await page.getByLabel(/^4 L/).check();
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/available=1/);
    await expect(page.getByText("2 products")).toBeVisible();
    await expect(page.getByText("Valvoline 10W-40 4L")).toHaveCount(0);
    await expect(page.getByLabel(/^4 L/)).toBeChecked();
    await page.getByLabel("Search products", { exact: true }).fill("castrol");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/q=castrol/);
    await expect(page).toHaveURL(/available=1/);
    await expect(page).toHaveURL(/pack-size=4-l/);

    await page.goto("/products?viscosity=10w-40&available=1");
    await expect(page.getByText("No products match these filters.")).toBeVisible();

    await page.getByRole("link", { name: "Clear filters", exact: true }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByText("4 products")).toBeVisible();
  });

  test("mobile filters keep Apply visible and expose removable applied filters", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto("/products?category=engine-oil&available=1");
    await page.getByRole("button", { name: "Filters (1)", exact: true }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Apply filters" })).toBeInViewport();
    await drawer.getByLabel("In stock only").uncheck();
    await expect(drawer.getByRole("status")).toHaveText("Unapplied changes");
    await drawer.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).not.toHaveURL(/available=1/);
    await expect(page).toHaveURL(/category=engine-oil/);

    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await drawer.getByLabel("In stock only").check();
    await drawer.getByRole("button", { name: "Apply filters" }).click();
    await page.getByRole("link", { name: "Remove In stock", exact: true }).click();
    await expect(page).not.toHaveURL(/available=1/);
    await expect(page).toHaveURL(/category=engine-oil/);
  });

  test("browses categories with breadcrumbs and sub-categories", async ({ page }) => {
    await page.goto("/products?category=engine-oil");
    await expect(page.getByRole("heading", { name: "Engine Oil" })).toBeVisible();
    await expect(page.getByText("3 products")).toBeVisible();

    await page.getByRole("link", { name: "Passenger Car" }).click();
    await page.getByRole("link", { name: "Synthetic", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Synthetic" })).toBeVisible();
    await expect(page.getByText("2 products")).toBeVisible();

    const crumbs = page.getByRole("navigation", { name: /breadcrumb/i });
    await expect(crumbs.getByRole("link", { name: "Engine Oil" })).toBeVisible();
    await crumbs.getByRole("link", { name: "Products" }).click();
    await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();

    // Filters keep the category.
    await page.goto("/products?category=synthetic&pack-size=1-l");
    await expect(page.getByText("1 product", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters", exact: true })).toHaveAttribute("href", "/products?category=synthetic");
  });

  test("unknown categories are 404s", async ({ page }) => {
    const res = await page.goto("/products?category=does-not-exist");
    expect(res?.status()).toBe(404);
  });

  test("paginates on the server with full facet counts and preserved filters", async ({ page, request }) => {
    const product = await mockDoc(request, "prod-castrol-edge-5w30-4l");
    try {
      const response = await request.post(`${MOCK_URL}/v2026-09-01/data/mutate/production`, {
        data: { mutations: Array.from({ length: 25 }, (_, index) => ({ create: {
          ...product,
          _id: `pagination-${String(index).padStart(2, "0")}`,
          title: "Pagination oil",
          slug: { _type: "slug", current: `pagination-${index}` },
        } })) },
      });
      expect(response.ok()).toBe(true);
      await sendWebhook(request, JSON.stringify({ _type: "product" }));

      const filters = "category=synthetic&q=pagination&available=1&viscosity=5w-30&viscosity=0w-20&pack-size=4-l";
      await page.goto(`/products?${filters}`);
      await expect(page.locator("article")).toHaveCount(24);
      await expect(page.getByText("Showing 1–24 of 25 products")).toBeVisible();
      await expect(page.getByLabel("4 L (25)")).toBeVisible();
      const nextHref = await page.getByRole("link", { name: "Next", exact: true }).getAttribute("href");
      const next = new URL(nextHref!, "http://localhost");
      expect(next.searchParams.getAll("viscosity")).toEqual(["5w-30", "0w-20"]);
      expect(next.searchParams.get("page")).toBe("2");

      await page.getByRole("link", { name: "Next", exact: true }).click();
      await expect(page.locator("article")).toHaveCount(1);
      await expect(page.getByText("Showing 25–25 of 25 products")).toBeVisible();
      await expect(page.getByText("Page 2 of 2")).toBeVisible();
      await expect(page.getByLabel("4 L (25)")).toBeVisible();
      await expect(page.getByRole("link", { name: "Next", exact: true })).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/products\?category=synthetic&page=2$/);
      await page.getByRole("link", { name: "Previous", exact: true }).click();
      await expect(page.locator("article")).toHaveCount(24);
      expect(new URL(page.url()).searchParams.has("page")).toBe(false);
      await page.goBack();
      await expect(page.locator("article")).toHaveCount(1);

      await page.getByLabel("Search products", { exact: true }).fill("castrol");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByText("1 product", { exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.has("page")).toBe(false);
      await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);

      expect((await page.goto(`/products?${filters}&page=3`))?.status()).toBe(404);
      expect((await page.goto("/products?page=-1"))?.status()).toBe(200);
      await expect(page.locator("article")).toHaveCount(24);
    } finally {
      await resetContent(request);
    }
  });
});

test.describe("product page", () => {
  test("shows details and adds to the quote list", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("link", { name: /Castrol EDGE 5W-30 4L/ }).first().click();

    await expect(page.getByRole("heading", { name: "Castrol EDGE 5W-30 4L" })).toBeVisible();
    await expect(page.getByText("SKU: CAS-EDGE-5W30-4L")).toBeVisible();
    await expect(page.getByText("In stock")).toBeVisible();
    await expect(page.getByRole("img", { name: "Castrol EDGE bottle" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Specification/ })).toContainText("ACEA C3, API SP");
    await expect(page.getByText("Full synthetic engine oil for modern petrol engines.")).toBeVisible();
    await expect(page).toHaveTitle(/Castrol EDGE 5W-30 4L/);

    const quantity = page.getByRole("spinbutton");
    await quantity.fill("0");
    await expect(quantity).toHaveValue("1");
    await quantity.fill("3");
    await page.getByRole("button", { name: "Add to quote" }).click();
    await expect(page.getByRole("link", { name: "Quote list (1)" })).toBeVisible();
    await page.getByRole("link", { name: "Added — view quote" }).click();
    await expect(page).toHaveURL(/\/quote$/);
    await expect(page.getByLabel("Quantity for Castrol EDGE 5W-30 4L")).toHaveValue("3");
  });

  test("out-of-stock products can be quoted", async ({ page }) => {
    await page.goto("/products/valvoline-10w40-4l");
    await expect(page.getByText("Out of stock").first()).toBeVisible();
    await page.getByRole("button", { name: "Add to quote" }).click();
    await expect(page.getByRole("link", { name: "Quote list (1)" })).toBeVisible();
  });

  test("products without images or SKU still render", async ({ page }) => {
    await page.goto("/products/prestone-coolant-4l");
    await expect(page.getByRole("heading", { name: "Prestone Coolant 50/50 4L" })).toBeVisible();
    await expect(page.getByText(/SKU:/)).toHaveCount(0);
  });

  test("unknown and other-vertical products are 404s", async ({ page }) => {
    for (const slug of ["nope", "stroller", "liqui-moly-5w30-1l"]) {
      const res = await page.goto(`/products/${slug}`);
      expect(res?.status()).toBe(404);
    }
    await expect(page.getByText(/could not be found|not found/i).first()).toBeVisible();
  });
});

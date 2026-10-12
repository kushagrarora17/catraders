import { expect, test } from "../test";

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

    await page.getByLabel("Search").fill("castrol");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/q=castrol/);
    await expect(page.getByText("1 product", { exact: true })).toBeVisible();

    await page.getByLabel("Search").fill("");
    await page.getByLabel("In stock only").check();
    await page.getByLabel(/^4 L/).check();
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/available=1/);
    await expect(page.getByText("2 products")).toBeVisible();
    await expect(page.getByText("Valvoline 10W-40 4L")).toHaveCount(0);
    await expect(page.getByLabel(/^4 L/)).toBeChecked();

    await page.goto("/products?viscosity=10w-40&available=1");
    await expect(page.getByText("No products match these filters.")).toBeVisible();

    await page.getByRole("link", { name: "Clear" }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByText("4 products")).toBeVisible();
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
    await expect(page.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/products?category=synthetic");
  });

  test("unknown categories are 404s", async ({ page }) => {
    const res = await page.goto("/products?category=does-not-exist");
    expect(res?.status()).toBe(404);
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

  test("out-of-stock products can't be quoted", async ({ page }) => {
    await page.goto("/products/valvoline-10w40-4l");
    await expect(page.getByText("Out of stock").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Out of stock — cannot be quoted" })).toBeDisabled();
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

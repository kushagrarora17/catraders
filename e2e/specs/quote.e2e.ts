import type { Page } from "@playwright/test";
import { expect, test } from "../test";

type Item = { productId: string; title: string; sku?: string; slug: string; quantity: number };

const castrol: Item = {
  productId: "prod-castrol-edge-5w30-4l",
  title: "Castrol EDGE 5W-30 4L",
  sku: "CAS-EDGE-5W30-4L",
  slug: "castrol-edge-5w30-4l",
  quantity: 2,
};
const prestone: Item = { productId: "prod-prestone-coolant-4l", title: "Prestone Coolant 50/50 4L", slug: "prestone-coolant-4l", quantity: 1 };
const valvoline: Item = { productId: "prod-valvoline-10w40-4l", title: "Valvoline 10W-40 4L", slug: "valvoline-10w40-4l", quantity: 1 };
const gone: Item = { productId: "prod-discontinued", title: "Discontinued Oil", slug: "discontinued", quantity: 1 };

/** Opens the quote page with a pre-filled cart (the persisted Zustand store). */
async function openWithCart(page: Page, items: Item[]) {
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("automotive-quote-basket", value);
      sessionStorage.setItem("seeded", "1");
    }
  }, JSON.stringify({ state: { items }, version: 0 }));
  await page.goto("/quote");
}

async function fillDetails(page: Page) {
  await page.getByLabel("Name", { exact: true }).fill("Jordan Lee");
  await page.getByLabel("Email").fill("kush-claude@agentmail.to");
  await page.getByLabel("Phone").fill("519-555-0101");
  await page.getByLabel("City").fill("Windsor");
  await page.getByLabel("Business name").fill("Lee Auto Repair");
  await page.getByLabel("Notes (optional)").fill("Deliver Monday");
}

test("empty quote links back to the catalog", async ({ page }) => {
  await page.goto("/quote");
  await expect(page.getByText("Your quote is empty.")).toBeVisible();
  await page.getByRole("link", { name: "Browse products" }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test("edits quantities, removes items and submits a quote", async ({ page }) => {
  await openWithCart(page, [castrol, prestone]);

  await expect(page.getByRole("link", { name: "Quote list (2)" })).toBeVisible();
  const qty = page.getByLabel("Quantity for Castrol EDGE 5W-30 4L");
  await qty.fill("5");
  await expect(qty).toHaveValue("5");
  await expect(page.getByRole("row", { name: /Prestone/ })).toContainText("—");

  await page.getByRole("row", { name: /Prestone/ }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("row", { name: /Prestone/ })).toHaveCount(0);

  // Client-side validation first.
  await page.getByRole("button", { name: "Submit quote request" }).click();
  await expect(page.getByText("Name is required")).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveAttribute("aria-invalid", "true");

  await fillDetails(page);
  await page.getByRole("button", { name: "Submit quote request" }).click();
  await expect(page.getByText(/Your quote request RFQ-\d{4}-\d{5} has been submitted/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Quote list", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Continue browsing" }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test("marks out-of-stock products and blocks ones that disappeared", async ({ page }) => {
  await openWithCart(page, [castrol, valvoline, gone]);

  await expect(page.getByRole("row", { name: /Valvoline/ })).toContainText("(out of stock)");
  await expect(page.getByRole("row", { name: /Castrol/ })).not.toContainText("(out of stock)");
  await expect(page.getByText("— No longer available, please remove")).toBeVisible();
  await expect(page.getByText("Remove unavailable products before submitting.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit quote request" })).toBeDisabled();

  await page.getByRole("row", { name: /Discontinued/ }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("button", { name: "Submit quote request" })).toBeEnabled();
});

test("handles products removed before submission", async ({ page }) => {
  // The availability check passes, but the product is gone by the time the quote is submitted.
  await page.route("**/api/availability?**", (route) =>
    route.fulfill({ json: { products: [{ id: gone.productId, exists: true, inStock: true }] } }),
  );
  await openWithCart(page, [gone]);
  await fillDetails(page);
  await page.getByRole("button", { name: "Submit quote request" }).click();

  await expect(page.locator("form").getByRole("alert")).toContainText("Some products are no longer available");
  await expect(page.getByText("— No longer available, please remove")).toBeVisible();
});

test("shows server validation and network errors", async ({ page }) => {
  let calls = 0;
  await page.route("/api/quotes", (route) =>
    ++calls === 1
      ? route.fulfill({
          status: 400,
          json: {
            success: false,
            error: "VALIDATION_FAILED",
            message: "Please correct the highlighted fields.",
            issues: [
              { path: "customer.city", message: "Enter your city" },
              { path: "notes", message: "Too long" },
              { path: "items", message: "Each product may only appear once" },
            ],
          },
        })
      : route.abort(),
  );
  await openWithCart(page, [castrol]);
  await fillDetails(page);

  await page.getByRole("button", { name: "Submit quote request" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Each product may only appear once");
  await expect(page.getByText("Enter your city")).toBeVisible();
  await expect(page.getByText("Too long")).toBeVisible();

  await page.getByRole("button", { name: "Submit quote request" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Network error. Please try again.");
});

test("a failing availability check doesn't block the cart", async ({ page }) => {
  await page.route("**/api/availability?**", (route) => route.fulfill({ status: 500, body: "boom" }));
  await openWithCart(page, [castrol]);
  await expect(page.getByRole("button", { name: "Submit quote request" })).toBeEnabled();
});

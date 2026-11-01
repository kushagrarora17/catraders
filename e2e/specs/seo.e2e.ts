import { expect, test } from "../test";
import { MOCK_URL, SITE_URL } from "../env";
import { resetContent, sendWebhook } from "../helpers";

async function mutate(
  request: import("@playwright/test").APIRequestContext,
  mutations: unknown[],
) {
  const response = await request.post(
    `${MOCK_URL}/v2026-09-01/data/mutate/production`,
    { data: { mutations } },
  );
  expect(response.ok()).toBe(true);
}

test.describe("SEO landing pages", () => {
  test.beforeEach(async ({ request }) => resetContent(request));
  test.afterEach(async ({ request }) => resetContent(request));

  test("renders category editorial content, comparison, FAQs and canonical metadata", async ({
    page,
  }) => {
    await page.goto("/categories/coolants");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Wholesale Coolants",
    );
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ready to Use", exact: true }),
    ).toHaveAttribute("href", "/products?category=ready-to-use");
    await page.getByText("Can I request pricing?", { exact: true }).click();
    await expect(page.locator("details[open]")).toContainText(
      "Send the exact product",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/categories/coolants`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /compare applications/,
    );
    await mutate(page.request, [
      {
        create: {
          _id: "seo-brand",
          _type: "attribute",
          vertical: "automotive",
          title: "Brand",
          slug: { current: "brand" },
        },
      },
      {
        create: {
          _id: "seo-castrol",
          _type: "attributeValue",
          attribute: { _type: "reference", _ref: "seo-brand" },
          label: "Castrol",
          slug: { current: "castrol" },
        },
      },
      {
        patch: {
          id: "prod-castrol-edge-5w30-4l",
          set: {
            attributeValues: [
              { _type: "reference", _ref: "seo-castrol", _key: "brand" },
            ],
          },
        },
      },
      {
        patch: {
          id: "cat-engine-oil",
          set: {
            landing: {
              _type: "landingContent",
              heading: "Engine Oil Guide",
              seo: { title: "Engine Oil", description: "Wholesale engine oil" },
              introduction: "Engine oil buying guide",
              sections: ["one", "two", "three"].map((_key) => ({
                _key,
                heading: _key,
                body: [],
              })),
              faqs: ["one", "two", "three", "four"].map((_key) => ({
                _key,
                question: _key,
                answer: _key,
              })),
            },
          },
        },
      },
    ]);
    await sendWebhook(page.request, JSON.stringify({ _type: "category" }));
    await page.goto("/categories/engine-oil");
    await expect(
      page.getByText("Castrol", { exact: true }).first(),
    ).toBeVisible();
    const breadcrumb = JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .first()
        .textContent())!,
    );
    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
  });

  test("links published guides from the homepage and includes only eligible canonical pages in the sitemap", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(
      page.locator("#service-area").getByRole("link", { name: "Windsor, ON" }),
    ).toHaveAttribute("href", "/service-areas/windsor");
    await expect(
      page
        .getByRole("list", { name: "Product categories" })
        .getByRole("link", { name: /Coolants/ }),
    ).toHaveAttribute("href", "/categories/coolants");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/categories/coolants");
    expect(sitemap).toContain("/service-areas/windsor");
    for (const slug of ["london", "toronto", "kitchener"])
      expect(sitemap).not.toContain(`/service-areas/${slug}`);
    for (const path of [
      "/categories/missing",
      "/service-areas/london",
      "/service-areas/toronto",
      "/service-areas/kitchener",
    ]) {
      expect((await request.get(path)).status()).toBe(404);
    }
  });

  test("refreshes published city copy and removes pages when confirmed coverage changes", async ({
    page,
    request,
  }) => {
    await page.goto("/service-areas/windsor");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Wholesale Supplies Windsor",
    );
    const service = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    expect(JSON.parse(service!)).toMatchObject({
      "@type": "Service",
      provider: { "@id": `${SITE_URL}/#business` },
    });
    await mutate(request, [
      {
        patch: {
          id: "city-windsor",
          set: { "content.heading": "Updated Windsor supply guide" },
        },
      },
    ]);
    expect(
      (
        await sendWebhook(
          request,
          JSON.stringify({ _type: "serviceAreaLandingPage" }),
        )
      ).ok(),
    ).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Updated Windsor supply guide",
    );
    await mutate(request, [
      {
        patch: { id: "serviceArea", set: { cities: ["London", "Kitchener"] } },
      },
    ]);
    await sendWebhook(request, JSON.stringify({ _type: "serviceArea" }));
    expect((await request.get("/service-areas/windsor")).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
      "/service-areas/windsor",
    );
  });

  test("applies product SEO overrides and canonicalises catalog filters", async ({
    page,
    request,
  }) => {
    await mutate(request, [
      {
        patch: {
          id: "prod-castrol-edge-5w30-4l",
          set: {
            seo: {
              title: "Workshop oil selection",
              description: "Product-specific workshop oil description.",
            },
          },
        },
      },
    ]);
    await sendWebhook(request, JSON.stringify({ _type: "product" }));
    await page.goto("/products/castrol-edge-5w30-4l");
    await expect(page).toHaveTitle("Workshop oil selection | CA Traders");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Product-specific workshop oil description.",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/products/castrol-edge-5w30-4l`,
    );
    await page.goto("/products?category=coolants&available=1");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/products?category=coolants`,
    );
    await page.goto("/products?q=oil");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, follow",
    );
  });
});

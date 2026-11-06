import { expect, test } from "../test";
import { SITE_URL } from "../env";

test("development pages do not download or initialize GA", async ({ page }) => {
  const requests: string[] = [];
  await page.route("https://www.googletagmanager.com/**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.goto("/");
  await expect(page.locator("script#google-tag")).toBeAttached();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => (window as Window & { gtag?: unknown }).gtag)).toBeUndefined();
});

for (const formType of ["inquiry", "quote"] as const) {
  for (const scenario of ["saved", "duplicate", "failed", ...(formType === "inquiry" ? ["honeypot"] : [])]) {
    test(`${formType} GA lead: ${scenario}`, async ({ page }) => {
      await page.route("https://caelitelube.com/**", async (route) => {
        if (route.request().headers()["next-router-prefetch"]) return route.abort();
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: `${SITE_URL}${url.pathname}${url.search}` });
        await route.fulfill({ response });
      });
      await page.route("https://www.googletagmanager.com/**", (route) =>
        route.fulfill({ contentType: "application/javascript", body: "" }),
      );
      await page.route(`**/api/${formType === "inquiry" ? "inquiries" : "quotes"}`, (route) =>
        route.fulfill({
          status: scenario === "duplicate" ? 200 : scenario === "failed" ? 500 : 201,
          json: scenario === "failed"
            ? { success: false, error: "INTERNAL_ERROR", message: "Please retry." }
            : { success: true, referenceNumber: "TEST-123", message: "Saved" },
        }),
      );
      if (formType === "quote") {
        await page.addInitScript(() => {
          localStorage.setItem("automotive-quote-basket", JSON.stringify({
            state: { items: [{ productId: "prod-castrol-edge-5w30-4l", title: "Castrol EDGE 5W-30 4L", slug: "castrol-edge-5w30-4l", quantity: 1 }] }, version: 0,
          }));
        });
      }
      await page.goto(`https://caelitelube.com/${formType === "quote" ? "quote" : "#contact"}`);
      await page.waitForFunction(() => typeof (window as Window & { gtag?: unknown }).gtag === "function");
      await page.getByLabel(formType === "inquiry" ? "Your Name" : "Name", { exact: formType === "quote" }).fill("Jordan Lee");
      await page.getByLabel(formType === "inquiry" ? "Email Address" : "Email", { exact: formType === "quote" }).fill("kush-claude@agentmail.to");
      await page.getByLabel(formType === "inquiry" ? "Phone Number" : "Phone", { exact: formType === "quote" }).fill("519-555-0101");
      await page.getByLabel("Business name").fill("Lee Auto Repair");
      if (formType === "inquiry") {
        await page.getByRole("combobox", { name: "City" }).selectOption("Windsor");
        if (scenario === "honeypot") {
          await page.locator('[name="website"]').evaluate((input: HTMLInputElement) => { input.value = "spam"; });
        }
      } else {
        await page.getByLabel("City", { exact: true }).fill("Windsor");
      }
      await expect(page.locator('[name="cf-turnstile-response"]')).toHaveValue(`e2e-${formType}`);
      await page.getByRole("button", { name: formType === "inquiry" ? /Send Inquiry/ : "Submit quote request" }).click();
      if (scenario === "failed") await expect(page.locator("form").getByRole("alert")).toContainText("Please retry.");
      else await expect(page.getByText("TEST-123", { exact: false })).toBeVisible();
      const leads = await page.evaluate(() => {
        const browser = window as Window & { dataLayer?: IArguments[] };
        return browser.dataLayer?.map((args) => Array.from(args)).filter((args) => args[1] === "generate_lead");
      });
      expect(leads).toEqual(scenario === "saved" ? [["event", "generate_lead", { form_type: formType }]] : []);
      await page.unrouteAll({ behavior: "wait" });
    });
  }
}

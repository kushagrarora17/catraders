import { afterEach, describe, expect, mock, test } from "bun:test";
import { GA_PRODUCTION_HOSTNAME, trackLead } from "./analytics";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function installBrowser(hostname: string) {
  const gtag = mock<(command: string, event: string, params: Record<string, unknown>) => void>(() => {});
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { hostname }, gtag },
  });
  return gtag;
}

describe("GA4 leads", () => {
  test.each(["localhost", "127.0.0.1", "app-catraders-staging.azurewebsites.net"])(
    "does not send production leads from %s",
    (hostname) => {
      const gtag = installBrowser(hostname);
      trackLead("quote");
      expect(gtag).not.toHaveBeenCalled();
    },
  );

  test("reports the form type without customer details", () => {
    const gtag = installBrowser(GA_PRODUCTION_HOSTNAME);
    trackLead("quote");
    trackLead("inquiry");
    expect(gtag.mock.calls).toEqual([
      ["event", "generate_lead", { form_type: "quote" }],
      ["event", "generate_lead", { form_type: "inquiry" }],
    ]);
  });

  test("does not interrupt submission when analytics fails", () => {
    const gtag = installBrowser(GA_PRODUCTION_HOSTNAME);
    gtag.mockImplementation(() => { throw new Error("blocked"); });
    expect(() => trackLead("quote")).not.toThrow();
  });
});

import { afterEach, describe, expect, mock, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { GA_INITIALIZATION_SCRIPT, GA_MEASUREMENT_ID, GA_PRODUCTION_HOSTNAME, trackLead } from "./analytics";

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

describe("GA4 initialization", () => {
  test.each(["localhost", "127.0.0.1", "[::1]", "app-catraders-staging.azurewebsites.net", GA_PRODUCTION_HOSTNAME])(
    "only downloads and initializes GA on production: %s",
    (hostname) => {
      const browser = { location: { hostname } } as { location: { hostname: string }; dataLayer?: IArguments[]; gtag?: unknown };
      const script: { async?: boolean; src?: string } = {};
      const appendChild = mock(() => {});
      const createElement = mock(() => script);
      runInNewContext(GA_INITIALIZATION_SCRIPT, {
        window: browser,
        document: { createElement, head: { appendChild } },
      });
      if (hostname === GA_PRODUCTION_HOSTNAME) {
        expect(createElement).toHaveBeenCalledWith("script");
        expect(appendChild).toHaveBeenCalledWith(script);
        expect(script).toEqual({ async: true, src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}` });
        expect(browser.dataLayer?.map((args) => Array.from(args))).toEqual([
          ["js", expect.anything()], ["config", GA_MEASUREMENT_ID],
        ]);
        expect(typeof browser.gtag).toBe("function");
      } else {
        expect(createElement).not.toHaveBeenCalled();
        expect(appendChild).not.toHaveBeenCalled();
        expect(browser.dataLayer).toBeUndefined();
        expect(browser.gtag).toBeUndefined();
      }
    },
  );
});

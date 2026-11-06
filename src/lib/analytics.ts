export const GA_MEASUREMENT_ID = "G-WDCX7J1BHG";
export const GA_PRODUCTION_HOSTNAME = "caelitelube.com";

export function trackLead(formType: "inquiry" | "quote") {
  if (typeof window === "undefined" || window.location.hostname !== GA_PRODUCTION_HOSTNAME) return;
  const browser = window as Window & {
    gtag?: (command: "event", event: string, params: Record<string, unknown>) => void;
  };
  try {
    browser.gtag?.("event", "generate_lead", { form_type: formType });
  } catch {
    // Analytics must never interrupt a submission.
  }
}

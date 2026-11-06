export const GA_MEASUREMENT_ID = "G-WDCX7J1BHG";
export const GA_PRODUCTION_HOSTNAME = "caelitelube.com";

export const GA_INITIALIZATION_SCRIPT = `if (window.location.hostname === '${GA_PRODUCTION_HOSTNAME}') {
window.dataLayer = window.dataLayer || [];
window.gtag = function(){window.dataLayer.push(arguments);};
window.gtag('js', new Date());
window.gtag('config', '${GA_MEASUREMENT_ID}');
var script = document.createElement('script');
script.async = true;
script.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
document.head.appendChild(script);
}`;

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

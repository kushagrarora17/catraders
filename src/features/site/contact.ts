/** Business details shown on the site and in structured data. Single source of truth. */
export const BUSINESS_NAME = "CA Traders";
export const TAGLINE = "Automotive Lubricants & Fluids";
export const DESCRIPTION =
  "Your trusted B2B wholesale partner for premium automotive lubricants, fluids, filters, and shop supplies. Serving mechanics, auto shops, and dealerships across Southwestern Ontario — from Windsor and Chatham-Kent through London to Kitchener-Waterloo.";

export const PHONE_DISPLAY = "(647) 548-6042";
export const PHONE_E164 = "+16475486042";
export const EMAIL = "sales@caelitelube.com";

export const HOURS_DISPLAY = "Mon–Sat · 8am–6pm";
export const OPENING_HOURS = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  opens: "08:00",
  closes: "18:00",
} as const;

export const REGION = "Southwestern Ontario";

/** Cities we deliver to: the Windsor–Kitchener corridor plus the towns north and south of it. */
export const SERVICE_AREAS = [
  "Windsor",
  "LaSalle",
  "Tecumseh",
  "Amherstburg",
  "Leamington",
  "Kingsville",
  "Chatham-Kent",
  "Sarnia",
  "Strathroy",
  "London",
  "St. Thomas",
  "Tillsonburg",
  "Woodstock",
  "Ingersoll",
  "Stratford",
  "Kitchener",
  "Waterloo",
  "Cambridge",
  "Guelph",
  "Brantford",
] as const;

import {
  BUSINESS_NAME,
  DESCRIPTION,
  EMAIL,
  OPENING_HOURS,
  PHONE_E164,
  SERVICE_AREAS,
} from "@/features/site/contact";
import { getSiteUrl } from "@/features/site/url";

/**
 * LocalBusiness JSON-LD for the landing page. Deliberately no Review/AggregateRating:
 * Google treats first-party reviews of your own business as self-serving.
 */
export function StructuredData() {
  const url = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["AutoPartsStore", "WholesaleStore"],
    "@id": `${url}/#business`,
    name: BUSINESS_NAME,
    description: DESCRIPTION,
    url,
    image: `${url}/opengraph-image`,
    telephone: PHONE_E164,
    email: EMAIL,
    address: { "@type": "PostalAddress", addressRegion: "ON", addressCountry: "CA" },
    areaServed: SERVICE_AREAS.map((name) => ({
      "@type": "City",
      name,
      containedInPlace: { "@type": "State", name: "Ontario" },
    })),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: OPENING_HOURS.days,
      opens: OPENING_HOURS.opens,
      closes: OPENING_HOURS.closes,
    },
    brand: ["Mobil", "Castrol", "Liqui Moly", "Lucas Oil", "Benzol", "Emzone", "Star Fire", "GP", "Duracool"].map((name) => ({
      "@type": "Brand",
      name,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

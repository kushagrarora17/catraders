import { BUSINESS_NAME, DESCRIPTION, EMAIL, OPENING_HOURS, PHONE_E164 } from "@/features/site/contact";
import { getSiteUrl } from "@/features/site/url";
import { getServiceArea } from "../api";

/**
 * LocalBusiness JSON-LD for the landing page. Deliberately no Review/AggregateRating:
 * Google treats first-party reviews of your own business as self-serving.
 */
export async function StructuredData() {
  const url = getSiteUrl();
  const area = await getServiceArea();
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
    // The Sanity service-area cities; omitted (undefined) while none are set.
    areaServed: area?.cities?.map((name) => ({
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

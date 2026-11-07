import type { PRODUCT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { EMAIL } from "@/features/site/contact";

type Faq = { question: string; answer: string };

export function productFaqs(product: NonNullable<PRODUCT_BY_SLUG_QUERY_RESULT>, cities: string[] = []): Faq[] {
  const title = product.title;
  const values = (slug: string) => product.attributeValues?.filter((row) => row?.attribute?.slug === slug).map((row) => row!.label).join(", ");
  const pack = values("pack-size");
  const specs = values("specification");
  const request = product.inStock
    ? 'Choose your quantity and select “Add to quote”, then submit your quote with your business and contact details.'
    : `This product is currently out of stock. Contact ${EMAIL} to ask about availability.`;
  const defaults: Faq[] = [
    { question: `Where can I buy ${title}?`, answer: `CA EliteLube supplies ${title} to mechanics, auto shops, and dealerships in Southwestern Ontario. ${request}` },
    { question: `What is the price of ${title}?`, answer: `Request a quote from CA EliteLube for current ${title} pricing. Include the quantity you need${pack ? `; the listed pack size is ${pack}` : ""}. ${request}` },
    ...(cities.length ? [{ question: `Where can I buy ${title} near me?`, answer: `CA EliteLube serves businesses in ${cities.join(", ")}, in Southwestern Ontario. Contact ${EMAIL} with your city and the quantity of ${title} you need to confirm availability and supply arrangements.` }] : []),
    ...(pack ? [{ question: `What pack size does ${title} come in?`, answer: `The listed pack size for ${title} is ${pack}. Include your required quantity when enquiring.` }] : []),
    ...(specs ? [{ question: `What specifications are listed for ${title}?`, answer: `The catalog lists ${specs} for ${title}. Check these against your equipment manufacturer's requirements before ordering.` }] : []),
  ];
  const selection = ["viscosity", "specification", "size", "coolant-technology"].flatMap((slug) => {
    const labels = values(slug);
    return labels ? [labels] : [];
  });
  if (selection.length) defaults.push({ question: `How do I check whether ${title} is suitable for my application?`, answer: `The catalog details for ${title} include ${selection.join("; ")}. Compare these with your equipment manufacturer's requirements. Share your application when enquiring; these details alone do not confirm vehicle compatibility.` });
  const seen = new Set<string>();
  return [...(product.faqs ?? []), ...(product.suppressDefaultFaqs ? [] : defaults)].flatMap((faq) => {
    const question = faq.question?.trim();
    const answer = faq.answer?.trim();
    const key = question?.replace(/\s+/g, " ").toLowerCase();
    if (!key || !answer || seen.has(key)) return [];
    seen.add(key);
    return [{ question: question!, answer }];
  });
}

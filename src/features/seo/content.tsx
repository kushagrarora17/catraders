import Link from "next/link";
import type { Route, Metadata } from "next";
import { PortableText } from "@portabletext/react";
import type { SEO_CITY_QUERY_RESULT } from "@/sanity/types";
import {
  EMAIL,
  PHONE_DISPLAY,
  PHONE_E164,
  BUSINESS_NAME,
} from "@/features/site/contact";
import { getSiteUrl } from "@/features/site/url";

export type EditorialContent = NonNullable<
  NonNullable<SEO_CITY_QUERY_RESULT>["content"]
>;

function landingSeo(content: EditorialContent) {
  return { title: content.seo?.title ?? content.heading, description: content.seo?.description };
}

export function landingMetadata(
  content: EditorialContent | undefined | null,
  path: string,
): Metadata {
  if (!content) return { title: "Page not found", robots: { index: false } };
  const {title, description} = landingSeo(content);
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: {
      title, description,
      url: path,
    },
  };
}

export function JsonLd({ value }: { value: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(value).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function EditorialNavigation({content}: {content: EditorialContent}) {
  return (
      <nav
        aria-label="On this page"
        className="my-8 border-y border-border py-5"
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {content.sections?.map((section) => (
            <li key={section._key}>
              <a
                className="underline underline-offset-4 hover:text-highlight"
                href={`#section-${section._key}`}
              >
                {section.heading}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#faqs"
              className="underline underline-offset-4 hover:text-highlight"
            >
              Frequently asked questions
            </a>
          </li>
        </ul>
      </nav>
  );
}

function EditorialSources({content}: {content: EditorialContent}) {
  return <>
          {!!content.sources?.length && (
            <section>
              <h2 className="mb-3 font-heading text-xl font-bold">
                Technical references
              </h2>
              <ul className="space-y-2 text-sm">
                {content.sources.map((source) => (
                  <li key={source._key}>
                    <a
                      href={source.url}
                      className="underline underline-offset-4 hover:text-highlight"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
  </>;
}

export function EditorialBody({ content }: { content: EditorialContent }) {
  return (
    <>
      <EditorialNavigation content={content} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-12">
          {content.sections?.map((section) => (
            <section
              key={section._key}
              id={`section-${section._key}`}
              className="scroll-mt-24"
            >
              <h2 className="mb-4 font-heading text-2xl font-bold sm:text-3xl">
                {section.heading}
              </h2>
              <div className="space-y-4 leading-relaxed text-muted-foreground">
                <PortableText
                  value={section.body ?? []}
                  components={{
                    list: {
                      bullet: ({ children }) => (
                        <ul className="list-disc space-y-2 pl-6">{children}</ul>
                      ),
                    },
                  }}
                />
              </div>
            </section>
          ))}
          {!!content.comparison?.length && (
            <section>
              <h2 className="mb-4 font-heading text-2xl font-bold">
                Compare your options
              </h2>
              <div className="overflow-x-auto border border-border">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Common options, their uses, and what to check before
                    ordering
                  </caption>
                  <thead className="bg-secondary">
                    <tr>
                      {["Option", "Typical use", "Selection checks"].map(
                        (text) => (
                          <th key={text} scope="col" className="p-4">
                            {text}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {content.comparison.map((row) => (
                      <tr key={row._key} className="border-t border-border">
                        <th scope="row" className="p-4 align-top">
                          {row.option}
                        </th>
                        <td className="p-4 align-top text-muted-foreground">
                          {row.usage}
                        </td>
                        <td className="p-4 align-top text-muted-foreground">
                          {row.selection}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <section id="faqs" className="scroll-mt-24">
            <h2 className="mb-5 font-heading text-2xl font-bold">
              Frequently asked questions
            </h2>
            {content.faqs?.map((faq) => (
              <details key={faq._key} className="border-t border-border py-5">
                <summary className="cursor-pointer font-semibold">
                  {faq.question}
                </summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </section>
          <EditorialSources content={content} />
        </div>
        <aside className="h-fit border-t-3 border-primary bg-secondary p-6 lg:sticky lg:top-24">
          <p className="text-xs font-bold uppercase tracking-wide text-highlight">
            Wholesale enquiries
          </p>
          <h2 className="my-3 font-heading text-2xl font-bold">
            Build your shop’s next order
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            Send your product list, quantities, and delivery location. We’ll
            confirm pricing, stock, delivery timing, and any minimum order
            requirements.
          </p>
          <Link
            href="/#contact"
            className="block bg-primary px-4 py-3 text-center font-bold text-primary-foreground"
          >
            Request a quote
          </Link>
          <a className="mt-5 block underline" href={`tel:${PHONE_E164}`}>
            {PHONE_DISPLAY}
          </a>
          <a
            className="mt-2 block break-all text-sm underline"
            href={`mailto:${EMAIL}`}
          >
            {EMAIL}
          </a>
        </aside>
      </div>
    </>
  );
}

export function LandingLinks({
  title,
  items,
}: {
  title: string;
  items: { title: string; href: string }[];
}) {
  if (!items.length) return null;
  return (
    <section className="my-10">
      <h2 className="mb-4 font-heading text-2xl font-bold">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href as Route}
              className="block h-full border border-border p-4 font-semibold hover:border-primary hover:text-highlight"
            >
              {item.title}
              <span aria-hidden="true" className="float-right">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ServiceJsonLd({ city, path }: { city: string; path: string }) {
  const base = getSiteUrl();
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: `Wholesale automotive supplies in ${city}`,
        url: `${base}${path}`,
        areaServed: { "@type": "City", name: `${city}, Ontario` },
        provider: {
          "@type": "Organization",
          "@id": `${base}/#business`,
          name: BUSINESS_NAME,
          url: base,
        },
      }}
    />
  );
}

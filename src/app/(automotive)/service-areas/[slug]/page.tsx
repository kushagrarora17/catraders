import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getCityLanding } from "@/features/landing/api";
import { getLandingLinks } from "@/features/catalog/api";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import {
  EditorialBody,
  LandingLinks,
  ServiceJsonLd,
  landingMetadata,
} from "@/features/seo/content";

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/service-areas/[slug]">) {
  const { slug } = await params;
  const page = await getCityLanding(slug);
  return landingMetadata(page?.content, `/service-areas/${slug}`);
}

export default async function CityLandingPage({
  params,
}: PageProps<"/service-areas/[slug]">) {
  const { slug } = await params;
  const page = await getCityLanding(slug);
  if (!page?.content) notFound();
  const links = await getLandingLinks();
  return (
    <Container className="py-10 sm:py-16">
      <ServiceJsonLd city={page.city} path={`/service-areas/${slug}`} />
      <Breadcrumbs
        items={[
          { title: "Home", href: "/" },
          { title: "Service area", href: "/#service-area" },
          { title: `${page.city}, ON` },
        ]}
      />
      <header className="max-w-4xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-highlight">
          CA Traders · Southwestern Ontario
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          {page.content.heading}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          {page.content.introduction}
        </p>
      </header>
      <LandingLinks
        title={`Shop wholesale categories for ${page.city}`}
        items={links.categories.map((category) => ({
          title: category.title,
          href: `/categories/${category.slug}`,
        }))}
      />
      <EditorialBody content={page.content} />
      <LandingLinks
        title="Other areas we serve"
        items={links.cities
          .filter((city) => city.slug !== slug)
          .map((city) => ({
            title: `${city.city}, ON`,
            href: `/service-areas/${city.slug}`,
          }))}
      />
    </Container>
  );
}

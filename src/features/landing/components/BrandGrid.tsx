import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import benzol from "../assets/brands/benzol.png";
import emzone from "../assets/brands/emzone.png";
import gp from "../assets/brands/gp.png";
import liquimoly from "../assets/brands/liquimoly.png";
import lucas from "../assets/brands/lucas.png";
import starfire from "../assets/brands/starfire.png";
import { Icon } from "./icons";

const BRANDS: { name: string; logo: StaticImageData }[] = [
  { name: "Benzol Lubricants", logo: benzol },
  { name: "Lucas Oil", logo: lucas },
  { name: "Star Fire", logo: starfire },
  { name: "Emzone", logo: emzone },
  { name: "Liqui Moly", logo: liquimoly },
  { name: "GP Lubricants", logo: gp },
];

export function BrandGrid() {
  return (
    <section id="catalog" aria-labelledby="catalog-title" data-surface="light" className="bg-background py-20 sm:py-28">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading id="catalog-title" eyebrow="Product Catalog">
            Our Product Range
          </SectionHeading>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-widest text-highlight hover:underline"
          >
            View full catalog <Icon name="arrow" className="size-4" />
          </Link>
        </div>
        <ul aria-label="Brands we carry" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {BRANDS.map((brand) => (
            <li
              key={brand.name}
              className="relative aspect-4/3 border border-b-3 border-border bg-card transition-[border-color,box-shadow,translate] duration-250 hover:border-b-primary hover:shadow-xl motion-safe:hover:-translate-y-1"
            >
              <Image
                src={brand.logo}
                alt={brand.name}
                fill
                sizes="(width >= 64rem) 12rem, (width >= 40rem) 30vw, 45vw"
                className="object-contain p-5"
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

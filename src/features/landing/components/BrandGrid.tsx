import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import benzol from "../assets/brands/benzol.png";
import castrol from "../assets/brands/castrol.svg";
import duracool from "../assets/brands/duracool.png";
import emzone from "../assets/brands/emzone.png";
import gp from "../assets/brands/gp.png";
import liquimoly from "../assets/brands/liquimoly.png";
import lucas from "../assets/brands/lucas.png";
import mobil from "../assets/brands/mobil.png";
import starfire from "../assets/brands/starfire.png";
import { Icon } from "./icons";

const BRANDS: { name: string; logo: StaticImageData }[] = [
  { name: "Mobil", logo: mobil },
  { name: "Castrol", logo: castrol },
  { name: "Benzol Lubricants", logo: benzol },
  { name: "Lucas Oil", logo: lucas },
  { name: "Star Fire", logo: starfire },
  { name: "Emzone", logo: emzone },
  { name: "Liqui Moly", logo: liquimoly },
  { name: "GP Lubricants", logo: gp },
  { name: "Duracool Refrigerants", logo: duracool },
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
      </Container>
      {/* Two copies of the list scroll as one strip; translating by -50% loops seamlessly. */}
      <div className="group mt-10 overflow-hidden mask-x-from-90% mask-x-to-100% motion-reduce:mask-none">
        <div className="flex w-max motion-safe:animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:w-full motion-reduce:justify-center">
          {[false, true].map((duplicate) => (
            <ul
              key={String(duplicate)}
              aria-label={duplicate ? undefined : "Brands we carry"}
              aria-hidden={duplicate || undefined}
              className={cn(
                "flex shrink-0 gap-4 py-2 pr-4 motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:px-4",
                duplicate && "motion-reduce:hidden",
              )}
            >
              {BRANDS.map((brand) => (
                <li
                  key={brand.name}
                  className="relative aspect-4/3 w-40 shrink-0 border border-b-3 border-border bg-card transition-[border-color,box-shadow,translate] duration-250 hover:border-b-primary hover:shadow-xl motion-safe:hover:-translate-y-1 sm:w-48"
                >
                  <Image
                    src={brand.logo}
                    alt={duplicate ? "" : brand.name}
                    fill
                    sizes="12rem"
                    className="object-contain p-5"
                  />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

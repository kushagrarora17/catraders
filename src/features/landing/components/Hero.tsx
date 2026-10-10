import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { CONTACT_HREF } from "@/features/site/nav";
import { Icon, type IconName } from "./icons";

const STATS = [
  { value: "15+", label: "Top Brands" },
  { value: "200+", label: "Products" },
  { value: "B2B", label: "Wholesale Only" },
] as const;

const CATEGORIES: { icon: IconName; title: string; brands: string }[] = [
  { icon: "drop", title: "Engine Oils", brands: "Mobil · Castrol · Liqui Moly · Benzol · Quaker State" },
  { icon: "gear", title: "ATF & Gear Oils", brands: "Mobil ATF · Castrol CVT · Lucas · Toyota WS" },
  { icon: "thermometer", title: "Coolants & Refrigerants", brands: "Star Fire · Emzone · Duracool · R134a" },
  { icon: "wrench", title: "Filters & Shop Supplies", brands: "COYO Oil Filters · Cabin & Air Filters · Wiper Blades" },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-background">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid" />
      <div
        aria-hidden="true"
        className="absolute -top-50 -right-50 -z-10 size-175 rounded-full bg-radial from-primary/12 to-transparent to-70%"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-75 -left-25 -z-10 size-150 rounded-full bg-radial from-secondary/80 to-transparent to-70%"
      />
      <Container className="grid items-center gap-12 py-16 sm:py-24 lg:min-h-hero lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <Eyebrow>B2B Wholesale Distributor</Eyebrow>
          <h1
            id="hero-title"
            className="text-6xl font-black uppercase leading-none text-foreground sm:text-7xl xl:text-8xl"
          >
            Premium <em className="block not-italic text-highlight">Lubricants</em> &amp; Fluids
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Your trusted wholesale partner for automotive lubricants, fluids, filters, and shop supplies. Competitive
            mechanic pricing, fast fulfillment, and a complete product lineup.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={buttonVariants()}>
              Browse Catalog
            </Link>
            <Link href={CONTACT_HREF} className={buttonVariants({ variant: "outline" })}>
              Contact Us
            </Link>
          </div>
          <dl className="mt-4 grid max-w-lg grid-cols-3 divide-x divide-border border border-border bg-secondary/60">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse items-center gap-1 px-2 py-5 text-center">
                <dt className="text-2xs uppercase tracking-tagline text-muted-foreground sm:text-xs">{stat.label}</dt>
                <dd className="font-heading text-3xl font-extrabold text-highlight sm:text-4xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ul aria-label="Product categories" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {CATEGORIES.map((cat, i) => (
            <li
              key={cat.title}
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
              className="flex items-center gap-5 border border-primary/20 bg-card p-5 transition-[border-color,translate] duration-300 hover:border-primary motion-safe:animate-slide-in motion-safe:hover:translate-x-1.5 lg:even:ml-8"
            >
              <span className="grid size-12 shrink-0 place-items-center bg-primary/10 text-highlight">
                <Icon name={cat.icon} />
              </span>
              <div>
                <p className="font-heading text-lg font-bold uppercase tracking-wide text-foreground">{cat.title}</p>
                <p className="text-sm text-muted-foreground">{cat.brands}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

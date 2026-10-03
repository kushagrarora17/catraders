import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const FEATURES = [
  {
    title: "Mechanic-First Pricing",
    body: "Wholesale rates built for shops that buy in volume. The more you order, the better the deal.",
  },
  {
    title: "Top-Tier Brands",
    body: "Mobil, Castrol, Liqui Moly, Lucas, Emzone, and more — only trusted names in your shop.",
  },
  {
    title: "Complete Lineup",
    body: "Engine oils, ATF, gear oil, coolants, filters, aerosols, refrigerants, and shop supplies.",
  },
  {
    title: "Special Orders Welcome",
    body: "Can't find what you need? We handle special orders for filters, ATFs, and more.",
  },
] as const;

export function WhyUs() {
  return (
    <section id="why" aria-labelledby="why-title" className="bg-secondary py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-5 lg:gap-16">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionHeading id="why-title" eyebrow="Why CA Traders">
            Built for <span className="block">Mechanics</span>
          </SectionHeading>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            We supply independent garages, shops, and dealerships with premium automotive products at wholesale mechanic
            pricing. No fluff — just the best products at the best prices.
          </p>
        </div>
        <ol className="grid gap-px bg-border sm:grid-cols-2 lg:col-span-3">
          {FEATURES.map((feature, i) => (
            <li key={feature.title} className="flex flex-col gap-3 border-b-3 border-transparent bg-card p-8 transition-colors duration-300 hover:border-primary">
              <span aria-hidden="true" className="font-heading text-5xl font-black leading-none text-primary/75">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-bold uppercase tracking-wide text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

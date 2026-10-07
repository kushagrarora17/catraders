import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { REGION, SERVICE_AREAS } from "@/features/site/contact";

export function ServiceArea() {
  return (
    <section id="service-area" aria-labelledby="service-area-title" className="bg-secondary py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-5 lg:gap-16">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionHeading id="service-area-title" eyebrow="Service Area">
            Serving <span className="block">{REGION}</span>
          </SectionHeading>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            We deliver wholesale lubricants and fluids to shops along the Windsor–Kitchener corridor, from Windsor,
            London and Kitchener-Waterloo to Sarnia and Stratford in the north and Leamington and St. Thomas in the
            south.
          </p>
        </div>
        <ul aria-label="Cities we serve" className="flex flex-wrap content-start gap-3 lg:col-span-3">
          {SERVICE_AREAS.map((city) => (
            <li
              key={city}
              className="border border-primary/20 bg-card px-4 py-2 font-heading font-bold uppercase tracking-wide text-foreground"
            >
              {city}, ON
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

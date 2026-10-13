import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getServiceArea } from "../api";

export async function ServiceArea() {
  const area = await getServiceArea();
  if (!area?.cities?.length) return null;

  return (
    <section id="service-area" aria-labelledby="service-area-title" className="bg-secondary py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-5 lg:gap-16">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionHeading id="service-area-title" eyebrow="Service Area">
            Serving <span className="block">{area.region}</span>
          </SectionHeading>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            {area.description}
          </p>
        </div>
        <ul aria-label="Cities we serve" className="flex flex-wrap content-start gap-3 lg:col-span-3">
          {area.cities.map((city) => (
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

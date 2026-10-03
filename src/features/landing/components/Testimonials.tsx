import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const TESTIMONIALS = [
  {
    quote:
      "CA Traders has been our go-to supplier for engine oils and filters for over two years. The pricing is unbeatable and the product range is exactly what a busy shop needs.",
    name: "Ranjit K.",
    role: "Owner — Brampton Auto Service",
  },
  {
    quote:
      "I love that they carry Liqui Moly. My customers specifically ask for it, and CA Traders gives us the best wholesale price in the GTA. Always responsive and reliable.",
    name: "Sam M.",
    role: "Head Technician — Mississauga Lube Centre",
  },
  {
    quote:
      "From ATF to refrigerants and shop rags — we get almost everything from CA Traders. The team is great to deal with, answers calls fast, and always has stock ready.",
    name: "Pavan D.",
    role: "Manager — Scarborough Automotive",
  },
] as const;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

export function Testimonials() {
  return (
    <section id="testimonials" aria-labelledby="testimonials-title" className="bg-background py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="testimonials-title" eyebrow="Testimonials" align="center">
          What Shops Are Saying
        </SectionHeading>
        <ul className="grid gap-px bg-border md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <li key={t.name} className="bg-card">
              <figure className="flex h-full flex-col gap-5 p-8">
                <p className="text-highlight">
                  <span aria-hidden="true">★★★★★</span>
                  <span className="sr-only">Rated 5 out of 5</span>
                </p>
                <blockquote className="flex-1 text-base italic leading-relaxed text-muted-foreground">
                  <p>
                    <span aria-hidden="true" className="mb-2 block font-heading text-4xl not-italic leading-none text-highlight">
                      &ldquo;
                    </span>
                    {t.quote}
                  </p>
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center bg-primary font-heading font-bold text-primary-foreground"
                  >
                    {initials(t.name)}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-heading font-bold uppercase tracking-wide text-foreground">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

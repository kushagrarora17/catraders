import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getTestimonials } from "../api";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

export async function Testimonials() {
  const testimonials = await getTestimonials();
  if (!testimonials.length) return null;

  return (
    <section id="testimonials" aria-labelledby="testimonials-title" className="bg-background py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="testimonials-title" eyebrow="Testimonials" align="center">
          What Shops Are Saying
        </SectionHeading>
        <ul className="grid gap-px bg-border md:grid-cols-3">
          {testimonials.map((t) => (
            <li key={t._id} className="border-t-3 border-transparent bg-card transition-colors duration-300 hover:border-primary">
              <figure className="flex h-full flex-col gap-5 p-8">
                <p className="text-highlight">
                  <span aria-hidden="true">{"★".repeat(t.rating)}</span>
                  <span className="sr-only">Rated {t.rating} out of 5</span>
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
                    <span className="text-xs text-muted-foreground">{[t.role, t.city].filter(Boolean).join(" · ")}</span>
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

import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { InquiryForm } from "@/features/inquiry/components/InquiryForm";
import { EMAIL, HOURS_DISPLAY, PHONE_DISPLAY, PHONE_E164 } from "@/features/site/contact";
import { Icon, type IconName } from "./icons";

const DETAILS: { icon: IconName; label: string; value: string; href?: string }[] = [
  { icon: "phone", label: "Phone", value: PHONE_DISPLAY, href: `tel:${PHONE_E164}` },
  { icon: "mail", label: "Email", value: EMAIL, href: `mailto:${EMAIL}` },
  { icon: "clock", label: "Hours", value: HOURS_DISPLAY },
];

export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" data-surface="light" className="bg-background py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Dark info panel inside the light section: reset to the default (dark) surface. */}
        <div data-surface="dark" className="flex flex-col gap-8 border-t-3 border-primary bg-secondary p-8 sm:p-12">
          <SectionHeading id="contact-title" eyebrow="Contact Us">
            Get a <span className="block">Wholesale Quote</span>
          </SectionHeading>
          <p className="leading-relaxed text-muted-foreground">
            We work exclusively with mechanics, auto shops, dealerships, and garages. Send us a message and we&apos;ll get
            back to you with pricing.
          </p>
          <dl className="flex flex-col gap-5">
            {DETAILS.map((detail) => (
              <div key={detail.label} className="flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center bg-primary/10 text-highlight">
                  <Icon name={detail.icon} className="size-5" />
                </span>
                <div className="flex flex-col">
                  <dt className="text-xs uppercase tracking-widest text-muted-foreground">{detail.label}</dt>
                  <dd className="font-heading text-lg font-bold text-foreground">
                    {detail.href ? (
                      <a href={detail.href} className="break-all text-highlight hover:underline">
                        {detail.value}
                      </a>
                    ) : (
                      detail.value
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-3xl font-black uppercase text-foreground">Send an Inquiry</h3>
          <p className="text-muted-foreground">
            Fill out the form and we&apos;ll respond with wholesale pricing within 24 hours. Know exactly which products
            you need?{" "}
            <Link href="/products" className="text-highlight hover:underline">
              Build a quote list from the catalog
            </Link>{" "}
            for itemized pricing.
          </p>
          <div className="mt-4">
            <InquiryForm />
          </div>
        </div>
      </Container>
    </section>
  );
}

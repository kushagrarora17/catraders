import Link from "next/link";
import { Container } from "@/components/ui/container";
import { BUSINESS_NAME, DESCRIPTION, EMAIL, PHONE_DISPLAY, PHONE_E164 } from "../contact";
import { NAV_LINKS, PRODUCT_LINKS, QUOTE_HREF } from "../nav";
import { Logo } from "./Logo";

const linkClass = "text-sm text-muted-foreground transition-colors hover:text-highlight";

export function SiteFooter() {
  return (
    <footer className="border-t-3 border-primary bg-background">
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div className="flex max-w-md flex-col gap-4 md:col-span-2">
          <Logo withMark={false} />
          <p className="text-sm leading-relaxed text-muted-foreground">{DESCRIPTION}</p>
        </div>
        <nav aria-labelledby="footer-quick-links">
          <h2 id="footer-quick-links" className="mb-4 text-sm font-bold uppercase tracking-eyebrow text-foreground">
            Quick Links
          </h2>
          <ul className="flex flex-col gap-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.footerLabel}
                </Link>
              </li>
            ))}
            <li>
              <Link href={QUOTE_HREF} className={linkClass}>
                Get a Quote
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-products">
          <h2 id="footer-products" className="mb-4 text-sm font-bold uppercase tracking-eyebrow text-foreground">
            Products
          </h2>
          <ul className="flex flex-col gap-2.5">
            {PRODUCT_LINKS.map((label) => (
              <li key={label}>
                <Link href="/products" className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-3 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} <span className="text-highlight">{BUSINESS_NAME}</span>. All rights reserved.
            B2B Wholesale Only.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={`tel:${PHONE_E164}`} className={linkClass}>
              {PHONE_DISPLAY}
            </a>
            <a href={`mailto:${EMAIL}`} className={linkClass}>
              {EMAIL}
            </a>
          </p>
        </Container>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { QuoteCartLink } from "@/features/quote-cart/components/QuoteCartLink";
import { NAV_LINKS, QUOTE_HREF } from "../nav";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b-3 border-primary bg-background">
      <div className="container-site relative flex h-(--header-height) items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-2 lg:gap-8">
          <ul className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="whitespace-nowrap text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-highlight"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <QuoteCartLink />
          <Link href={QUOTE_HREF} className={buttonVariants({ size: "sm", className: "hidden lg:inline-flex" })}>
            Get a Quote
          </Link>
          <MobileNav />
        </nav>
      </div>
    </header>
  );
}

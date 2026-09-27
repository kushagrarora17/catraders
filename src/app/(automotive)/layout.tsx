import Link from "next/link";
import "@/styles/themes/automotive.css";
import { QuoteCartLink } from "@/features/quote-cart/components/QuoteCartLink";

export default function AutomotiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="automotive" className="min-h-screen bg-surface text-fg">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/" className="font-heading text-lg font-semibold">
            CA Traders
          </Link>
          <Link href="/products" className="text-sm text-muted hover:text-fg">
            All products
          </Link>
          <div className="ml-auto">
            <QuoteCartLink />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

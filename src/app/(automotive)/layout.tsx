import "@/styles/themes/automotive.css";
import { SiteFooter } from "@/features/site/components/SiteFooter";
import { SiteHeader } from "@/features/site/components/SiteHeader";

export default function AutomotiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="automotive" className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only z-60 bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

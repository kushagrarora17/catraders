import Link from "next/link";
import { cn } from "@/lib/utils";
import { TAGLINE } from "../contact";
import { LOGO_DROP, LOGO_TRIANGLE, LOGO_VIEWBOX } from "../logo-paths";

/** Gold triangle with an oil drop, plus the wordmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} aria-hidden="true" className={cn("size-11 shrink-0", className)}>
      <path d={LOGO_TRIANGLE} className="fill-primary" />
      <path d={LOGO_DROP} className="fill-background" />
    </svg>
  );
}

export function Logo({ withMark = true, className }: { withMark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2.5 sm:gap-3.5", className)}>
      {withMark && <LogoMark className="size-9 sm:size-11" />}
      <span className="flex flex-col">
        <span className="whitespace-nowrap font-heading text-xl font-extrabold uppercase leading-none tracking-wide text-foreground sm:text-2xl">
          <span className="text-highlight">CA</span> Traders
          <span className="sr-only"> — home</span>
        </span>
        <span className="hidden text-2xs uppercase tracking-tagline text-subtle-foreground sm:block">{TAGLINE}</span>
      </span>
    </Link>
  );
}

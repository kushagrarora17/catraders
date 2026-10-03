import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  id: string;
  eyebrow: string;
  children: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

/** Small gold condensed label with a leading rule, shown above headings. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-heading text-sm font-medium uppercase tracking-eyebrow text-highlight",
        className,
      )}
    >
      <span aria-hidden="true" className="h-0.5 w-8 bg-current" />
      {children}
    </p>
  );
}

/** Gold eyebrow + condensed uppercase h2, as used by every landing section. */
export function SectionHeading({ id, eyebrow, children, align = "left", className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="text-4xl font-black uppercase leading-none text-foreground sm:text-5xl">
        {children}
      </h2>
    </div>
  );
}

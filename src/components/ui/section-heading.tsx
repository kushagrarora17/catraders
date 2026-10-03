import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  id: string;
  eyebrow: string;
  children: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

/** Gold eyebrow + condensed uppercase h2, as used by every landing section. */
export function SectionHeading({ id, eyebrow, children, align = "left", className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center", className)}>
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-eyebrow text-highlight">
        <span aria-hidden="true" className="h-0.5 w-8 bg-current" />
        {eyebrow}
      </p>
      <h2 id={id} className="text-4xl font-black uppercase leading-none text-foreground sm:text-5xl">
        {children}
      </h2>
    </div>
  );
}

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-heading font-bold uppercase tracking-widest transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/85",
        outline: "border border-current text-foreground hover:border-primary hover:text-highlight",
      },
      size: {
        sm: "min-h-10 px-4 text-sm",
        md: "min-h-12 px-7 text-sm",
        lg: "min-h-14 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonStyles>;

/** Button classes for any element (e.g. `<Link className={buttonVariants()}>`); `className` wins conflicts. */
export function buttonVariants({ className, ...variants }: ButtonVariantProps & { className?: string } = {}) {
  return cn(buttonStyles(variants), className);
}

export function Button({
  className,
  variant,
  size,
  ref,
  ...props
}: React.ComponentProps<"button"> & ButtonVariantProps) {
  return <button ref={ref} className={buttonVariants({ variant, size, className })} {...props} />;
}

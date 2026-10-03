import { cn } from "@/lib/utils";

const controlClass =
  "w-full border border-border bg-input px-3 py-2.5 text-base text-foreground placeholder:text-subtle-foreground transition-colors focus-visible:border-ring aria-invalid:border-destructive";

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: (control: { id: string; className: string; "aria-invalid": boolean; "aria-describedby"?: string; required?: boolean }) => React.ReactNode;
}

/** Label + control + error message, wired together for screen readers. */
export function Field({ id, label, required, error, className, children }: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="text-highlight">
            {" "}*
          </span>
        )}
      </label>
      {children({
        id,
        className: controlClass,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
        required,
      })}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

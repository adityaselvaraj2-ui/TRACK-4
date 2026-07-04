import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MissingParam {
  key: string;
  label: string;
  placeholder?: string;
}

interface ParameterModalProps {
  open: boolean;
  title: string;
  description?: string;
  params: MissingParam[];
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
}

export function ParameterModal({
  open,
  title,
  description,
  params,
  onSubmit,
  onClose,
}: ParameterModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(Object.fromEntries(params.map((p) => [p.key, ""])));
    }
  }, [open, params]);

  if (!open) return null;

  const canSubmit = params.every((p) => values[p.key]?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl border border-glass-border glass neon-border p-6 shadow-2xl",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="param-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <h2 id="param-modal-title" className="font-display text-lg font-semibold text-gradient">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit(values);
          }}
        >
          {params.map((p) => (
            <div key={p.key}>
              <label htmlFor={p.key} className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                {p.label}
              </label>
              <input
                id={p.key}
                value={values[p.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                placeholder={p.placeholder}
                className="w-full rounded-lg border border-glass-border bg-surface/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-gradient-brand py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

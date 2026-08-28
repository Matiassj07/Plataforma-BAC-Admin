import { cn } from "@/lib/utils";

export function FormCampo({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">
        {label} {required && <span className="text-bac-score-rojo">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-0.5 text-xs text-bac-gray-text">{hint}</p>}
      {error && <p className="mt-0.5 text-xs text-bac-score-rojo">{error}</p>}
    </div>
  );
}

export function campoClass(hasError?: boolean) {
  return cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1",
    hasError
      ? "border-bac-score-rojo focus:border-bac-score-rojo focus:ring-bac-score-rojo"
      : "border-bac-gray-border focus:border-bac-red focus:ring-bac-red"
  );
}

export function campoReadonlyClass() {
  return "w-full rounded-lg border border-bac-gray-border bg-bac-gray-alt px-3 py-2 text-sm text-bac-gray-text";
}

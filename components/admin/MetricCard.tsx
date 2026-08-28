import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  icon: Icon,
  label,
  value,
  valueClassName,
  sublabel,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-bac-gray-border bg-white p-4">
      <div className="flex items-center gap-2 text-bac-gray-text">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-semibold text-gray-900", valueClassName)}>{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-bac-gray-text">{sublabel}</p>}
    </div>
  );
}

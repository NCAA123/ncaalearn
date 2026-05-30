import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "accent" | "success" | "warning";
}) {
  const toneCls =
    tone === "accent"
      ? "from-accent/20 to-accent/5 text-accent-foreground"
      : tone === "success"
      ? "from-emerald-500/15 to-emerald-500/5"
      : tone === "warning"
      ? "from-amber-500/20 to-amber-500/5"
      : "from-primary/10 to-primary/5";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-primary", toneCls)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
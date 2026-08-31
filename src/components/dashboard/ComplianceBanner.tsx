import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { getMyComplianceStatus } from "@/lib/compliance.functions";

const LEVEL_STYLE: Record<string, string> = {
  upcoming: "border-border bg-muted/40 text-muted-foreground",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  critical: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  overdue: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function ComplianceBanner() {
  const fn = useServerFn(getMyComplianceStatus);
  const { data } = useQuery({ queryKey: ["my-compliance"], queryFn: () => fn() });

  if (!data?.applicable || data.bannerLevel === "none") return null;

  const incomplete = data.courses.filter((c) => !c.completed);
  const days = data.daysUntilDue;
  const message =
    data.bannerLevel === "overdue"
      ? `Your mandatory refresher training is overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}.${data.overrideActive ? " A compliance override is currently active." : " New CPD submissions and license renewal are on hold until it's completed."}`
      : `Your mandatory refresher training is due in ${days} day${days === 1 ? "" : "s"}.`;

  return (
    <div className={`rounded-xl border p-4 mb-4 flex items-start gap-3 ${LEVEL_STYLE[data.bannerLevel]}`}>
      {data.bannerLevel === "overdue" ? (
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 text-sm">
        <p className="font-medium">{message}</p>
        {!!incomplete.length && (
          <p className="mt-1 text-xs opacity-90">
            Outstanding:{" "}
            {incomplete.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ", "}
                <Link to="/courses/$slug" params={{ slug: c.slug ?? "" }} className="underline">
                  {c.title}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

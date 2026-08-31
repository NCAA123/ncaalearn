import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, Clock, ListChecks, Target } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { listPublishedScenarios } from "@/lib/simulation.functions";

export const Route = createFileRoute("/_authenticated/simulations")({
  head: () => ({ meta: [{ title: "Simulations — NCAA Academy" }] }),
  component: SimulationsPage,
});

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  advanced: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  expert: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function SimulationsPage() {
  const listFn = useServerFn(listPublishedScenarios);
  const { data, isLoading } = useQuery({ queryKey: ["simulations"], queryFn: () => listFn() });

  return (
    <div>
      <PageHeader
        title="Tournament Hall Simulations"
        description="Walk through a stylised 3D tournament hall and rule on realistic arbiter incidents, station by station."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No simulations available yet"
          description="Check back soon — new scenarios are added regularly."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((s) => (
            <Link
              key={s.id}
              to="/simulations/$scenarioId"
              params={{ scenarioId: s.id }}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <Boxes className="h-5 w-5 text-primary shrink-0" />
                {s.difficulty && (
                  <Badge className={DIFFICULTY_COLOR[s.difficulty] ?? ""} variant="secondary">
                    {s.difficulty}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-foreground leading-snug">{s.title}</h3>
              {s.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
              )}
              <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground pt-2">
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-3.5 w-3.5" /> {s.stepCount} stations
                </span>
                {s.estimated_minutes ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {s.estimated_minutes} min
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" /> {s.passing_score}% to pass
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Award, GraduationCap, IdCard, TrendingUp, Trophy, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { listBadgesForMe, evaluateMyBadges } from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/badges")({
  head: () => ({ meta: [{ title: "My Badges — NCAA Academy" }] }),
  component: BadgesPage,
});

const ICONS: Record<string, typeof Award> = {
  award: Award,
  "graduation-cap": GraduationCap,
  "id-card": IdCard,
  "trending-up": TrendingUp,
  trophy: Trophy,
};

function BadgesPage() {
  const list = useServerFn(listBadgesForMe);
  const evaluate = useServerFn(evaluateMyBadges);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-badges"], queryFn: () => list() });

  const m = useMutation({
    mutationFn: () => evaluate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-badges"] }),
  });

  // Evaluate on mount so newly-earned badges show up right away.
  useEffect(() => {
    m.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title="Badges & achievements"
        description="Earn badges as you progress through the academy."
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((b) => {
            const Icon = ICONS[b.icon ?? "award"] ?? Award;
            const earned = !!b.awarded_at;
            return (
              <div
                key={b.id}
                className={
                  "rounded-xl border p-5 " +
                  (earned
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card opacity-70")
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "h-11 w-11 rounded-lg flex items-center justify-center " +
                      (earned ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")
                    }
                  >
                    {earned ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{b.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {earned ? `Awarded ${new Date(b.awarded_at!).toLocaleDateString()}` : "Not earned yet"}
                    </p>
                  </div>
                </div>
                {b.description && (
                  <p className="text-xs text-muted-foreground mt-3">{b.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
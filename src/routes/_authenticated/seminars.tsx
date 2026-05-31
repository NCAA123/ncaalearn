import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewSeminarDialog } from "@/components/seminars/NewSeminarDialog";
import { Calendar, MapPin, Search, Video, Users, Plus, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seminars")({
  head: () => ({ meta: [{ title: "Seminars — NCAA Academy" }] }),
  component: SeminarsPage,
});

const MODES = ["all", "online", "in_person", "hybrid"] as const;
type Mode = (typeof MODES)[number];

function SeminarsPage() {
  const { user, isStaff } = useAuth();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [tab, setTab] = useState<"upcoming" | "mine" | "past">("upcoming");

  const { data: seminars, isLoading, refetch } = useQuery({
    queryKey: ["seminars-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_seminars")
        .select("*")
        .order("starts_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: regs } = useQuery({
    queryKey: ["my-seminar-regs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_seminar_registrations")
        .select("seminar_id,status")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const regMap = useMemo(() => {
    const m = new Map<string, string>();
    (regs ?? []).forEach((r: any) => {
      if (r.status !== "cancelled") m.set(r.seminar_id, r.status);
    });
    return m;
  }, [regs]);

  const now = Date.now();
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (seminars ?? []).filter((s: any) => {
      const isPast = new Date(s.ends_at).getTime() < now;
      if (tab === "upcoming" && isPast) return false;
      if (tab === "past" && !isPast) return false;
      if (tab === "mine" && !regMap.has(s.id)) return false;
      if (mode !== "all" && s.mode !== mode) return false;
      if (term && !`${s.title} ${s.description ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [seminars, q, mode, tab, regMap, now]);

  return (
    <>
      <PageHeader
        title="Seminars"
        description="Online, in-person and hybrid arbiter training events."
        action={isStaff ? <NewSeminarDialog onCreated={() => refetch()} trigger={
          <Button><Plus className="h-4 w-4 mr-2" />New seminar</Button>
        } /> : undefined}
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["upcoming", "mine", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "px-3 py-1.5 rounded-md text-xs font-medium border transition capitalize " +
              (tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground")
            }
          >
            {t === "mine" ? "My seminars" : t}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search seminars…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                "px-3 py-1.5 rounded-md text-xs font-medium border transition capitalize " +
                (mode === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground")
              }
            >
              {m.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse h-44" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((s: any) => {
            const status = regMap.get(s.id);
            const start = new Date(s.starts_at);
            return (
              <Link
                key={s.id}
                to="/seminars/$id"
                params={{ id: s.id }}
                className="group rounded-xl border border-border bg-card p-5 hover:shadow-[var(--shadow-elegant)] hover:border-primary/40 transition flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className="capitalize">{s.mode.replace("_", " ")}</Badge>
                  {status === "registered" ? (
                    <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Registered</Badge>
                  ) : status === "waitlisted" ? (
                    <Badge variant="outline">Waitlisted</Badge>
                  ) : !s.is_published ? (
                    <Badge variant="outline">Draft</Badge>
                  ) : null}
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition">{s.title}</h3>
                {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                <div className="mt-auto pt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  {s.mode !== "online" && s.location && (
                    <div className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{s.location}</div>
                  )}
                  {s.mode !== "in_person" && s.meeting_url && (
                    <div className="inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5" />Online link</div>
                  )}
                  {s.capacity && (
                    <div className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Capacity {s.capacity}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={tab === "mine" ? "You haven't registered for any seminars" : "No seminars found"}
          description={tab === "mine" ? "Browse upcoming seminars to register." : "Try a different filter or check back later."}
        />
      )}
    </>
  );
}
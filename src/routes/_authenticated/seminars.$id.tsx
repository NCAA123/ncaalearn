import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Video, Users, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seminars/$id")({
  head: () => ({ meta: [{ title: "Seminar — NCAA Academy" }] }),
  component: SeminarDetailPage,
});

function SeminarDetailPage() {
  const { id } = Route.useParams();
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();

  const { data: seminar, isLoading } = useQuery({
    queryKey: ["seminar", id],
    queryFn: async () => {
      const { data } = await supabase.from("academy_seminars").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: registration } = useQuery({
    queryKey: ["seminar-reg", user?.id, id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_seminar_registrations")
        .select("*")
        .eq("seminar_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: registrations } = useQuery({
    queryKey: ["seminar-regs", id],
    enabled: !!seminar,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_seminar_registrations")
        .select("id,status,user_id")
        .eq("seminar_id", id);
      return data ?? [];
    },
  });

  const registeredCount = (registrations ?? []).filter((r: any) => r.status === "registered").length;
  const capacityFull = !!seminar?.capacity && registeredCount >= seminar.capacity;

  const registerMut = useMutation({
    mutationFn: async () => {
      if (!user || !seminar) throw new Error("Not ready");
      const status = capacityFull ? "waitlisted" : "registered";
      const { error } = await supabase
        .from("academy_seminar_registrations")
        .insert({ user_id: user.id, seminar_id: seminar.id, status });
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "waitlisted" ? "Added to waitlist" : "Registered — see you there!");
      qc.invalidateQueries({ queryKey: ["seminar-reg", user?.id, id] });
      qc.invalidateQueries({ queryKey: ["seminar-regs", id] });
      qc.invalidateQueries({ queryKey: ["my-seminar-regs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not register"),
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      if (!registration) return;
      const { error } = await supabase
        .from("academy_seminar_registrations")
        .update({ status: "cancelled" })
        .eq("id", registration.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled");
      qc.invalidateQueries({ queryKey: ["seminar-reg", user?.id, id] });
      qc.invalidateQueries({ queryKey: ["seminar-regs", id] });
      qc.invalidateQueries({ queryKey: ["my-seminar-regs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not cancel"),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!seminar) {
    return (
      <EmptyState
        title="Seminar not found"
        description="It may have been removed."
        action={<Button asChild variant="outline"><Link to="/seminars">Back to seminars</Link></Button>}
      />
    );
  }

  const start = new Date(seminar.starts_at);
  const end = new Date(seminar.ends_at);
  const isPast = end.getTime() < Date.now();

  return (
    <>
      <Link to="/seminars" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Seminars
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="capitalize">{seminar.mode.replace("_", " ")}</Badge>
              {seminar.level && <Badge variant="outline">{seminar.level}</Badge>}
              {!seminar.is_published && <Badge variant="outline">Draft</Badge>}
              {isPast && <Badge variant="secondary">Past</Badge>}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{seminar.title}</h1>
            {seminar.description && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{seminar.description}</p>}
          </div>
          <div className="flex flex-col gap-2 min-w-[220px]">
            {registration ? (
              <>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="capitalize">{registration.status}</span>
                </div>
                {registration.status === "registered" && seminar.meeting_url && !isPast && (
                  <Button asChild>
                    <a href={seminar.meeting_url} target="_blank" rel="noreferrer">
                      Join <ExternalLink className="h-4 w-4 ml-1.5" />
                    </a>
                  </Button>
                )}
                {!isPast && (
                  <Button variant="outline" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
                    {cancelMut.isPending ? "Cancelling…" : "Cancel registration"}
                  </Button>
                )}
              </>
            ) : isPast ? (
              <Button disabled>Registration closed</Button>
            ) : (
              <Button onClick={() => registerMut.mutate()} disabled={registerMut.isPending}>
                {registerMut.isPending ? "Registering…" : capacityFull ? "Join waitlist" : "Register"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <DetailRow icon={Calendar} label="When">
          {start.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
          {" → "}
          {end.toLocaleString(undefined, { dateStyle: end.toDateString() === start.toDateString() ? undefined : "medium", timeStyle: "short" })}
        </DetailRow>
        {seminar.location && (
          <DetailRow icon={MapPin} label="Location">{seminar.location}</DetailRow>
        )}
        {seminar.meeting_url && (
          <DetailRow icon={Video} label="Meeting link">
            <a className="text-primary hover:underline break-all" href={seminar.meeting_url} target="_blank" rel="noreferrer">
              {seminar.meeting_url}
            </a>
          </DetailRow>
        )}
        <DetailRow icon={Users} label="Registered">
          {registeredCount}{seminar.capacity ? ` of ${seminar.capacity}` : ""}
        </DetailRow>
      </div>

      {isStaff && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium mb-3">Attendees ({registrations?.length ?? 0})</h3>
          {(registrations ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <ul className="text-sm divide-y divide-border">
              {registrations!.map((r: any) => (
                <li key={r.id} className="py-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{r.user_id.slice(0, 8)}…</span>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
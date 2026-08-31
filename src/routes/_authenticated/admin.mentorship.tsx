import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Handshake } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { listUsers } from "@/lib/admin.functions";
import { adminMatchMentorship, listAllMentorships } from "@/lib/mentorship.functions";

export const Route = createFileRoute("/_authenticated/admin/mentorship")({
  head: () => ({ meta: [{ title: "Mentorship — Admin" }] }),
  component: AdminMentorship,
});

function AdminMentorship() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [mentorId, setMentorId] = useState("");
  const [menteeId, setMenteeId] = useState("");
  const [goals, setGoals] = useState("");

  const usersFn = useServerFn(listUsers);
  const { data: users } = useQuery({ queryKey: ["admin-users-for-mentorship"], queryFn: () => usersFn(), enabled: isAdmin });

  const eligibleMentors = useMemo(
    () => (users ?? []).filter((u) => u.roles.includes("fide_arbiter") || u.roles.includes("international_arbiter")),
    [users],
  );

  const matchFn = useServerFn(adminMatchMentorship);
  const matchMut = useMutation({
    mutationFn: () => matchFn({ data: { mentorId, menteeId, goals: goals || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mentorships"] });
      setMentorId(""); setMenteeId(""); setGoals("");
      toast.success("Mentorship created");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const listFn = useServerFn(listAllMentorships);
  const { data, isLoading } = useQuery({ queryKey: ["admin-mentorships"], queryFn: () => listFn(), enabled: isAdmin });

  if (!isAdmin) return <PageHeader title="Mentorship" description="Admin access only." />;

  return (
    <div>
      <PageHeader title="Mentorship" description="Manually pair mentors and mentees, and oversee all active mentorships." />
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
        <form
          onSubmit={(e) => { e.preventDefault(); if (mentorId && menteeId) matchMut.mutate(); }}
          className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit"
        >
          <h3 className="font-semibold flex items-center gap-2"><Handshake className="h-4 w-4" /> Manual match</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Mentor (FA/IA)</label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={mentorId} onChange={(e) => setMentorId(e.target.value)} required>
              <option value="">Select mentor…</option>
              {eligibleMentors.map((u) => (
                <option key={u.id} value={u.id}>{u.profile ? `${u.profile.first_name ?? ""} ${u.profile.last_name ?? ""}` : u.email} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Mentee</label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={menteeId} onChange={(e) => setMenteeId(e.target.value)} required>
              <option value="">Select mentee…</option>
              {(users ?? []).filter((u) => u.id !== mentorId).map((u) => (
                <option key={u.id} value={u.id}>{u.profile ? `${u.profile.first_name ?? ""} ${u.profile.last_name ?? ""}` : u.email} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Goals (optional)</label>
            <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={!mentorId || !menteeId || matchMut.isPending}>
            {matchMut.isPending ? "Creating…" : "Create mentorship"}
          </Button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !data || data.length === 0 ? (
            <EmptyState title="No mentorships yet" />
          ) : (
            data.map((m) => {
              const mentor = m.mentor as { first_name?: string; last_name?: string; email?: string } | null;
              const mentee = m.mentee as { first_name?: string; last_name?: string; email?: string } | null;
              return (
                <div key={m.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <span className="font-medium">{mentor ? `${mentor.first_name ?? ""} ${mentor.last_name ?? ""}` : "—"}</span>
                      {" → "}
                      <span className="font-medium">{mentee ? `${mentee.first_name ?? ""} ${mentee.last_name ?? ""}` : "—"}</span>
                    </p>
                    <Badge variant={m.status === "active" ? "default" : m.status === "pending" ? "secondary" : "outline"}>{m.status}</Badge>
                  </div>
                  {m.goals && <p className="text-xs text-muted-foreground mt-1">{m.goals}</p>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

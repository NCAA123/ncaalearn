import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Users, Handshake, MessageSquare, Video, FileText, Star, Flag, CheckCircle2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getMyMentorProfile,
  setMentorAvailability,
  listAvailableMentors,
  requestMentorship,
  getMyMentorships,
  respondToMentorshipRequest,
  listInteractions,
  logInteraction,
  completeMentorship,
} from "@/lib/mentorship.functions";

export const Route = createFileRoute("/_authenticated/mentorship")({
  head: () => ({ meta: [{ title: "Mentorship — NCAA Academy" }] }),
  component: MentorshipPage,
});

const INTERACTION_ICON: Record<string, typeof MessageSquare> = {
  message: MessageSquare,
  meeting: Video,
  resource: FileText,
  feedback: Star,
  milestone: Flag,
};

function MentorshipPage() {
  const { profile } = useAuth();
  const isEligibleMentor = profile?.arbiter_title === "FIDE" || profile?.arbiter_title === "International";
  const qc = useQueryClient();
  const [requestingFor, setRequestingFor] = useState<string | null>(null);
  const [goals, setGoals] = useState("");
  const [openThread, setOpenThread] = useState<string | null>(null);

  const mentorProfileFn = useServerFn(getMyMentorProfile);
  const { data: mentorProfile } = useQuery({ queryKey: ["my-mentor-profile"], queryFn: () => mentorProfileFn() });

  const availFn = useServerFn(setMentorAvailability);
  const availMut = useMutation({
    mutationFn: (v: { is_available: boolean; specialization?: string }) => availFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-mentor-profile"] });
      toast.success("Mentor availability updated");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mentorsFn = useServerFn(listAvailableMentors);
  const { data: mentors, isLoading: mentorsLoading } = useQuery({
    queryKey: ["available-mentors"],
    queryFn: () => mentorsFn(),
  });

  const requestFn = useServerFn(requestMentorship);
  const requestMut = useMutation({
    mutationFn: (v: { mentorId: string; goals: string }) => requestFn({ data: v }),
    onSuccess: () => {
      setRequestingFor(null);
      setGoals("");
      toast.success("Mentorship request sent");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mineFn = useServerFn(getMyMentorships);
  const { data: mine, isLoading: mineLoading } = useQuery({ queryKey: ["my-mentorships"], queryFn: () => mineFn() });

  const respondFn = useServerFn(respondToMentorshipRequest);
  const respondMut = useMutation({
    mutationFn: (v: { id: string; accept: boolean }) => respondFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-mentorships"] });
      toast.success("Response sent");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const completeFn = useServerFn(completeMentorship);
  const completeMut = useMutation({
    mutationFn: (id: string) => completeFn({ data: { id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["my-mentorships"] });
      toast.success(r.cpdAwarded > 0 ? `Mentorship completed -- ${r.cpdAwarded} CPD points awarded` : "Mentorship completed");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mentorship"
        description="Pair up with an experienced arbiter to accelerate your progression, or give back by mentoring the next generation."
      />

      {isEligibleMentor && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Handshake className="h-4 w-4" /> Offer mentorship</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Opt in to appear in the mentor directory for Candidates, NAs{profile?.arbiter_title === "International" ? " and FAs" : ""}. Max 3 active mentees.
              </p>
            </div>
            <Switch
              checked={!!(mentorProfile as { is_available?: boolean } | null)?.is_available}
              onCheckedChange={(v) => availMut.mutate({ is_available: !!v, specialization: (mentorProfile as { specialization?: string } | null)?.specialization ?? undefined })}
            />
          </div>
          {(mentorProfile as { is_available?: boolean } | null)?.is_available && (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Specialisation (optional)</label>
              <Input
                defaultValue={(mentorProfile as { specialization?: string } | null)?.specialization ?? ""}
                placeholder="e.g. rapid/blitz tournaments, arbiter norms guidance"
                onBlur={(e) => availMut.mutate({ is_available: true, specialization: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">My mentorships</h2>
        {mineLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !mine || (mine.asMentor.length === 0 && mine.asMentee.length === 0) ? (
          <EmptyState title="No mentorships yet" description="Request a mentor below, or wait for requests if you've opted in to mentor." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {[...mine.asMentee.map((m) => ({ ...m, role: "mentee" as const })), ...mine.asMentor.map((m) => ({ ...m, role: "mentor" as const }))].map((m) => {
              const counterpart = m.counterpart as { first_name?: string; last_name?: string; arbiter_level?: string } | null;
              const name = counterpart ? `${counterpart.first_name ?? ""} ${counterpart.last_name ?? ""}`.trim() : "—";
              return (
                <div key={m.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{m.role === "mentor" ? "Mentoring" : "Mentored by"}</p>
                      <p className="font-medium">{name} {counterpart?.arbiter_level && <span className="text-xs text-muted-foreground">({counterpart.arbiter_level})</span>}</p>
                    </div>
                    <Badge variant={m.status === "active" ? "default" : m.status === "pending" ? "secondary" : m.status === "completed" ? "outline" : "secondary"}>
                      {m.status}
                    </Badge>
                  </div>
                  {m.goals && <p className="text-sm text-muted-foreground">{m.goals}</p>}

                  {m.status === "pending" && m.role === "mentor" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondMut.mutate({ id: m.id, accept: true })} disabled={respondMut.isPending}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => respondMut.mutate({ id: m.id, accept: false })} disabled={respondMut.isPending}>Decline</Button>
                    </div>
                  )}

                  {m.status === "active" && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOpenThread(openThread === m.id ? null : m.id)}>
                        {openThread === m.id ? "Hide log" : "Interaction log"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { if (confirm("Mark this mentorship as completed?")) completeMut.mutate(m.id); }} disabled={completeMut.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                      </Button>
                    </div>
                  )}

                  {openThread === m.id && <InteractionThread mentorshipId={m.id} />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Find a mentor</h2>
        {mentorsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !mentors || mentors.length === 0 ? (
          <EmptyState title="No mentors available right now" description="Check back later, or ask an admin to pair you manually." />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(mentors as { user_id: string; first_name?: string; last_name?: string; arbiter_level?: string; state?: string; specialization?: string; active_mentee_count: number; max_mentees: number }[]).map((m) => (
              <div key={m.user_id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{m.first_name} {m.last_name}</p>
                  <Badge variant="outline">{m.arbiter_level === "International" ? "IA" : "FA"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{m.state ?? "—"} · {m.active_mentee_count}/{m.max_mentees} mentees</p>
                {m.specialization && <p className="text-xs text-muted-foreground">{m.specialization}</p>}
                {requestingFor === m.user_id ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="What would you like help with?"
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={!goals.trim() || requestMut.isPending} onClick={() => requestMut.mutate({ mentorId: m.user_id, goals })}>
                        Send request
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRequestingFor(null); setGoals(""); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => setRequestingFor(m.user_id)}>Request mentorship</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InteractionThread({ mentorshipId }: { mentorshipId: string }) {
  const qc = useQueryClient();
  const [type, setType] = useState<"message" | "meeting" | "resource" | "feedback" | "milestone">("message");
  const [content, setContent] = useState("");

  const listFn = useServerFn(listInteractions);
  const { data } = useQuery({ queryKey: ["mentorship-interactions", mentorshipId], queryFn: () => listFn({ data: { mentorshipId } }) });

  const logFn = useServerFn(logInteraction);
  const logMut = useMutation({
    mutationFn: () => logFn({ data: { mentorshipId, type, content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentorship-interactions", mentorshipId] });
      setContent("");
      toast.success("Logged");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <div className="space-y-2">
        {(data ?? []).length === 0 && <p className="text-xs text-muted-foreground">No interactions logged yet.</p>}
        {(data ?? []).map((i) => {
          const row = i as { id: string; interaction_type: string; content: string | null; interaction_date: string };
          const Icon = INTERACTION_ICON[row.interaction_type] ?? MessageSquare;
          return (
            <div key={row.id} className="flex items-start gap-2 text-sm">
              <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p>{row.content}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(row.interaction_date).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="message">Message</option>
          <option value="meeting">Meeting</option>
          <option value="resource">Resource shared</option>
          <option value="feedback">Feedback</option>
          <option value="milestone">Milestone</option>
        </select>
        <Input placeholder="Log an update…" value={content} onChange={(e) => setContent(e.target.value)} className="flex-1" />
        <Button size="sm" disabled={!content.trim() || logMut.isPending} onClick={() => logMut.mutate()}>Log</Button>
      </div>
    </div>
  );
}

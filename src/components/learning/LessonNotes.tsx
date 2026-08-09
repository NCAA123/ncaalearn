import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LessonNotes({
  lessonId,
  pendingTimestamp,
  onConsumeTimestamp,
}: {
  lessonId: string;
  pendingTimestamp?: number | null;
  onConsumeTimestamp?: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [ts, setTs] = useState<number | null>(null);

  useEffect(() => {
    if (pendingTimestamp != null) {
      setOpen(true);
      setTs(pendingTimestamp);
      onConsumeTimestamp?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTimestamp]);

  const { data: notes } = useQuery({
    queryKey: ["lesson-notes", user?.id, lessonId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_lesson_notes")
        .select("id,body,timestamp_seconds,created_at")
        .eq("user_id", user!.id)
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("academy_lesson_notes").insert({
        user_id: user!.id,
        lesson_id: lessonId,
        body: draft.trim().slice(0, 5000),
        timestamp_seconds: ts,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      setTs(null);
      qc.invalidateQueries({ queryKey: ["lesson-notes"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("academy_lesson_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-notes"] }),
  });

  if (!user) return null;

  return (
    <section className="mt-6 rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        My notes {notes?.length ? `(${notes.length})` : ""}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Write a private note for this lesson…"
          />
          <div className="flex items-center gap-2">
            {ts != null && (
              <span className="text-xs text-muted-foreground">at {fmt(ts)}</span>
            )}
            <Button
              size="sm"
              className="ml-auto"
              disabled={!draft.trim() || addMut.isPending}
              onClick={() => addMut.mutate()}
            >
              Save note
            </Button>
          </div>
          <ul className="space-y-2">
            {(notes ?? []).map((n) => (
              <li key={n.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="flex-1 whitespace-pre-wrap">{n.body}</div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => delMut.mutate(n.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {n.timestamp_seconds != null ? `${fmt(n.timestamp_seconds)} · ` : ""}
                  {new Date(n.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
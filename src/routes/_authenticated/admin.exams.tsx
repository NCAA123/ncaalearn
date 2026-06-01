import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createExam, deleteExam } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/exams")({
  head: () => ({ meta: [{ title: "Exams — Admin" }] }),
  component: AdminExams,
});

function AdminExams() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [pass, setPass] = useState(70);
  const [level, setLevel] = useState("na");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_exams")
        .select("id,title,level,duration_minutes,pass_score,is_published,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const createFn = useServerFn(createExam);
  const createMut = useMutation({
    mutationFn: () => createFn({ data: { title, description, duration_minutes: duration, pass_score: pass, level } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-exams"] }); setTitle(""); setDescription(""); toast.success("Exam created (Sprint 5 adds runtime)"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const delFn = useServerFn(deleteExam);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-exams"] }),
  });

  if (!isStaff) return <PageHeader title="Exams" description="Staff access only." />;

  return (
    <div>
      <PageHeader title="Examinations" description="Manage exam definitions. Question bank and candidate runtime ship in Sprint 5." />
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); if (title) createMut.mutate(); }}
          className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit"
        >
          <h3 className="font-semibold">New exam</h3>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs">Duration (min)</label><Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
            <div><label className="text-xs">Pass score (%)</label><Input type="number" min={0} max={100} value={pass} onChange={(e) => setPass(Number(e.target.value))} /></div>
          </div>
          <div><label className="text-xs">Level (na / fa / ia)</label><Input value={level} onChange={(e) => setLevel(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={createMut.isPending}>{createMut.isPending ? "Creating…" : "Create exam"}</Button>
        </form>

        <div className="space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : (data ?? []).length === 0 ? <EmptyState title="No exams yet" />
            : (data ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.level.toUpperCase()} · {e.duration_minutes}m · pass {e.pass_score}%</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={e.is_published ? "default" : "secondary"}>{e.is_published ? "Published" : "Draft"}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${e.title}"?`)) delMut.mutate(e.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
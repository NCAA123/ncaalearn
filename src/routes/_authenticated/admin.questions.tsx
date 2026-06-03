import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Circle, Trash2, Pencil, Plus, X } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  approveQuestion,
  deleteQuestion,
  listQuestions,
  upsertQuestion,
} from "@/lib/exam.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  head: () => ({ meta: [{ title: "Question bank — Admin" }] }),
  component: AdminQuestions,
});

type QType = "mcq" | "multi" | "tf" | "essay";

type Draft = {
  id?: string;
  exam_id: string;
  question_type: QType;
  question_text: string;
  options: string[];
  correct_answer: number | number[] | string | null;
  points: number;
  category: string;
  difficulty: string;
};

const blank = (examId: string): Draft => ({
  exam_id: examId,
  question_type: "mcq",
  question_text: "",
  options: ["", ""],
  correct_answer: 0,
  points: 1,
  category: "",
  difficulty: "medium",
});

function AdminQuestions() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [examId, setExamId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "yes" | "no">("all");
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: exams } = useQuery({
    queryKey: ["admin-exams-list"],
    enabled: isStaff,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_exams")
        .select("id,title")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const listFn = useServerFn(listQuestions);
  const { data: questions, isLoading } = useQuery({
    queryKey: ["admin-questions", examId, filter],
    enabled: isStaff && !!examId,
    queryFn: () => listFn({ data: { examId, approved: filter } }),
  });

  const upsertFn = useServerFn(upsertQuestion);
  const upsertMut = useMutation({
    mutationFn: (d: Draft) =>
      upsertFn({
        data: {
          id: d.id,
          exam_id: d.exam_id,
          question_type: d.question_type,
          question_text: d.question_text,
          options: d.question_type === "essay" ? null : d.options.filter((o) => o.trim()),
          correct_answer: d.correct_answer,
          points: d.points,
          category: d.category || undefined,
          difficulty: d.difficulty,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      setDraft(null);
      toast.success("Saved");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const approveFn = useServerFn(approveQuestion);
  const approveMut = useMutation({
    mutationFn: (p: { id: string; approved: boolean }) => approveFn({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-questions"] }),
  });

  const delFn = useServerFn(deleteQuestion);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-questions"] }),
  });

  const examOptions = useMemo(() => exams ?? [], [exams]);

  if (!isStaff) return <PageHeader title="Question bank" description="Staff access only." />;

  return (
    <div>
      <PageHeader
        title="Question bank"
        description="Author, approve, and manage exam questions. Approved questions are served to candidates."
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select an exam" />
          </SelectTrigger>
          <SelectContent>
            {examOptions.map((e: { id: string; title: string }) => (
              <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={(v) => setFilter(v as "all" | "yes" | "no")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Approved</SelectItem>
            <SelectItem value="no">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button
          disabled={!examId}
          onClick={() => setDraft(blank(examId))}
          className="ml-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New question
        </Button>
      </div>

      {!examId ? (
        <EmptyState title="Pick an exam" description="Choose an exam above to manage its questions." />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (questions ?? []).length === 0 ? (
        <EmptyState title="No questions yet" description="Add the first question for this exam." />
      ) : (
        <ul className="space-y-2">
          {(questions ?? []).map((q) => {
            const row = q as {
              id: string;
              question_type: string;
              question_text: string;
              options: string[] | null;
              correct_answer: unknown;
              points: number;
              approved: boolean;
              difficulty: string;
              category: string | null;
            };
            return (
              <li key={row.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className="uppercase text-[10px]">{row.question_type}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{row.points} pt</Badge>
                      <Badge variant="outline" className="text-[10px]">{row.difficulty}</Badge>
                      {row.category ? <span className="text-xs text-muted-foreground">{row.category}</span> : null}
                      {row.approved ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Approved</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{row.question_text}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      title={row.approved ? "Unapprove" : "Approve"}
                      onClick={() => approveMut.mutate({ id: row.id, approved: !row.approved })}
                    >
                      {row.approved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setDraft({
                          id: row.id,
                          exam_id: examId,
                          question_type: row.question_type as QType,
                          question_text: row.question_text,
                          options: row.options ?? ["", ""],
                          correct_answer: row.correct_answer as Draft["correct_answer"],
                          points: row.points,
                          category: row.category ?? "",
                          difficulty: row.difficulty,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { if (confirm("Delete this question?")) delMut.mutate(row.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {draft ? <QuestionEditor draft={draft} setDraft={setDraft} onSave={() => upsertMut.mutate(draft)} saving={upsertMut.isPending} /> : null}
    </div>
  );
}

function QuestionEditor({
  draft,
  setDraft,
  onSave,
  saving,
}: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.question_text.trim()) {
      toast.error("Question text required");
      return;
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{draft.id ? "Edit question" : "New question"}</h3>
          <Button size="icon" variant="ghost" type="button" onClick={() => setDraft(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs">Type</label>
            <Select
              value={draft.question_type}
              onValueChange={(v) => {
                const t = v as QType;
                setDraft({
                  ...draft,
                  question_type: t,
                  options: t === "tf" ? ["True", "False"] : t === "essay" ? [] : draft.options.length < 2 ? ["", ""] : draft.options,
                  correct_answer: t === "essay" ? null : t === "multi" ? [] : 0,
                });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple choice (single)</SelectItem>
                <SelectItem value="multi">Multiple choice (multi)</SelectItem>
                <SelectItem value="tf">True / False</SelectItem>
                <SelectItem value="essay">Essay (manual grading)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs">Points</label>
            <Input
              type="number"
              min={1}
              value={draft.points}
              onChange={(e) => setDraft({ ...draft, points: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs">Question text</label>
          <Textarea
            rows={3}
            value={draft.question_text}
            onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
            required
          />
        </div>

        {draft.question_type !== "essay" ? (
          <div className="space-y-2">
            <label className="text-xs">Options & correct answer</label>
            {draft.options.map((opt, i) => {
              const isCorrect =
                draft.question_type === "multi"
                  ? Array.isArray(draft.correct_answer) && (draft.correct_answer as number[]).includes(i)
                  : draft.correct_answer === i;
              return (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (draft.question_type === "multi") {
                        const arr = Array.isArray(draft.correct_answer) ? [...(draft.correct_answer as number[])] : [];
                        const idx = arr.indexOf(i);
                        if (idx >= 0) arr.splice(idx, 1);
                        else arr.push(i);
                        setDraft({ ...draft, correct_answer: arr });
                      } else {
                        setDraft({ ...draft, correct_answer: i });
                      }
                    }}
                    className={
                      "h-9 w-9 rounded-md border flex items-center justify-center shrink-0 " +
                      (isCorrect ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "border-border text-muted-foreground")
                    }
                  >
                    {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </button>
                  <Input
                    value={opt}
                    disabled={draft.question_type === "tf"}
                    onChange={(e) => {
                      const opts = [...draft.options];
                      opts[i] = e.target.value;
                      setDraft({ ...draft, options: opts });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                  {draft.question_type !== "tf" && draft.options.length > 2 ? (
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const opts = draft.options.filter((_, idx) => idx !== i);
                        setDraft({ ...draft, options: opts, correct_answer: 0 });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
            {draft.question_type !== "tf" && draft.options.length < 8 ? (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add option
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs">Category</label>
            <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          </div>
          <div>
            <label className="text-xs">Difficulty</label>
            <Select value={draft.difficulty} onValueChange={(v) => setDraft({ ...draft, difficulty: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save question"}</Button>
        </div>
      </form>
    </div>
  );
}
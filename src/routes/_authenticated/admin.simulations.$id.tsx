import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { createStep, deleteStep, listStepsAdmin } from "@/lib/simulation.functions";

export const Route = createFileRoute("/_authenticated/admin/simulations/$id")({
  head: () => ({ meta: [{ title: "Scenario stations — Admin" }] }),
  component: AdminScenarioSteps,
});

type ChoiceForm = { id: string; label: string; is_correct: boolean; feedback: string };

function emptyChoices(): ChoiceForm[] {
  return [
    { id: crypto.randomUUID(), label: "", is_correct: true, feedback: "" },
    { id: crypto.randomUUID(), label: "", is_correct: false, feedback: "" },
  ];
}

function AdminScenarioSteps() {
  const { id: scenarioId } = Route.useParams();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const listFn = useServerFn(listStepsAdmin);
  const { data: steps, isLoading } = useQuery({
    queryKey: ["admin-scenario-steps", scenarioId],
    queryFn: () => listFn({ data: { scenarioId } }),
    enabled: isAdmin,
  });

  const [form, setForm] = useState({
    prompt: "",
    fen: "",
    incidentType: "",
    points: 10,
    choices: emptyChoices(),
  });

  const createFn = useServerFn(createStep);
  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          scenario_id: scenarioId,
          step_order: (steps?.length ?? 0) + 1,
          prompt: form.prompt,
          context: {
            ...(form.fen ? { fen: form.fen } : {}),
            ...(form.incidentType ? { incidentType: form.incidentType } : {}),
          },
          points: form.points,
          choices: form.choices
            .filter((c) => c.label.trim())
            .map((c) => ({
              id: c.id,
              label: c.label.trim(),
              is_correct: c.is_correct,
              points: c.is_correct ? form.points : 0,
              feedback: c.feedback.trim() || undefined,
            })),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scenario-steps", scenarioId] });
      setOpen(false);
      setForm({ prompt: "", fen: "", incidentType: "", points: 10, choices: emptyChoices() });
      toast.success("Station added");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteFn = useServerFn(deleteStep);
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scenario-steps", scenarioId] });
      toast.success("Station removed");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return <EmptyState title="Admin access required" description="Only academy administrators can manage simulations." />;
  }

  const validChoiceCount = form.choices.filter((c) => c.label.trim()).length;
  const hasCorrect = form.choices.some((c) => c.is_correct && c.label.trim());

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (validChoiceCount < 2) return toast.error("Add at least 2 choices");
    if (!hasCorrect) return toast.error("Mark at least one choice as correct");
    createMut.mutate();
  }

  return (
    <div>
      <Link to="/admin/simulations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to simulations
      </Link>
      <PageHeader
        title="Stations"
        description="Each station is an incident the candidate resolves in order, walking through the 3D hall."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add station
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New station</DialogTitle>
                <DialogDescription>Describe the incident and the possible rulings.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Incident prompt</Label>
                  <Textarea
                    value={form.prompt}
                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Board position (FEN, optional)</Label>
                    <Input
                      value={form.fen}
                      onChange={(e) => setForm({ ...form, fen: e.target.value })}
                      placeholder="Leave blank if no board is involved"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Incident type (optional)</Label>
                    <Input
                      value={form.incidentType}
                      onChange={(e) => setForm({ ...form, incidentType: e.target.value })}
                      placeholder="rules, conduct, time…"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Points for a correct ruling</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Choices</Label>
                    {form.choices.length < 8 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            choices: [...f.choices, { id: crypto.randomUUID(), label: "", is_correct: false, feedback: "" }],
                          }))
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Add choice
                      </Button>
                    )}
                  </div>
                  {form.choices.map((c, i) => (
                    <div key={c.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={c.is_correct}
                          onCheckedChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              choices: f.choices.map((ch, ci) => (ci === i ? { ...ch, is_correct: !!v } : ch)),
                            }))
                          }
                        />
                        <Input
                          value={c.label}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              choices: f.choices.map((ch, ci) => (ci === i ? { ...ch, label: e.target.value } : ch)),
                            }))
                          }
                          placeholder={`Choice ${i + 1}`}
                          className="flex-1"
                        />
                        {form.choices.length > 2 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setForm((f) => ({ ...f, choices: f.choices.filter((_, ci) => ci !== i) }))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={c.feedback}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            choices: f.choices.map((ch, ci) => (ci === i ? { ...ch, feedback: e.target.value } : ch)),
                          }))
                        }
                        placeholder="Feedback shown after answering (optional)"
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? "Adding…" : "Add station"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !steps || steps.length === 0 ? (
        <EmptyState title="No stations yet" description="Add the first incident station for this scenario." />
      ) : (
        <div className="space-y-2">
          {steps.map((s, i) => {
            const choices = (s.choices as unknown as { label: string; is_correct: boolean }[]) ?? [];
            const context = s.context as { fen?: string; incidentType?: string } | null;
            return (
              <div key={s.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Station {i + 1}
                      {context?.incidentType ? ` · ${context.incidentType}` : ""}
                      {context?.fen ? " · has board" : ""}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">{s.prompt}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Remove this station?")) deleteMut.mutate(s.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <ul className="mt-2 space-y-1">
                  {choices.map((c, ci) => (
                    <li key={ci} className={"text-xs " + (c.is_correct ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground")}>
                      {c.is_correct ? "✓ " : "— "}
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

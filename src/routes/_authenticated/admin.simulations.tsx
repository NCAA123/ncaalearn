import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Trash2, Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  createScenario,
  deleteScenario,
  listAllScenariosAdmin,
  updateScenario,
} from "@/lib/simulation.functions";

export const Route = createFileRoute("/_authenticated/admin/simulations")({
  head: () => ({ meta: [{ title: "Simulations — Admin" }] }),
  component: AdminSimulations,
});

function AdminSimulations() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", description: "", category: "", difficulty: "beginner", estimated_minutes: 10, passing_score: 70 });

  const listFn = useServerFn(listAllScenariosAdmin);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-simulations"],
    queryFn: () => listFn(),
    enabled: isAdmin,
  });

  const createFn = useServerFn(createScenario);
  const createMut = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-simulations"] });
      setOpen(false);
      setForm({ title: "", slug: "", description: "", category: "", difficulty: "beginner", estimated_minutes: 10, passing_score: 70 });
      toast.success("Scenario created");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateFn = useServerFn(updateScenario);
  const publishMut = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) => updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-simulations"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteFn = useServerFn(deleteScenario);
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-simulations"] });
      toast.success("Scenario deleted");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return <EmptyState title="Admin access required" description="Only academy administrators can manage simulations." />;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createMut.mutate();
  }

  return (
    <div>
      <PageHeader
        title="Tournament Hall Simulations"
        description="Author 3D-hall incident scenarios: a sequence of stations, each with a ruling choice."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New scenario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New scenario</DialogTitle>
                <DialogDescription>You'll add stations (incidents) after creating it.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setForm((f) => ({
                        ...f,
                        title,
                        slug: f.slug ? f.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                      }));
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    pattern="[a-z0-9-]+"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. rules, conduct" />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated minutes</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.estimated_minutes}
                      onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Passing score (%)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={form.passing_score}
                      onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? "Creating…" : "Create scenario"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState title="No scenarios yet" description="Create your first tournament hall scenario." />
      ) : (
        <div className="space-y-2">
          {data.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <Link to="/admin/simulations/$id" params={{ id: s.id }} className="font-medium text-foreground hover:underline">
                  {s.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.stepCount} station{s.stepCount === 1 ? "" : "s"} · {s.category || "uncategorised"}
                </p>
              </div>
              <Badge variant="outline">{s.difficulty}</Badge>
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.is_published}
                  onCheckedChange={(v) => publishMut.mutate({ id: s.id, is_published: v })}
                />
                <span className="text-xs text-muted-foreground w-16">{s.is_published ? "Published" : "Draft"}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm(`Delete "${s.title}"? This removes all its stations too.`)) deleteMut.mutate(s.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

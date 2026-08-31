import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addCpdRecord, listMyCpd } from "@/lib/license.functions";

export const Route = createFileRoute("/_authenticated/cpd")({
  head: () => ({ meta: [{ title: "CPD Tracker — NCAA Academy" }] }),
  component: CpdPage,
});

const ACTIVITY_TYPES = [
  "Tournament arbiting",
  "Seminar attendance",
  "Training delivery",
  "Course completion",
  "Self-study",
  "Other",
];

function CpdPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyCpd);
  const { data, isLoading } = useQuery({ queryKey: ["my-cpd"], queryFn: () => listFn() });

  const addFn = useServerFn(addCpdRecord);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    activity_type: ACTIVITY_TYPES[0],
    description: "",
    points: 1,
    activity_date: new Date().toISOString().slice(0, 10),
    evidence_url: "",
  });
  const add = useMutation({
    mutationFn: () => {
      const url = form.evidence_url.trim();
      const normalized = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url;
      return addFn({ data: { ...form, evidence_url: normalized } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-cpd"] });
      setOpen(false);
      setForm({ ...form, description: "", points: 1, evidence_url: "" });
      toast.success("CPD activity submitted for review");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const totals = (data ?? []).reduce(
    (acc, r) => {
      const pts = Number(r.points) || 0;
      if (r.status === "approved") acc.approved += pts;
      else if (r.status === "pending") acc.pending += pts;
      return acc;
    },
    { approved: 0, pending: 0 },
  );

  return (
    <div>
      <PageHeader
        title="CPD tracker"
        description="Log continuing professional development activities to maintain your license."
        action={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4" />
            Log activity
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Approved points" value={totals.approved} />
        <Stat label="Pending review" value={totals.pending} />
        <Stat label="Activities logged" value={(data ?? []).length} />
      </div>

      {open && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            add.mutate();
          }}
          className="rounded-xl border border-border bg-card p-5 mb-6 grid gap-4 md:grid-cols-2"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Activity type</label>
            <Select
              value={form.activity_type}
              onValueChange={(v) => setForm({ ...form, activity_type: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={form.activity_date}
              onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              required
              maxLength={2000}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Points requested</label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={form.points}
              onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Evidence URL (optional)</label>
            <Input
              type="text"
              value={form.evidence_url}
              onChange={(e) => setForm({ ...form, evidence_url: e.target.value })}
              placeholder="https://…"
            />
            <p className="text-xs text-muted-foreground">https:// is added automatically if you leave it off.</p>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No CPD activities yet" description="Log your first activity to start tracking points." />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Activity</th>
                <th className="text-left p-3">Description</th>
                <th className="text-right p-3">Points</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{r.activity_date}</td>
                  <td className="p-3 whitespace-nowrap">{r.activity_type}</td>
                  <td className="p-3 max-w-md truncate">{r.description}</td>
                  <td className="p-3 text-right">{Number(r.points)}</td>
                  <td className="p-3"><CpdStatus status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function CpdStatus({ status }: { status: string | null }) {
  const s = status ?? "pending";
  const cls =
    s === "approved"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : s === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{s}</span>;
}
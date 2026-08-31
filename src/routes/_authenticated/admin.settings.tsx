import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSettings, updateSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: SettingsPage,
});

type Settings = {
  platform_name: string;
  support_email: string;
  default_timezone: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  exam_default_duration_minutes: number;
  exam_default_pass_score: number;
  exam_default_max_attempts: number;
  exam_default_cooldown_hours: number;
};

function SettingsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const getFn = useServerFn(getSettings);
  const updateFn = useServerFn(updateSettings);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getFn(),
    enabled: isAdmin,
  });
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (data) setForm(data as unknown as Settings);
  }, [data]);

  const save = useMutation({
    mutationFn: (patch: Partial<Settings>) => updateFn({ data: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only academy administrators can view system settings."
      />
    );
  }

  if (isLoading || !form) {
    return (
      <div>
        <PageHeader title="System settings" description="Platform-wide configuration." />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    save.mutate(form);
  }

  return (
    <div>
      <PageHeader title="System settings" description="Platform-wide configuration." />

      <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">General</h2>

          <div className="space-y-2">
            <Label>Platform name</Label>
            <Input
              value={form.platform_name}
              onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Support email</Label>
            <Input
              type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Default timezone</Label>
            <Input
              value={form.default_timezone}
              onChange={(e) => setForm({ ...form, default_timezone: e.target.value })}
              maxLength={80}
              placeholder="Africa/Lagos"
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Maintenance mode</p>
              <p className="text-xs text-muted-foreground">
                When on, non-admins see a maintenance screen instead of the app.
              </p>
            </div>
            <Switch
              checked={form.maintenance_mode}
              onCheckedChange={(v) => setForm({ ...form, maintenance_mode: v })}
            />
          </div>

          {form.maintenance_mode && (
            <div className="space-y-2">
              <Label>Maintenance message</Label>
              <Textarea
                value={form.maintenance_message}
                onChange={(e) => setForm({ ...form, maintenance_message: e.target.value })}
                maxLength={500}
                rows={3}
              />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Exam defaults</h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Pre-filled when an admin creates a new exam. Existing exams are unaffected.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={600}
                value={form.exam_default_duration_minutes}
                onChange={(e) =>
                  setForm({ ...form, exam_default_duration_minutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Pass score (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.exam_default_pass_score}
                onChange={(e) =>
                  setForm({ ...form, exam_default_pass_score: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max attempts</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.exam_default_max_attempts}
                onChange={(e) =>
                  setForm({ ...form, exam_default_max_attempts: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cooldown (hours)</Label>
              <Input
                type="number"
                min={0}
                max={720}
                value={form.exam_default_cooldown_hours}
                onChange={(e) =>
                  setForm({ ...form, exam_default_cooldown_hours: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

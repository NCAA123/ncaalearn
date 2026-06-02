import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteSeminar, setSeminarPublished } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";
import { NewSeminarDialog } from "@/components/seminars/NewSeminarDialog";

export const Route = createFileRoute("/_authenticated/admin/seminars")({
  head: () => ({ meta: [{ title: "Seminars — Admin" }] }),
  component: AdminSeminars,
});

function AdminSeminars() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-seminars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_seminars")
        .select("id,title,mode,starts_at,ends_at,capacity,is_published")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const pubFn = useServerFn(setSeminarPublished);
  const pubMut = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) => pubFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-seminars"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const delFn = useServerFn(deleteSeminar);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-seminars"] });
      toast.success("Seminar deleted");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isStaff) return <PageHeader title="Seminars" description="Staff access only." />;

  return (
    <div>
      <PageHeader
        title="Seminars"
        description="Schedule and manage live arbiter seminars."
        action={<NewSeminarDialog onCreated={() => qc.invalidateQueries({ queryKey: ["admin-seminars"] })} />}
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No seminars yet" description="Create your first seminar to begin." />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(s.starts_at).toLocaleString()} · {s.mode}
                  {s.capacity ? ` · cap ${s.capacity}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={s.is_published ? "default" : "secondary"}>
                  {s.is_published ? "Published" : "Draft"}
                </Badge>
                <Switch
                  checked={s.is_published}
                  onCheckedChange={(v) => pubMut.mutate({ id: s.id, is_published: !!v })}
                />
                <Link to="/seminars/$id" params={{ id: s.id }} className="text-xs text-primary hover:underline">
                  View
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete "${s.title}"?`)) delMut.mutate(s.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
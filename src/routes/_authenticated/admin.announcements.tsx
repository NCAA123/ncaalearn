import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createAnnouncement, deleteAnnouncement } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Admin" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "candidates" | "arbiters" | "instructors" | "staff">("all");
  const [priority, setPriority] = useState<"info" | "warning" | "critical">("info");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_announcements")
        .select("id,title,body,audience,priority,published_at,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const createFn = useServerFn(createAnnouncement);
  const createMut = useMutation({
    mutationFn: (v: { title: string; body: string; audience: string; priority: string }) => createFn({ data: v }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      setTitle(""); setBody(""); setAudience("all"); setPriority("info");
      const delivered = (r as { delivered?: number } | undefined)?.delivered ?? 0;
      toast.success(delivered > 0 ? `Published and delivered to ${delivered} users` : "Announcement published");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delFn = useServerFn(deleteAnnouncement);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });

  if (!isStaff) return <PageHeader title="Announcements" description="Staff access only." />;

  return (
    <div>
      <PageHeader title="Announcements" description="Broadcast messages to learners and arbiters." />
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!title.trim() || !body.trim()) return;
            createMut.mutate({ title, body, audience, priority });
          }}
          className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit"
        >
          <h3 className="font-semibold">New announcement</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Body</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} required maxLength={5000} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Audience</label>
            <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="candidates">Candidates</SelectItem>
                <SelectItem value="arbiters">Licensed arbiters</SelectItem>
                <SelectItem value="instructors">Instructors</SelectItem>
                <SelectItem value="staff">All staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={createMut.isPending}>
            {createMut.isPending ? "Publishing…" : "Publish"}
          </Button>
        </form>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <EmptyState title="No announcements yet" description="Publish your first announcement using the form on the left." />
          ) : (
            (data ?? []).map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()} · {a.audience}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => delMut.mutate(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{a.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
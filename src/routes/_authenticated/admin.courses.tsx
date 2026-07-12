import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createCourse, deleteCourse, setCoursePublished } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  head: () => ({ meta: [{ title: "Courses — Admin" }] }),
  component: AdminCourses,
});

function AdminCourses() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("candidate");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_courses")
        .select("id,title,slug,level,is_published,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const createFn = useServerFn(createCourse);
  const createMut = useMutation({
    mutationFn: () => createFn({ data: { title, slug, description, level } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      setTitle(""); setSlug(""); setDescription(""); setLevel("candidate");
      toast.success("Course created");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const pubFn = useServerFn(setCoursePublished);
  const pubMut = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) => pubFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
  });

  const delFn = useServerFn(deleteCourse);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
  });

  if (!isStaff) return <PageHeader title="Courses" description="Staff access only." />;

  return (
    <div>
      <PageHeader title="Courses" description="Create courses and toggle their visibility to learners." />
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); if (title && slug) createMut.mutate(); }}
          className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit"
        >
          <h3 className="font-semibold">New course</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Slug</label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} pattern="[a-z0-9-]+" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Level</label>
            <Input value={level} onChange={(e) => setLevel(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={createMut.isPending}>
            {createMut.isPending ? "Creating…" : "Create course"}
          </Button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <EmptyState title="No courses yet" />
          ) : (
            (data ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">/{c.slug} · {c.level}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={c.is_published ? "default" : "secondary"}>{c.is_published ? "Published" : "Draft"}</Badge>
                  <Switch checked={c.is_published} onCheckedChange={(v) => pubMut.mutate({ id: c.id, is_published: !!v })} />
                  <Link to="/admin/courses/$id" params={{ id: c.id }} className="text-xs text-primary hover:underline">Edit</Link>
                  {c.slug && <Link to="/courses/$slug" params={{ slug: c.slug }} className="text-xs text-muted-foreground hover:underline">View</Link>}
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${c.title}"?`)) delMut.mutate(c.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
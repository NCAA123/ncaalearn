import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ChevronLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getCourseStructure,
  createModule,
  updateModule,
  deleteModule,
  upsertLesson,
  deleteLesson,
} from "@/lib/authoring.functions";

export const Route = createFileRoute("/_authenticated/admin/courses/$id")({
  head: () => ({ meta: [{ title: "Edit course — Admin" }] }),
  component: EditCoursePage,
});

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  order_index: number;
  duration_minutes: number | null;
  video_url: string | null;
  pdf_url: string | null;
  body: string | null;
  pgn: string | null;
};

function EditCoursePage() {
  const { id } = Route.useParams();
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const get = useServerFn(getCourseStructure);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-course", id],
    queryFn: () => get({ data: { courseId: id } }),
    enabled: isStaff,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-course", id] });

  const createModFn = useServerFn(createModule);
  const updateModFn = useServerFn(updateModule);
  const delModFn = useServerFn(deleteModule);
  const delLessonFn = useServerFn(deleteLesson);

  const [newModuleTitle, setNewModuleTitle] = useState("");

  const createModMut = useMutation({
    mutationFn: () => createModFn({ data: { courseId: id, title: newModuleTitle.trim() } }),
    onSuccess: () => { setNewModuleTitle(""); invalidate(); toast.success("Module added"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const renameModMut = useMutation({
    mutationFn: (v: { id: string; title: string }) => updateModFn({ data: v }),
    onSuccess: invalidate,
  });
  const delModMut = useMutation({
    mutationFn: (mid: string) => delModFn({ data: { id: mid } }),
    onSuccess: () => { invalidate(); toast.success("Module deleted"); },
  });
  const delLessonMut = useMutation({
    mutationFn: (lid: string) => delLessonFn({ data: { id: lid } }),
    onSuccess: () => { invalidate(); toast.success("Lesson deleted"); },
  });

  if (!isStaff) return <PageHeader title="Edit course" description="Staff access only." />;

  return (
    <div>
      <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ChevronLeft className="h-4 w-4" /> Back to courses
      </Link>
      <PageHeader
        title={data?.course.title ?? (isLoading ? "Loading…" : "Course")}
        description={data?.course.description ?? "Manage modules and lessons for this course."}
      />
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive mb-4">
          {(error as Error).message}
        </div>
      )}

      <form
        onSubmit={(e: FormEvent) => { e.preventDefault(); if (newModuleTitle.trim()) createModMut.mutate(); }}
        className="flex gap-2 mb-6"
      >
        <Input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="New module title" />
        <Button type="submit" disabled={createModMut.isPending || !newModuleTitle.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add module
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data?.modules ?? []).length === 0 ? (
        <EmptyState title="No modules yet" description="Start by adding your first module." />
      ) : (
        <div className="space-y-4">
          {data!.modules.map((m: any) => {
            const lessons: Lesson[] = data!.lessons.filter((l: Lesson) => l.module_id === m.id);
            return (
              <div key={m.id} className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <ModuleTitle
                    initial={m.title}
                    onSave={(t) => renameModMut.mutate({ id: m.id, title: t })}
                  />
                  <div className="flex items-center gap-2">
                    <LessonDialog moduleId={m.id} onSaved={invalidate}>
                      <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Lesson</Button>
                    </LessonDialog>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { if (confirm(`Delete module "${m.title}" and all its lessons?`)) delModMut.mutate(m.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {lessons.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No lessons in this module.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {lessons.map((l) => (
                      <li key={l.id} className="flex items-center justify-between p-4">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{l.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.content_type}{l.duration_minutes ? ` · ${l.duration_minutes} min` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <LessonDialog moduleId={m.id} lesson={l} onSaved={invalidate}>
                            <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                          </LessonDialog>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => { if (confirm(`Delete lesson "${l.title}"?`)) delLessonMut.mutate(l.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModuleTitle({ initial, onSave }: { initial: string; onSave: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initial);
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-left font-semibold hover:text-primary">
        {initial}
      </button>
    );
  }
  return (
    <form
      className="flex gap-2 flex-1"
      onSubmit={(e) => { e.preventDefault(); if (val.trim() && val !== initial) onSave(val.trim()); setEditing(false); }}
    >
      <Input value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
      <Button type="submit" size="sm">Save</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => { setVal(initial); setEditing(false); }}>Cancel</Button>
    </form>
  );
}

function LessonDialog({
  moduleId,
  lesson,
  onSaved,
  children,
}: {
  moduleId: string;
  lesson?: Lesson;
  onSaved: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [contentType, setContentType] = useState(lesson?.content_type ?? "text");
  const [duration, setDuration] = useState(lesson?.duration_minutes?.toString() ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? "");
  const [pdfUrl, setPdfUrl] = useState(lesson?.pdf_url ?? "");
  const [body, setBody] = useState(lesson?.body ?? "");
  const [pgn, setPgn] = useState(lesson?.pgn ?? "");

  const fn = useServerFn(upsertLesson);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          id: lesson?.id,
          module_id: moduleId,
          title: title.trim(),
          content_type: contentType as any,
          duration_minutes: duration ? Number(duration) : null,
          video_url: videoUrl || null,
          pdf_url: pdfUrl || null,
          body: body || null,
          pgn: pgn || null,
        },
      }),
    onSuccess: () => { toast.success(lesson ? "Lesson updated" : "Lesson added"); onSaved(); setOpen(false); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit lesson" : "New lesson"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text / notes</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="pgn">Chess PGN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Duration (min)</label>
              <Input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          {contentType === "video" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Video URL</label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
            </div>
          )}
          {contentType === "pdf" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">PDF URL</label>
              <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://…" />
            </div>
          )}
          {contentType === "pgn" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">PGN</label>
              <Textarea value={pgn} onChange={(e) => setPgn(e.target.value)} rows={6} className="font-mono text-xs" />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes / body</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !title.trim()}>
            {mut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
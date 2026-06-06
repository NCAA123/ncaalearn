import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
  createResource,
  createResourceUploadUrl,
  deleteResource,
  listResources,
} from "@/lib/resources.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/resources")({
  head: () => ({ meta: [{ title: "Resources — Admin" }] }),
  component: AdminResourcesPage,
});

function AdminResourcesPage() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const fetchList = useServerFn(listResources);
  const uploadUrlFn = useServerFn(createResourceUploadUrl);
  const createFn = useServerFn(createResource);
  const deleteFn = useServerFn(deleteResource);

  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [accessLevel, setAccessLevel] = useState<"public" | "candidate" | "arbiter" | "staff">("candidate");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: () => fetchList(),
    enabled: isStaff,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      qc.invalidateQueries({ queryKey: ["academy-resources"] });
      toast.success("Resource deleted");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) return toast.error("Choose a file to upload");
    if (!title.trim()) return toast.error("Title is required");
    if (file.size > 25 * 1024 * 1024) return toast.error("Max file size is 25 MB");

    setUploading(true);
    try {
      const { path, token } = await uploadUrlFn({ data: { filename: file.name } });
      const { error: upErr } = await supabase.storage
        .from("resources")
        .uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (upErr) throw upErr;
      await createFn({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          category: category.trim() || "general",
          access_level: accessLevel,
          file_url: path,
        },
      });
      toast.success("Resource uploaded");
      setTitle("");
      setDescription("");
      setCategory("general");
      if (fileInput.current) fileInput.current.value = "";
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      qc.invalidateQueries({ queryKey: ["academy-resources"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (!isStaff) {
    return <PageHeader title="Resources" description="Staff access only." />;
  }

  return (
    <div>
      <PageHeader
        title="Resource library"
        description="Upload and manage downloadable rules, guides and reference files."
      />

      <form
        onSubmit={handleUpload}
        className="rounded-xl border border-border bg-card p-5 mb-8 grid gap-4 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. rules, openings, endgames"
          />
        </div>
        <div>
          <Label>Access level</Label>
          <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as typeof accessLevel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public (all signed-in users)</SelectItem>
              <SelectItem value="candidate">Candidates and above</SelectItem>
              <SelectItem value="arbiter">Licensed arbiters only</SelectItem>
              <SelectItem value="staff">Staff only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="file">File (max 25 MB)</Label>
          <Input id="file" type="file" ref={fileInput} required />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading…" : "Upload resource"}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Downloads</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No resources uploaded yet.
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.title}</div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs capitalize">{r.category ?? "general"}</TableCell>
                  <TableCell className="text-xs capitalize">{r.access_level ?? "candidate"}</TableCell>
                  <TableCell className="text-xs">{r.download_count ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={delMut.isPending}
                      onClick={() => {
                        if (confirm(`Delete "${r.title}"?`)) delMut.mutate(r.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
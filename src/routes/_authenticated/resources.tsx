import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createResourceSignedUrl, listResources } from "@/lib/resources.functions";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({ meta: [{ title: "Resources — NCAA Academy" }] }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const fetchList = useServerFn(listResources);
  const signFn = useServerFn(createResourceSignedUrl);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["academy-resources"],
    queryFn: () => fetchList(),
  });

  const download = useMutation({
    mutationFn: (id: string) => signFn({ data: { id } }),
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r) => r.category && set.add(r.category));
    return ["all", ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title?.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, category]);

  return (
    <div>
      <PageHeader
        title="Resource library"
        description="Rules, guides and reference materials curated by the NCAA Academy."
        action={
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search resources…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`text-xs rounded-full border px-3 py-1 transition ${
              category === c
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No resources match your filters yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate">{r.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {r.category ?? "general"} · {r.download_count ?? 0} downloads
                  </div>
                </div>
                {r.access_level && r.access_level !== "public" && (
                  <Badge variant="secondary" className="text-[10px]">{r.access_level}</Badge>
                )}
              </div>
              {r.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{r.description}</p>
              )}
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={download.isPending}
                  onClick={() => download.mutate(r.id)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, type FormEvent } from "react";
import { Search, BookOpen, PlayCircle, GraduationCap, FolderOpen, IdCard } from "lucide-react";
import { z } from "zod";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { globalSearch, type SearchHit } from "@/lib/search.functions";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — NCAA Academy" }] }),
  validateSearch: searchSchema,
  component: SearchPage,
});

const iconFor = (k: SearchHit["kind"]) =>
  k === "course" ? BookOpen
    : k === "lesson" ? PlayCircle
    : k === "seminar" ? GraduationCap
    : k === "resource" ? FolderOpen
    : IdCard;

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const initial = search.q ?? "";
  const [term, setTerm] = useState(initial);
  useEffect(() => { setTerm(search.q ?? ""); }, [search.q]);

  const fn = useServerFn(globalSearch);
  const query = search.q?.trim() ?? "";
  const { data, isFetching, error } = useQuery({
    queryKey: ["search", query],
    queryFn: () => fn({ data: { q: query } }),
    enabled: query.length >= 2,
  });

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find courses, lessons, seminars, resources and licensed arbiters."
      />
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const q = term.trim();
          navigate({ search: q ? { q } : {} });
        }}
        className="flex gap-2 mb-6"
      >
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search the academy…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      {query.length < 2 ? (
        <EmptyState title="Type at least 2 characters" description="Start typing and press enter." />
      ) : isFetching ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : (data?.hits.length ?? 0) === 0 ? (
        <EmptyState title="No results" description={`Nothing matched "${query}".`} />
      ) : (
        <div className="space-y-2">
          {data!.hits.map((h) => {
            const Icon = iconFor(h.kind);
            return (
              <Link
                key={`${h.kind}:${h.id}`}
                to={h.link}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/60 transition"
              >
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{h.title}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{h.kind}</Badge>
                  </div>
                  {h.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{h.subtitle}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
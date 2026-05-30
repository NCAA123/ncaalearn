import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({ meta: [{ title: "Courses — NCAA Academy" }] }),
  component: CoursesPage,
});

function CoursesPage() {
  const { data } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("academy_courses").select("*").eq("is_published", true).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <>
      <PageHeader title="Course catalog" description="Browse and enrol in arbiter training courses." />
      {data && data.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-[var(--shadow-elegant)] transition">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3"><BookOpen className="h-5 w-5" /></div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.level}</div>
              <h3 className="font-semibold text-foreground mt-1">{c.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No published courses yet" description="Once admins publish courses, they will appear here. Sprint 2 ships the course viewer." />
      )}
    </>
  );
}
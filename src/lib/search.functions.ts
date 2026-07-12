import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SearchHit = {
  kind: "course" | "lesson" | "seminar" | "resource" | "arbiter";
  id: string;
  title: string;
  subtitle?: string | null;
  link: string;
};

export const globalSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) =>
    z.object({ q: z.string().trim().min(2).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const q = data.q;
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;

    const [courses, lessons, seminars, resources, arbiters] = await Promise.all([
      supabaseAdmin
        .from("academy_courses")
        .select("id,title,slug,description,level,is_published")
        .eq("is_published", true)
        .ilike("title", like)
        .limit(10),
      supabaseAdmin
        .from("academy_lessons")
        .select("id,title,module_id,academy_modules!inner(course_id,title,academy_courses!inner(slug,title,is_published))")
        .ilike("title", like)
        .limit(10),
      supabaseAdmin
        .from("academy_seminars")
        .select("id,title,description,starts_at")
        .ilike("title", like)
        .limit(10),
      supabaseAdmin
        .from("academy_resources")
        .select("id,title,description")
        .ilike("title", like)
        .limit(10),
      supabaseAdmin
        .from("academy_licenses")
        .select("id,user_id,license_number,title,status,academy_profiles!inner(first_name,last_name)")
        .eq("status", "active")
        .or(`license_number.ilike.${like},title.ilike.${like}`)
        .limit(10),
    ]);

    const hits: SearchHit[] = [];

    for (const c of courses.data ?? []) {
      hits.push({
        kind: "course",
        id: c.id as string,
        title: c.title as string,
        subtitle: (c.description as string | null) ?? (c.level as string | null),
        link: `/courses/${c.slug}`,
      });
    }
    for (const l of lessons.data ?? []) {
      const mod = (l as any).academy_modules;
      const course = mod?.academy_courses;
      if (!course?.is_published) continue;
      hits.push({
        kind: "lesson",
        id: l.id as string,
        title: l.title as string,
        subtitle: `${course.title} · ${mod.title}`,
        link: `/courses/${course.slug}/lessons/${l.id}`,
      });
    }
    for (const s of seminars.data ?? []) {
      hits.push({
        kind: "seminar",
        id: s.id as string,
        title: s.title as string,
        subtitle: (s.description as string | null) ?? null,
        link: `/seminars/${s.id}`,
      });
    }
    for (const r of resources.data ?? []) {
      hits.push({
        kind: "resource",
        id: r.id as string,
        title: r.title as string,
        subtitle: (r.description as string | null) ?? null,
        link: `/resources`,
      });
    }
    for (const a of arbiters.data ?? []) {
      const p = (a as any).academy_profiles;
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Licensed arbiter";
      hits.push({
        kind: "arbiter",
        id: a.id as string,
        title: name,
        subtitle: `${a.title} · ${a.license_number}`,
        link: `/registry`,
      });
    }

    return { query: q, hits };
  });
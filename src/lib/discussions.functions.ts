import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listSchema = z.object({ courseId: z.string().uuid() });
const postSchema = z.object({
  courseId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  parentId: z.string().uuid().nullable().optional(),
});
const deleteSchema = z.object({ id: z.string().uuid() });

export const listDiscussions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("academy_discussions")
      .select("id, course_id, user_id, parent_id, body, created_at, updated_at")
      .eq("course_id", data.courseId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("academy_profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", userIds);
      for (const p of profs ?? []) {
        const full =
          [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null;
        profiles[p.id as string] = {
          full_name: full,
          avatar_url: p.avatar_url ?? null,
        };
      }
    }
    return (rows ?? []).map((r) => ({
      ...r,
      author: profiles[r.user_id] ?? { full_name: null, avatar_url: null },
    }));
  });

export const postDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => postSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("academy_discussions")
      .insert({
        course_id: data.courseId,
        user_id: userId,
        parent_id: data.parentId ?? null,
        body: data.body,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("academy_discussions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
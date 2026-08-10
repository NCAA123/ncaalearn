import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { saveSeminar } from "@/lib/seminars.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TYPES = [
  { v: "na_seminar", l: "NA Seminar" },
  { v: "fa_seminar", l: "FA Seminar" },
  { v: "workshop", l: "Workshop" },
  { v: "webinar", l: "Webinar" },
  { v: "refresher", l: "Refresher" },
];

const ROLES = ["candidate", "national_arbiter", "fide_arbiter", "international_arbiter", "instructor"];

function toLocalInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

type SeminarRow = Record<string, any>;

export function NewSeminarDialog({
  trigger,
  onCreated,
  seminar,
}: {
  trigger: ReactNode;
  onCreated?: () => void;
  seminar?: SeminarRow | null;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const save = useServerFn(saveSeminar);

  const [form, setForm] = useState(() => ({
    title: seminar?.title ?? "",
    seminar_type: seminar?.seminar_type ?? "workshop",
    description: seminar?.description ?? "",
    mode: (seminar?.mode ?? "online") as "online" | "in_person" | "hybrid",
    level: seminar?.level ?? "",
    lead_instructor_id: seminar?.lead_instructor_id ?? "",
    co_instructor_ids: (seminar?.co_instructor_ids ?? []) as string[],
    starts_at: toLocalInput(seminar?.starts_at),
    ends_at: toLocalInput(seminar?.ends_at),
    registration_deadline: toLocalInput(seminar?.registration_deadline),
    timezone: seminar?.timezone ?? "Africa/Lagos",
    venue_name: seminar?.venue_name ?? "",
    address: seminar?.address ?? "",
    state: seminar?.state ?? "",
    maps_url: seminar?.maps_url ?? "",
    location: seminar?.location ?? "",
    platform: seminar?.platform ?? "Zoom",
    meeting_url: seminar?.meeting_url ?? "",
    meeting_id: seminar?.meeting_id ?? "",
    meeting_password: seminar?.meeting_password ?? "",
    capacity: seminar?.capacity != null ? String(seminar.capacity) : "",
    waitlist_capacity: seminar?.waitlist_capacity != null ? String(seminar.waitlist_capacity) : "",
    fee_amount: String(seminar?.fee_amount ?? 0),
    currency: seminar?.currency ?? "NGN",
    sponsored_by: seminar?.sponsored_by ?? "",
    exam_id: seminar?.exam_id ?? "",
    cpd_points: String(seminar?.cpd_points ?? 0),
    cpd_category: seminar?.cpd_category ?? "",
    prerequisites_text: seminar?.prerequisites_text ?? "",
    prerequisite_course_ids: (seminar?.prerequisite_course_ids ?? []) as string[],
    eligible_roles: (seminar?.eligible_roles ?? []) as string[],
    banner_url: seminar?.banner_url ?? "",
    min_attendance_percent: String(seminar?.min_attendance_percent ?? 80),
    is_published: seminar?.is_published ?? true,
  }));

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const { data: staff } = useQuery({
    queryKey: ["staff-options"],
    enabled: open,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("academy_user_roles")
        .select("user_id,role")
        .in("role", ["instructor", "fide_arbiter", "international_arbiter", "academy_admin", "super_admin"]);
      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      if (!ids.length) return [] as { id: string; name: string }[];
      const { data: profs } = await supabase.from("academy_profiles").select("id,first_name,last_name,email").in("id", ids);
      return (profs ?? []).map((p: any) => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.email || p.id.slice(0, 8),
      }));
    },
  });

  const { data: exams } = useQuery({
    queryKey: ["exam-options"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("academy_exams").select("id,title").order("title");
      return data ?? [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["course-options"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("academy_courses").select("id,title").order("title");
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.starts_at || !form.ends_at) throw new Error("Title, start and end are required");
      return save({
        data: {
          id: seminar?.id ?? null,
          title: form.title,
          seminar_type: form.seminar_type,
          description: form.description || null,
          mode: form.mode,
          level: form.level || null,
          lead_instructor_id: form.lead_instructor_id || user?.id || null,
          co_instructor_ids: form.co_instructor_ids,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
          registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
          timezone: form.timezone,
          venue_name: form.venue_name || null,
          address: form.address || null,
          state: form.state || null,
          maps_url: form.maps_url || null,
          location: form.location || form.venue_name || null,
          platform: form.platform || null,
          meeting_url: form.meeting_url || null,
          meeting_id: form.meeting_id || null,
          meeting_password: form.meeting_password || null,
          capacity: form.capacity ? Number(form.capacity) : null,
          waitlist_capacity: form.waitlist_capacity ? Number(form.waitlist_capacity) : null,
          fee_amount: Number(form.fee_amount || 0),
          currency: form.currency,
          sponsored_by: form.sponsored_by || null,
          exam_id: form.exam_id || null,
          cpd_points: Number(form.cpd_points || 0),
          cpd_category: form.cpd_category || null,
          prerequisites_text: form.prerequisites_text || null,
          prerequisite_course_ids: form.prerequisite_course_ids,
          eligible_roles: form.eligible_roles,
          banner_url: form.banner_url || null,
          min_attendance_percent: Number(form.min_attendance_percent || 80),
          is_published: form.is_published,
        },
      });
    },
    onSuccess: () => {
      toast.success(seminar ? "Seminar updated" : "Seminar created");
      setOpen(false);
      onCreated?.();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save seminar"),
  });

  const online = form.mode !== "in_person";
  const physical = form.mode !== "online";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{seminar ? "Edit seminar" : "New seminar"}</DialogTitle></DialogHeader>

        <Section title="Basic info">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.seminar_type} onValueChange={(v) => set({ seminar_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Format">
              <Select value={form.mode} onValueChange={(v: any) => set({ mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in_person">Physical</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lead instructor">
              <Select value={form.lead_instructor_id || "none"} onValueChange={(v) => set({ lead_instructor_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Me</SelectItem>
                  {(staff ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Level (optional)">
              <Input value={form.level} onChange={(e) => set({ level: e.target.value })} placeholder="e.g. NA, FA" />
            </Field>
          </div>
          <Field label="Co-instructors">
            <MultiToggle
              options={(staff ?? []).map((s) => ({ value: s.id, label: s.name }))}
              selected={form.co_instructor_ids}
              onChange={(v) => set({ co_instructor_ids: v })}
              empty="No staff found"
            />
          </Field>
        </Section>

        <Section title="Schedule">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><Input type="datetime-local" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} /></Field>
            <Field label="Ends"><Input type="datetime-local" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration deadline">
              <Input type="datetime-local" value={form.registration_deadline} onChange={(e) => set({ registration_deadline: e.target.value })} />
            </Field>
            <Field label="Timezone"><Input value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} /></Field>
          </div>
        </Section>

        {physical && (
          <Section title="Location">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Venue name"><Input value={form.venue_name} onChange={(e) => set({ venue_name: e.target.value })} /></Field>
              <Field label="State"><Input value={form.state} onChange={(e) => set({ state: e.target.value })} /></Field>
            </div>
            <Field label="Full address"><Textarea rows={2} value={form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
            <Field label="Google Maps link"><Input value={form.maps_url} onChange={(e) => set({ maps_url: e.target.value })} placeholder="https://maps.google.com/…" /></Field>
          </Section>
        )}

        {online && (
          <Section title="Online details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Platform">
                <Select value={form.platform} onValueChange={(v) => set({ platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Zoom", "Google Meet", "Microsoft Teams", "Other"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Meeting ID"><Input value={form.meeting_id} onChange={(e) => set({ meeting_id: e.target.value })} /></Field>
            </div>
            <Field label="Meeting URL"><Input value={form.meeting_url} onChange={(e) => set({ meeting_url: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Meeting password"><Input value={form.meeting_password} onChange={(e) => set({ meeting_password: e.target.value })} /></Field>
          </Section>
        )}

        <Section title="Capacity & fees">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maximum capacity (blank = unlimited)"><Input type="number" min={1} value={form.capacity} onChange={(e) => set({ capacity: e.target.value })} /></Field>
            <Field label="Waitlist capacity (blank = none)"><Input type="number" min={1} value={form.waitlist_capacity} onChange={(e) => set({ waitlist_capacity: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Fee (0 = free)"><Input type="number" min={0} step="0.01" value={form.fee_amount} onChange={(e) => set({ fee_amount: e.target.value })} /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={(e) => set({ currency: e.target.value })} /></Field>
            <Field label="Sponsored by"><Input value={form.sponsored_by} onChange={(e) => set({ sponsored_by: e.target.value })} /></Field>
          </div>
        </Section>

        <Section title="Exam, CPD & eligibility">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Linked certification exam">
              <Select value={form.exam_id || "none"} onValueChange={(v) => set({ exam_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(exams ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Minimum attendance %">
              <Input type="number" min={0} max={100} value={form.min_attendance_percent} onChange={(e) => set({ min_attendance_percent: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CPD points"><Input type="number" min={0} value={form.cpd_points} onChange={(e) => set({ cpd_points: e.target.value })} /></Field>
            <Field label="CPD category"><Input value={form.cpd_category} onChange={(e) => set({ cpd_category: e.target.value })} placeholder="e.g. seminar" /></Field>
          </div>
          <Field label="Eligible roles (blank = everyone)">
            <MultiToggle
              options={ROLES.map((r) => ({ value: r, label: r.replace(/_/g, " ") }))}
              selected={form.eligible_roles}
              onChange={(v) => set({ eligible_roles: v })}
            />
          </Field>
        </Section>

        <Section title="Content">
          <Field label="Description"><Textarea rows={4} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
          <Field label="Prerequisites (notes)"><Textarea rows={2} value={form.prerequisites_text} onChange={(e) => set({ prerequisites_text: e.target.value })} /></Field>
          <Field label="Required courses">
            <MultiToggle
              options={(courses ?? []).map((c: any) => ({ value: c.id, label: c.title }))}
              selected={form.prerequisite_course_ids}
              onChange={(v) => set({ prerequisite_course_ids: v })}
              empty="No courses yet"
            />
          </Field>
          <Field label="Banner image URL"><Input value={form.banner_url} onChange={(e) => set({ banner_url: e.target.value })} placeholder="https://…" /></Field>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={form.is_published} onChange={(e) => set({ is_published: e.target.checked })} />
            Publish immediately
          </label>
          <p className="text-xs text-muted-foreground">
            Pre- and post-seminar materials are managed from the seminar's admin page after it is created.
          </p>
        </Section>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Saving…" : seminar ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MultiToggle({
  options,
  selected,
  onChange,
  empty = "None available",
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  empty?: string;
}) {
  if (!options.length) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
            className={
              "px-2.5 py-1 rounded-md text-xs border capitalize transition " +
              (on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

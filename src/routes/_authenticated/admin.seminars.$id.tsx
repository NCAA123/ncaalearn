import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, QrCode, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { NewSeminarDialog } from "@/components/seminars/NewSeminarDialog";
import {
  listParticipants, markAttendance, checkInByToken, importAttendanceCsv,
  setExamUnlock, messageParticipants, saveMaterial, deleteMaterial,
} from "@/lib/seminars.functions";

export const Route = createFileRoute("/_authenticated/admin/seminars/$id")({
  head: () => ({ meta: [{ title: "Manage seminar — Admin" }] }),
  component: ManageSeminar,
});

const TABS = ["participants", "materials", "exam", "communications"] as const;
type Tab = (typeof TABS)[number];

function ManageSeminar() {
  const { id } = Route.useParams();
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("participants");

  const { data: seminar } = useQuery({
    queryKey: ["seminar", id],
    queryFn: async () => {
      const { data } = await supabase.from("academy_seminars").select("*").eq("id", id).maybeSingle();
      return data as any;
    },
  });

  const listFn = useServerFn(listParticipants);
  const { data: participants, isLoading } = useQuery({
    queryKey: ["seminar-participants", id],
    enabled: isStaff,
    queryFn: () => listFn({ data: { seminarId: id } }) as Promise<any[]>,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["seminar-participants", id] });

  if (!isStaff) return <PageHeader title="Seminar" description="Staff access only." />;

  return (
    <div>
      <Link to="/admin/seminars" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Seminars
      </Link>
      <PageHeader
        title={seminar?.title ?? "Seminar"}
        description={seminar ? `${new Date(seminar.starts_at).toLocaleString()} · ${String(seminar.mode).replace("_", " ")}` : ""}
        action={seminar ? (
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/seminars/$id" params={{ id }}>View</Link></Button>
            <NewSeminarDialog
              seminar={seminar}
              trigger={<Button>Edit</Button>}
              onCreated={() => qc.invalidateQueries({ queryKey: ["seminar", id] })}
            />
          </div>
        ) : undefined}
      />

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "px-3 py-1.5 rounded-md text-xs font-medium border capitalize transition " +
              (tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "participants" && (
        <ParticipantsTab id={id} seminar={seminar} rows={participants ?? []} loading={isLoading} onChange={refresh} />
      )}
      {tab === "materials" && <MaterialsTab id={id} />}
      {tab === "exam" && <ExamTab seminar={seminar} rows={participants ?? []} onChange={refresh} />}
      {tab === "communications" && <CommsTab id={id} />}
    </div>
  );
}

function ParticipantsTab({ id, seminar, rows, loading, onChange }: { id: string; seminar: any; rows: any[]; loading: boolean; onChange: () => void }) {
  const [token, setToken] = useState("");
  const [csv, setCsv] = useState("");
  const checkFn = useServerFn(checkInByToken);
  const attendFn = useServerFn(markAttendance);
  const csvFn = useServerFn(importAttendanceCsv);

  const checkMut = useMutation({
    mutationFn: () => checkFn({ data: { seminarId: id, token: token.trim() } }),
    onSuccess: (r: any) => { toast.success(r.alreadyCheckedIn ? "Already checked in" : "Checked in"); setToken(""); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  const attendMut = useMutation({
    mutationFn: (v: { registrationId: string; attendance_percent: number }) => attendFn({ data: v }),
    onSuccess: (r: any) => { toast.success(`Attendance saved${r.unlocked ? " — exam unlocked" : ""}`); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  const csvMut = useMutation({
    mutationFn: () => csvFn({ data: { seminarId: id, csv } }),
    onSuccess: (r: any) => {
      toast.success(`${r.updated} attendance records updated${r.unmatched.length ? `, ${r.unmatched.length} unmatched` : ""}`);
      setCsv("");
      onChange();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts = useMemo(() => ({
    registered: rows.filter((r) => r.status === "registered").length,
    waitlisted: rows.filter((r) => r.status === "waitlisted").length,
    checkedIn: rows.filter((r) => r.checked_in_at).length,
  }), [rows]);

  const exportCsv = () => {
    const header = "name,email,status,payment,attendance_percent,checked_in,exam_unlocked";
    const body = rows.map((r) =>
      [r.profile.name, r.profile.email ?? "", r.status, r.payment_status, r.attendance_percent ?? "", r.checked_in_at ?? "", r.exam_unlocked]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    );
    const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `participants-${id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Registered" value={counts.registered} />
        <Stat label="Waitlisted" value={counts.waitlisted} />
        <Stat label="Checked in" value={counts.checkedIn} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>QR check-in code</Label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Scan or paste the participant code" />
          </div>
          <Button onClick={() => checkMut.mutate()} disabled={!token.trim() || checkMut.isPending}>
            <QrCode className="h-4 w-4 mr-1.5" />Check in
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label>Attendance CSV (columns: email, attendance_percent or minutes)</Label>
          <Textarea rows={3} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="email,attendance_percent&#10;user@example.com,85" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => csvMut.mutate()} disabled={!csv.trim() || csvMut.isPending}>
              <Upload className="h-4 w-4 mr-1.5" />Import attendance
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1.5" />Export participants
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No registrations yet" description="Participants appear here once they register." />
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.profile.name}</div>
                <div className="text-xs text-muted-foreground truncate">{r.profile.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{r.status}</Badge>
                <Badge variant={r.payment_status === "paid" ? "default" : "secondary"} className="capitalize">{String(r.payment_status).replace("_", " ")}</Badge>
                {r.checked_in_at && <Badge variant="secondary">Checked in</Badge>}
                <Input
                  className="w-24 h-8"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={r.attendance_percent ?? ""}
                  placeholder="%"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (e.target.value !== "" && v !== Number(r.attendance_percent)) {
                      attendMut.mutate({ registrationId: r.id, attendance_percent: v });
                    }
                  }}
                />
                <Badge variant={r.exam_unlocked ? "default" : "outline"}>{r.exam_unlocked ? "Exam open" : "Exam locked"}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
      {seminar?.min_attendance_percent != null && (
        <p className="text-xs text-muted-foreground">Minimum attendance for exam access: {seminar.min_attendance_percent}%</p>
      )}
    </div>
  );
}

function MaterialsTab({ id }: { id: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", file_url: "", visibility: "pre" as "pre" | "post" | "public" });
  const saveFn = useServerFn(saveMaterial);
  const delFn = useServerFn(deleteMaterial);

  const { data } = useQuery({
    queryKey: ["seminar-materials", id],
    queryFn: async () => {
      const { data } = await supabase.from("academy_seminar_materials").select("*").eq("seminar_id", id).order("created_at");
      return (data ?? []) as any[];
    },
  });

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { seminar_id: id, ...form } }),
    onSuccess: () => {
      toast.success("Material added");
      setForm({ title: "", file_url: "", visibility: "pre" });
      qc.invalidateQueries({ queryKey: ["seminar-materials", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (mid: string) => delFn({ data: { id: mid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seminar-materials", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 grid sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1.5 sm:col-span-1">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>File URL</Label>
          <Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://…" />
        </div>
        <div className="space-y-1.5">
          <Label>Visibility</Label>
          <Select value={form.visibility} onValueChange={(v: any) => setForm({ ...form, visibility: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pre">Pre-seminar</SelectItem>
              <SelectItem value="post">Post-seminar</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-4">
          <Button onClick={() => saveMut.mutate()} disabled={!form.title || !form.file_url || saveMut.isPending}>Add material</Button>
        </div>
      </div>

      {(data ?? []).length === 0 ? (
        <EmptyState title="No materials" description="Attach reading or recordings for participants." />
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {(data ?? []).map((m) => (
            <div key={m.id} className="p-3 flex items-center justify-between gap-3">
              <a href={m.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate">{m.title}</a>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{m.visibility}</Badge>
                <Button variant="ghost" size="icon" onClick={() => delMut.mutate(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExamTab({ seminar, rows, onChange }: { seminar: any; rows: any[]; onChange: () => void }) {
  const unlockFn = useServerFn(setExamUnlock);
  const mut = useMutation({
    mutationFn: (v: { registrationId: string; unlocked: boolean }) => unlockFn({ data: v }),
    onSuccess: () => { toast.success("Exam access updated"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!seminar?.exam_id) {
    return <EmptyState title="No exam linked" description="Attach a certification exam in the seminar settings." />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Participants need at least {seminar.min_attendance_percent}% attendance. You can override individual cases on appeal.
      </p>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{r.profile.name}</div>
              <div className="text-xs text-muted-foreground">
                Attendance {r.attendance_percent != null ? `${r.attendance_percent}%` : "not recorded"}
              </div>
            </div>
            <Button size="sm" variant={r.exam_unlocked ? "outline" : "default"} onClick={() => mut.mutate({ registrationId: r.id, unlocked: !r.exam_unlocked })}>
              {r.exam_unlocked ? "Lock exam" : "Unlock exam"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommsTab({ id }: { id: string }) {
  const [form, setForm] = useState({ title: "", body: "", audience: "all" as "all" | "registered" | "waitlisted" });
  const sendFn = useServerFn(messageParticipants);
  const mut = useMutation({
    mutationFn: () => sendFn({ data: { seminarId: id, ...form } }),
    onSuccess: (r: any) => { toast.success(`Sent to ${r.sent} participant(s)`); setForm({ ...form, title: "", body: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 max-w-2xl">
      <div className="space-y-1.5">
        <Label>Audience</Label>
        <Select value={form.audience} onValueChange={(v: any) => setForm({ ...form, audience: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="registered">Registered only</SelectItem>
            <SelectItem value="waitlisted">Waitlist only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Message</Label>
        <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </div>
      <Button onClick={() => mut.mutate()} disabled={!form.title || !form.body || mut.isPending}>
        {mut.isPending ? "Sending…" : "Send notification"}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

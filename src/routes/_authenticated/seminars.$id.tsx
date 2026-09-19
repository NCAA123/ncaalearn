import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, MapPin, Video, Users, ExternalLink, CheckCircle2,
  CalendarPlus, Banknote, Award, FileText, Lock, Unlock, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { buildIcs, downloadIcs } from "@/lib/ics";
import {
  registerForSeminar, cancelRegistration, acceptWaitlistOffer,
} from "@/lib/seminars.functions";
import { initiateSeminarPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/seminars/$id")({
  head: () => ({ meta: [{ title: "Seminar — NCAA Academy" }] }),
  component: SeminarDetailPage,
});

function SeminarDetailPage() {
  const { id } = Route.useParams();
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const [missing, setMissing] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [qr, setQr] = useState<string | null>(null);

  const { data: seminar, isLoading } = useQuery({
    queryKey: ["seminar", id],
    queryFn: async () => {
      const { data } = await supabase.from("academy_seminars").select("*").eq("id", id).maybeSingle();
      return data as any;
    },
  });

  const { data: registration } = useQuery({
    queryKey: ["seminar-reg", user?.id, id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_seminar_registrations")
        .select("*")
        .eq("seminar_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: registrations } = useQuery({
    queryKey: ["seminar-regs", id],
    enabled: !!seminar,
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_seminar_registrations")
        .select("id,status,user_id")
        .eq("seminar_id", id);
      return (data ?? []) as any[];
    },
  });

  const { data: materials } = useQuery({
    queryKey: ["seminar-materials", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("academy_seminar_materials")
        .select("*")
        .eq("seminar_id", id)
        .order("created_at");
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (registration?.qr_token && registration.status === "registered") {
      QRCode.toDataURL(String(registration.qr_token), { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null));
    } else {
      setQr(null);
    }
  }, [registration?.qr_token, registration?.status]);

  const registerFn = useServerFn(registerForSeminar);
  const cancelFn = useServerFn(cancelRegistration);
  const acceptFn = useServerFn(acceptWaitlistOffer);
  const payFn = useServerFn(initiateSeminarPayment);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["seminar-reg", user?.id, id] });
    qc.invalidateQueries({ queryKey: ["seminar-regs", id] });
    qc.invalidateQueries({ queryKey: ["my-seminar-regs"] });
  };

  const registerMut = useMutation({
    mutationFn: () => registerFn({ data: { seminarId: id } }),
    onSuccess: (res: any) => {
      if (!res.ok && res.reason === "prerequisites") {
        setMissing(res.missing);
        toast.error("You still have required courses to complete");
        return;
      }
      setMissing([]);
      if (res.paymentRequired) toast.info(`Payment of ${res.currency} ${res.amount} required to confirm your place`);
      else toast.success(res.status === "waitlisted" ? `Added to waitlist (position ${res.waitlistPosition})` : "Registered — see you there!");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not register"),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelFn({ data: { seminarId: id } }),
    onSuccess: () => { toast.success("Registration cancelled"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Could not cancel"),
  });

  const acceptMut = useMutation({
    mutationFn: () => acceptFn({ data: { seminarId: id } }),
    onSuccess: (r: any) => {
      toast.success(r.paymentRequired ? "Spot claimed — complete payment to confirm" : "Spot confirmed");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not accept offer"),
  });

  const payMut = useMutation({
    mutationFn: () => payFn({ data: { registrationId: registration!.id } }),
    onSuccess: (r: { authorizationUrl: string }) => {
      window.location.href = r.authorizationUrl;
    },
    onError: (e: any) => toast.error(e.message ?? "Could not start payment"),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!seminar) {
    return (
      <EmptyState
        title="Seminar not found"
        description="It may have been removed."
        action={<Button asChild variant="outline"><Link to="/seminars">Back to seminars</Link></Button>}
      />
    );
  }

  const start = new Date(seminar.starts_at);
  const end = new Date(seminar.ends_at);
  const isPast = end.getTime() < Date.now();
  const registeredCount = (registrations ?? []).filter((r) => r.status === "registered").length;
  const waitlistCount = (registrations ?? []).filter((r) => r.status === "waitlisted").length;
  const capacityFull = !!seminar.capacity && registeredCount >= seminar.capacity;
  const deadlinePassed = seminar.registration_deadline && new Date(seminar.registration_deadline).getTime() < Date.now();
  const fee = Number(seminar.fee_amount ?? 0);
  const active = registration && registration.status !== "cancelled";
  const paymentPending = active && registration.payment_status === "pending";
  const visibleMaterials = (materials ?? []).filter((m) =>
    m.visibility === "public" || (active && m.visibility === "pre") || (active && m.visibility === "post" && isPast),
  );

  const addToCalendar = () => {
    downloadIcs(
      seminar.title,
      buildIcs({
        uid: seminar.id,
        title: seminar.title,
        description: seminar.description,
        location: seminar.venue_name || seminar.location || seminar.meeting_url,
        url: seminar.meeting_url,
        start: seminar.starts_at,
        end: seminar.ends_at,
      }),
    );
  };

  return (
    <>
      <Link to="/seminars" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Seminars
      </Link>

      {seminar.banner_url && (
        <img src={seminar.banner_url} alt={`${seminar.title} banner`} className="w-full h-44 object-cover rounded-xl border border-border mb-4" />
      )}

      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className="capitalize">{String(seminar.mode).replace("_", " ")}</Badge>
              <Badge variant="outline" className="capitalize">{String(seminar.seminar_type ?? "").replace(/_/g, " ")}</Badge>
              {seminar.level && <Badge variant="outline">{seminar.level}</Badge>}
              {fee > 0 && <Badge variant="secondary">{seminar.currency} {fee.toLocaleString()}</Badge>}
              {(seminar.cpd_points ?? 0) > 0 && <Badge variant="outline">{seminar.cpd_points} CPD</Badge>}
              {!seminar.is_published && <Badge variant="outline">Draft</Badge>}
              {isPast && <Badge variant="secondary">Past</Badge>}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{seminar.title}</h1>
            {seminar.description && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{seminar.description}</p>}
            {seminar.sponsored_by && <p className="text-xs text-muted-foreground mt-2">Sponsored by {seminar.sponsored_by}</p>}
          </div>

          <div className="flex flex-col gap-2 min-w-[240px]">
            {active ? (
              <>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="capitalize">{registration.status}</span>
                  {registration.status === "waitlisted" && registration.waitlist_position && (
                    <span className="text-muted-foreground">· position {registration.waitlist_position}</span>
                  )}
                </div>
                {registration.status === "offered" && (
                  <Button onClick={() => acceptMut.mutate()} disabled={acceptMut.isPending}>
                    Confirm my spot{registration.offer_expires_at ? ` (by ${new Date(registration.offer_expires_at).toLocaleDateString()})` : ""}
                  </Button>
                )}
                {paymentPending && (
                  <Button onClick={() => payMut.mutate()} disabled={payMut.isPending}>
                    <Banknote className="h-4 w-4 mr-1.5" />
                    Pay {seminar.currency} {fee.toLocaleString()}
                  </Button>
                )}
                {registration.status === "registered" && seminar.meeting_url && !isPast && (
                  <Button asChild>
                    <a href={seminar.meeting_url} target="_blank" rel="noreferrer">Join <ExternalLink className="h-4 w-4 ml-1.5" /></a>
                  </Button>
                )}
                <Button variant="outline" onClick={addToCalendar}><CalendarPlus className="h-4 w-4 mr-1.5" />Add to calendar</Button>
                {!isPast && (
                  <Button variant="ghost" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
                    {cancelMut.isPending ? "Cancelling…" : "Cancel registration"}
                  </Button>
                )}
              </>
            ) : isPast || deadlinePassed ? (
              <Button disabled>Registration closed</Button>
            ) : (
              <Button onClick={() => registerMut.mutate()} disabled={registerMut.isPending}>
                {registerMut.isPending ? "Registering…" : capacityFull ? "Join waitlist" : fee > 0 ? `Register · ${seminar.currency} ${fee.toLocaleString()}` : "Register"}
              </Button>
            )}
            {isStaff && (
              <Button asChild variant="outline">
                <Link to="/admin/seminars/$id" params={{ id: seminar.id }}>
                  <Settings2 className="h-4 w-4 mr-1.5" />Manage
                </Link>
              </Button>
            )}
          </div>
        </div>

        {missing.length > 0 && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive mb-1.5">Complete these courses first:</p>
            <ul className="space-y-1">
              {missing.map((c) => (
                <li key={c.id}>
                  <Link to="/courses/$slug" params={{ slug: c.slug }} className="text-primary hover:underline">{c.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <DetailRow icon={Calendar} label={`When (${seminar.timezone ?? "Africa/Lagos"})`}>
          {start.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}{" → "}
          {end.toLocaleString(undefined, { dateStyle: end.toDateString() === start.toDateString() ? undefined : "medium", timeStyle: "short" })}
          {seminar.registration_deadline && (
            <div className="text-xs text-muted-foreground mt-1">
              Registration closes {new Date(seminar.registration_deadline).toLocaleString()}
            </div>
          )}
        </DetailRow>
        {(seminar.venue_name || seminar.address || seminar.location) && (
          <DetailRow icon={MapPin} label="Venue">
            <div>{seminar.venue_name || seminar.location}</div>
            {seminar.address && <div className="text-xs text-muted-foreground">{seminar.address}{seminar.state ? `, ${seminar.state}` : ""}</div>}
            {seminar.maps_url && <a className="text-xs text-primary hover:underline" href={seminar.maps_url} target="_blank" rel="noreferrer">Open in Maps</a>}
          </DetailRow>
        )}
        {seminar.meeting_url && (
          <DetailRow icon={Video} label={`Online (${seminar.platform ?? "meeting"})`}>
            {active ? (
              <>
                <a className="text-primary hover:underline break-all" href={seminar.meeting_url} target="_blank" rel="noreferrer">{seminar.meeting_url}</a>
                {seminar.meeting_id && <div className="text-xs text-muted-foreground mt-1">ID: {seminar.meeting_id}</div>}
                {seminar.meeting_password && <div className="text-xs text-muted-foreground">Password: {seminar.meeting_password}</div>}
              </>
            ) : (
              <span className="text-muted-foreground">Join details are shown after registration.</span>
            )}
          </DetailRow>
        )}
        <DetailRow icon={Users} label="Capacity">
          {registeredCount}{seminar.capacity ? ` of ${seminar.capacity}` : " registered"}
          {waitlistCount > 0 && <span className="text-muted-foreground"> · {waitlistCount} waitlisted</span>}
        </DetailRow>
        {seminar.prerequisites_text && (
          <DetailRow icon={FileText} label="Prerequisites">{seminar.prerequisites_text}</DetailRow>
        )}
        {seminar.exam_id && (
          <DetailRow icon={registration?.exam_unlocked ? Unlock : Lock} label="Certification exam">
            {registration?.exam_unlocked ? (
              <Link to="/exams/$examId" params={{ examId: seminar.exam_id }} className="text-primary hover:underline">Exam unlocked — start</Link>
            ) : (
              <span className="text-muted-foreground">
                Locked until attendance of at least {seminar.min_attendance_percent}% is verified
                {registration?.attendance_percent != null ? ` (yours: ${registration.attendance_percent}%)` : ""}.
              </span>
            )}
          </DetailRow>
        )}
        {(seminar.cpd_points ?? 0) > 0 && (
          <DetailRow icon={Award} label="CPD">{seminar.cpd_points} points{seminar.cpd_category ? ` · ${seminar.cpd_category}` : ""}</DetailRow>
        )}
      </div>

      {qr && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6 flex items-center gap-5">
          <img src={qr} alt="Your check-in QR code" className="h-32 w-32 rounded-md bg-white p-1" />
          <div>
            <h3 className="font-medium">Your check-in code</h3>
            <p className="text-sm text-muted-foreground mt-1">Show this at the venue for attendance scanning.</p>
            {registration?.checked_in_at && (
              <p className="text-xs text-primary mt-1">Checked in {new Date(registration.checked_in_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {visibleMaterials.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium mb-3">Materials</h3>
          <ul className="divide-y divide-border text-sm">
            {visibleMaterials.map((m) => (
              <li key={m.id} className="py-2 flex items-center justify-between gap-3">
                <a href={m.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{m.title}</a>
                <Badge variant="outline" className="capitalize">{m.visibility === "pre" ? "pre-seminar" : m.visibility}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

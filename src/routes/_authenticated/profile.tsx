import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — NCAA Academy" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refresh } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    arbiter_title: "",
    zone: "",
    state: "",
    fide_id: "",
    bio: "",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
        arbiter_title: profile.arbiter_title ?? "",
        zone: profile.zone ?? "",
        state: profile.state ?? "",
        fide_id: profile.fide_id ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
    }
  }, [profile]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("academy_profiles")
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        arbiter_title: form.arbiter_title || null,
        zone: form.zone,
        state: form.state,
        fide_id: form.fide_id,
        bio: form.bio,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refresh();
  }

  async function onAvatar(file: File) {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    const { error } = await supabase.from("academy_profiles").update({ avatar_url: url }).eq("id", user.id);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, avatar_url: url }));
    toast.success("Avatar updated");
    refresh();
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return toast.error(error.message);
    setPwd("");
    toast.success("Password updated");
  }

  const initials = (form.first_name[0] ?? "") + (form.last_name[0] ?? "");

  return (
    <>
      <PageHeader title="My profile" description="Update your personal information and credentials." />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <form onSubmit={onSave} className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={form.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials || "NA"}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar" className="cursor-pointer text-sm text-primary hover:underline">Change avatar</Label>
                <input id="avatar" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
                <p className="text-xs text-muted-foreground mt-1">PNG or JPG, up to 2MB.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field id="first_name" label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
              <Field id="last_name" label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
              <Field id="phone" label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field id="fide_id" label="FIDE ID" value={form.fide_id} onChange={(v) => setForm({ ...form, fide_id: v })} />
              <div className="space-y-2">
                <Label>Arbiter title</Label>
                <Select value={form.arbiter_title || "none"} onValueChange={(v) => setForm({ ...form, arbiter_title: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (candidate)</SelectItem>
                    <SelectItem value="NA">National Arbiter (NA)</SelectItem>
                    <SelectItem value="FA">FIDE Arbiter (FA)</SelectItem>
                    <SelectItem value="IA">International Arbiter (IA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field id="zone" label="Zone" value={form.zone} onChange={(v) => setForm({ ...form, zone: v })} />
              <Field id="state" label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4 self-start">
          <div>
            <h3 className="font-semibold">Account</h3>
            <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <form onSubmit={changePassword} className="space-y-3">
            <Label htmlFor="newpwd">Change password</Label>
            <Input id="newpwd" type="password" minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="New password" />
            <Button type="submit" variant="outline" className="w-full" disabled={!pwd}>Update password</Button>
          </form>
        </div>
      </div>
    </>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
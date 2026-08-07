import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPermissionMatrix,
  setRolePermission,
  listUserOverrides,
  setUserOverride,
  removeUserOverride,
} from "@/lib/permissions.functions";
import { listUsers } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/permissions")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — NCAA Academy" },
      {
        name: "description",
        content:
          "Configure which academy permissions each arbiter role holds and grant per-user overrides.",
      },
      { property: "og:title", content: "Roles & Permissions — NCAA Academy" },
      {
        property: "og:description",
        content: "Role permission matrix and per-user overrides for the NCAA Academy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PermissionsAdmin,
});

const ROLES = [
  { key: "candidate", label: "Candidate" },
  { key: "national_arbiter", label: "NA" },
  { key: "fide_arbiter", label: "FA" },
  { key: "international_arbiter", label: "IA" },
  { key: "instructor", label: "Instructor" },
  { key: "academy_admin", label: "Admin" },
  { key: "super_admin", label: "Super" },
] as const;

function PermissionsAdmin() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const matrixFn = useServerFn(getPermissionMatrix);
  const { data, isLoading } = useQuery({
    queryKey: ["permission-matrix"],
    queryFn: () => matrixFn(),
  });

  const setRoleFn = useServerFn(setRolePermission);
  const toggle = useMutation({
    mutationFn: setRoleFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permission-matrix"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const perms = (data?.permissions ?? []).filter((p) =>
      `${p.key} ${p.description}`.toLowerCase().includes(filter.toLowerCase()),
    );
    const map = new Map<string, typeof perms>();
    for (const p of perms) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return Array.from(map.entries());
  }, [data, filter]);

  const held = useMemo(() => {
    const s = new Set<string>();
    for (const rp of data?.rolePermissions ?? []) s.add(`${rp.role}::${rp.permission_key}`);
    return s;
  }, [data]);

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only academy administrators can manage roles and permissions."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Priority: super admin → academy admin → per-user override → role permission → deny."
      />

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Role matrix</TabsTrigger>
          <TabsTrigger value="overrides">User overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4 space-y-4">
          <Input
            placeholder="Filter permissions…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {grouped.map(([category, perms]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base capitalize">{category}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left font-medium px-4 py-2">Permission</th>
                      {ROLES.map((r) => (
                        <th key={r.key} className="px-3 py-2 font-medium">
                          {r.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perms.map((p) => (
                      <tr key={p.key} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2">
                          <div className="font-mono text-xs">{p.key}</div>
                          <div className="text-xs text-muted-foreground">{p.description}</div>
                        </td>
                        {ROLES.map((r) => {
                          const disabled =
                            r.key === "super_admin" ||
                            (r.key === "academy_admin" && !p.system_only);
                          return (
                            <td key={r.key} className="px-3 py-2 text-center">
                              <Checkbox
                                checked={held.has(`${r.key}::${p.key}`)}
                                disabled={disabled || toggle.isPending}
                                onCheckedChange={(v) =>
                                  toggle.mutate({
                                    data: {
                                      role: r.key,
                                      permission_key: p.key,
                                      enabled: v === true,
                                    },
                                  })
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="overrides" className="mt-4">
          <Overrides permissions={(data?.permissions ?? []).map((p) => p.key)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Overrides({ permissions }: { permissions: string[] }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listUserOverrides);
  const usersFn = useServerFn(listUsers);
  const saveFn = useServerFn(setUserOverride);
  const removeFn = useServerFn(removeUserOverride);

  const { data: rows } = useQuery({
    queryKey: ["user-overrides"],
    queryFn: () => listFn({ data: {} }),
  });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => usersFn() });

  const [userId, setUserId] = useState("");
  const [permission, setPermission] = useState("");
  const [granted, setGranted] = useState("true");
  const [reason, setReason] = useState("");

  const save = useMutation({
    mutationFn: saveFn,
    onSuccess: () => {
      toast.success("Override saved");
      setReason("");
      qc.invalidateQueries({ queryKey: ["user-overrides"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const remove = useMutation({
    mutationFn: removeFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-overrides"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const userList = (users ?? []) as {
    id: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  }[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Grant or block a single permission
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent>
              {userList.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={permission} onValueChange={setPermission}>
            <SelectTrigger><SelectValue placeholder="Permission" /></SelectTrigger>
            <SelectContent>
              {permissions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={granted} onValueChange={setGranted}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Allow</SelectItem>
              <SelectItem value="false">Block</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            disabled={!userId || !permission || save.isPending}
            onClick={() =>
              save.mutate({
                data: {
                  user_id: userId,
                  permission_key: permission,
                  granted: granted === "true",
                  reason: reason || undefined,
                },
              })
            }
          >
            Save override
          </Button>
        </CardContent>
      </Card>

      {(rows ?? []).length === 0 ? (
        <EmptyState
          title="No overrides"
          description="Everyone currently gets exactly what their role allows."
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">User</th>
                  <th className="text-left font-medium px-4 py-2">Permission</th>
                  <th className="text-left font-medium px-4 py-2">Effect</th>
                  <th className="text-left font-medium px-4 py-2">Reason</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => {
                  const row = r as unknown as {
                    id: string;
                    permission_key: string;
                    granted: boolean;
                    reason: string | null;
                    profile: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
                  };
                  return (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2">
                        {[row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(" ") ||
                          row.profile?.email ||
                          "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{row.permission_key}</td>
                      <td className="px-4 py-2">
                        <Badge variant={row.granted ? "default" : "destructive"}>
                          {row.granted ? "Allow" : "Block"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{row.reason ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove.mutate({ data: { id: row.id } })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

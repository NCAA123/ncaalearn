import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { deleteUser, listUsers, setUserRole } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";

const ALL_ROLES = [
  "candidate",
  "national_arbiter",
  "fide_arbiter",
  "international_arbiter",
  "instructor",
  "academy_admin",
  "super_admin",
] as const;

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { isStaff, user: me } = useAuth();
  const fetchUsers = useServerFn(listUsers);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
    enabled: isStaff,
  });

  const setRoleFn = useServerFn(setUserRole);
  const setRoleMut = useMutation({
    mutationFn: (vars: { userId: string; role: (typeof ALL_ROLES)[number]; enabled: boolean }) =>
      setRoleFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delFn = useServerFn(deleteUser);
  const delMut = useMutation({
    mutationFn: (userId: string) => delFn({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((u) => {
      const name = `${u.profile?.first_name ?? ""} ${u.profile?.last_name ?? ""}`.toLowerCase();
      return u.email?.toLowerCase().includes(q) || name.includes(q);
    });
  }, [data, search]);

  if (!isStaff) return <PageHeader title="Users" description="Staff access only." />;

  return (
    <div>
      <PageHeader
        title="Users & roles"
        description="Search, audit and manage every Academy account."
        action={<Input className="w-64" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />
      {error && <p className="text-sm text-destructive mb-4">{(error as Error).message}</p>}
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>
            ) : (
              filtered.map((u) => {
                const name = `${u.profile?.first_name ?? ""} ${u.profile?.last_name ?? ""}`.trim() || "—";
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {ALL_ROLES.map((role) => {
                          const has = u.roles.includes(role);
                          return (
                            <label key={role} className="flex items-center gap-1.5 text-xs cursor-pointer rounded border border-border bg-background px-2 py-1">
                              <Checkbox
                                checked={has}
                                disabled={setRoleMut.isPending}
                                onCheckedChange={(v) =>
                                  setRoleMut.mutate({ userId: u.id, role, enabled: !!v })
                                }
                              />
                              <span>{role.replace(/_/g, " ")}</span>
                            </label>
                          );
                        })}
                        {u.roles.length === 0 && <Badge variant="secondary">no roles</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={u.id === me?.id || delMut.isPending}
                        onClick={() => {
                          if (confirm(`Delete ${u.email}? This cannot be undone.`)) delMut.mutate(u.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, Award } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { listArbiterRegistry } from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/registry")({
  head: () => ({ meta: [{ title: "Arbiter Registry — NCAA Academy" }] }),
  component: RegistryPage,
});

function RegistryPage() {
  const fn = useServerFn(listArbiterRegistry);
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["arbiter-registry", title],
    queryFn: () => fn({ data: { title: title || undefined } }),
  });

  const rows = (data ?? []).filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return `${r.first_name ?? ""} ${r.last_name ?? ""} ${r.license_number} ${r.fide_id ?? ""}`
      .toLowerCase()
      .includes(s);
  });

  return (
    <div>
      <PageHeader
        title="Arbiter registry"
        description="Directory of all currently licensed NCAA arbiters."
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, license, or FIDE ID"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {["", "NA", "FA", "IA"].map((t) => (
            <button
              key={t || "all"}
              onClick={() => setTitle(t)}
              className={
                "px-3 py-1.5 rounded-md text-xs font-medium border transition " +
                (title === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted")
              }
            >
              {t || "All"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No arbiters found" description="Try a different search or filter." />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Title</th>
                <th className="text-left px-4 py-2 font-medium">License #</th>
                <th className="text-left px-4 py-2 font-medium">State</th>
                <th className="text-left px-4 py-2 font-medium">Zone</th>
                <th className="text-left px-4 py-2 font-medium">FIDE ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.license_id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {r.avatar_url ? (
                        <img
                          src={r.avatar_url}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                          {(r.first_name?.[0] ?? "") + (r.last_name?.[0] ?? "")}
                        </div>
                      )}
                      <span className="font-medium">
                        {r.first_name} {r.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                      <Award className="h-3 w-3" />
                      {r.title}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.license_number}</td>
                  <td className="px-4 py-2">{r.state ?? "—"}</td>
                  <td className="px-4 py-2">{r.zone ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.fide_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
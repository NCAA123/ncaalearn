import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, Info, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listActiveAnnouncements } from "@/lib/admin.functions";

const STORAGE_KEY = "ncaa.dismissedAnnouncements";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function AnnouncementBanner() {
  const fetchFn = useServerFn(listActiveAnnouncements);
  const { data } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
  });
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => setDismissed(readDismissed()), []);

  const active = (data ?? []).find((a) => !dismissed.includes(a.id));
  if (!active) return null;

  const dismiss = () => {
    const next = [...dismissed, active.id].slice(-50);
    setDismissed(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const priority = (active.priority ?? "info") as "info" | "warning" | "critical";
  const styles = {
    info: "border-primary/30 bg-primary/5 text-foreground",
    warning: "border-amber-500/40 bg-amber-500/10 text-foreground",
    critical: "border-destructive/40 bg-destructive/10 text-foreground",
  }[priority];
  const Icon = priority === "info" ? Megaphone : priority === "warning" ? Info : AlertTriangle;

  return (
    <div className={cn("mb-6 rounded-xl border p-4 flex items-start gap-3", styles)}>
      <div className="mt-0.5 h-8 w-8 rounded-md bg-background/60 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{active.title}</div>
        <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap">{active.body}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
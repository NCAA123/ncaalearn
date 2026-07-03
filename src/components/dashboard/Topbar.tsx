import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Bell, LogOut, Menu, Search, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { listMyNotifications } from "@/lib/license.functions";
import { supabase } from "@/integrations/supabase/client";

export function Topbar() {
  const { profile, user, signOut, roles, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchNotifs = useServerFn(listMyNotifications);
  const { data: notifs } = useQuery({
    queryKey: ["my-notifications", "topbar"],
    queryFn: () => fetchNotifs(),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  // Realtime: when the DB inserts a new notification for this user, refresh
  // the bell and the /notifications list without waiting on the poll.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "academy_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["my-notifications"] });
          qc.invalidateQueries({ queryKey: ["my-notifications", "topbar"] });
          qc.invalidateQueries({ queryKey: ["active-announcements"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const unread = (notifs ?? []).filter((n) => !n.read).length;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user?.email || "User";
  const initials = (profile?.first_name?.[0] ?? "") + (profile?.last_name?.[0] ?? "");
  const primaryRole = roles[0]?.replaceAll("_", " ") ?? "candidate";

  return (
    <header className="h-16 border-b border-border bg-card/70 backdrop-blur sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
      <div className="hidden md:flex items-center gap-2 text-muted-foreground text-sm flex-1 max-w-md">
        <Search className="h-4 w-4" />
        <span>Search courses, exams, seminars…</span>
      </div>
      <div className="flex-1 md:hidden" />
      <Button variant="ghost" size="icon" asChild className="relative">
        <Link to="/notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1 hover:bg-muted transition">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials || "NA"}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-sm font-medium text-foreground">{name}</div>
              <div className="text-[11px] text-muted-foreground capitalize">{primaryRole}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="h-4 w-4 mr-2" />Profile</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/login", replace: true }); }}>
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
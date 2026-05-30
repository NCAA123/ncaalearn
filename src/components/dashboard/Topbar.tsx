import { Link, useNavigate } from "@tanstack/react-router";
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

export function Topbar() {
  const { profile, user, signOut, roles } = useAuth();
  const navigate = useNavigate();
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
      <Button variant="ghost" size="icon" asChild>
        <Link to="/notifications"><Bell className="h-5 w-5" /></Link>
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
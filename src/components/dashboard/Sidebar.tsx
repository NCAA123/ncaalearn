import { Link, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, Crown, LayoutDashboard, BookOpen, GraduationCap, FileQuestion, Award, IdCard, BarChart3, FolderOpen, Bell, Users, Settings, Megaphone, ListChecks, User, PlayCircle, ClipboardCheck, BadgeCheck, TrendingUp, Trophy, BookMarked, Search, Boxes } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof LayoutDashboard };

export function Sidebar() {
  const { isStaff, isAdmin, isLicensedArbiter } = useAuth();
  const { location } = useRouterState();

  const learner: Item[] = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/search", label: "Search", icon: Search },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/my-learning", label: "My Learning", icon: PlayCircle },
    { to: "/seminars", label: "Seminars", icon: GraduationCap },
    { to: "/exams", label: "Examinations", icon: FileQuestion },
    { to: "/certificates", label: "Certificates", icon: Award },
    { to: "/badges", label: "Badges", icon: Trophy },
    { to: "/simulations", label: "Simulations", icon: Boxes },
    { to: "/registry", label: "Arbiter Registry", icon: BookMarked },
    { to: "/resources", label: "Resource Library", icon: FolderOpen },
  ];
  if (isLicensedArbiter) {
    learner.splice(5, 0, { to: "/license", label: "My License", icon: IdCard });
    learner.splice(6, 0, { to: "/cpd", label: "CPD Tracker", icon: ListChecks });
  }
  // Anyone can view their progression path (candidates see how to become NA).
  learner.push({ to: "/promotions", label: "Promotions", icon: TrendingUp });

  const staff: Item[] = [
    { to: "/admin", label: "Admin Overview", icon: BarChart3 },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/seminars", label: "Seminars", icon: GraduationCap },
    { to: "/admin/exams", label: "Exams", icon: FileQuestion },
    { to: "/admin/questions", label: "Question Bank", icon: ListChecks },
    { to: "/admin/grading", label: "Grading Queue", icon: ClipboardCheck },
    { to: "/admin/certificates", label: "Certificates", icon: Award },
    { to: "/admin/licenses", label: "Licenses", icon: IdCard },
    { to: "/admin/cpd", label: "CPD Review", icon: BadgeCheck },
    { to: "/admin/promotions", label: "Promotions", icon: TrendingUp },
    { to: "/admin/simulations", label: "Simulations", icon: Boxes },
    { to: "/admin/resources", label: "Resources", icon: FolderOpen },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { to: "/admin/reports", label: "Reports", icon: TrendingUp },
  ];
  if (isAdmin) {
    staff.push({ to: "/admin/permissions", label: "Roles & Permissions", icon: ShieldCheck });
    staff.push({ to: "/admin/settings", label: "Settings", icon: Settings });
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
            <Crown className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">NCAA Academy</div>
            <div className="text-[11px] opacity-70">Arbiter Platform</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Admins see only the admin console; arbiter/learner menus would be confusing
            (and the user explicitly asked for them to be hidden). Non-admin staff
            (instructors) still see both so they can teach AND moderate. */}
        {!isAdmin && (
          <SidebarSection title="Learning" items={learner} pathname={location.pathname} />
        )}
        {isStaff && <SidebarSection title="Administration" items={staff} pathname={location.pathname} />}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition">
          <User className="h-4 w-4" />
          <span>My profile</span>
        </Link>
        <Link to="/notifications" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition">
          <Bell className="h-4 w-4" />
          <span>Notifications</span>
        </Link>
      </div>
    </aside>
  );
}

function SidebarSection({ title, items, pathname }: { title: string; items: Item[]; pathname: string }) {
  return (
    <div>
      <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-60">{title}</div>
      <ul className="space-y-0.5">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/dashboard" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/90",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
import { Link, useRouterState } from "@tanstack/react-router";
import { Crown, LayoutDashboard, BookOpen, GraduationCap, FileQuestion, Award, IdCard, BarChart3, FolderOpen, Bell, ListChecks, User, PlayCircle, ClipboardCheck, BadgeCheck, TrendingUp, Trophy, BookMarked, Search, Boxes, Handshake, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; permission?: string[] };

// NCAA-wide Academy administration (users & roles, permissions matrix,
// compliance, mentorship, simulations, promotions, announcements, settings)
// now lives in the NCAA Command Center, not here -- this app's own
// "Administration" section is instructor-scoped teaching/grading tooling,
// gated per-item by the instructor's actual academy_permissions grants
// rather than a blanket staff/admin split.
const COMMAND_CENTER_URL = "https://nigarbadminapp.vercel.app/admin/academy";

export function Sidebar() {
  const { isStaff, isAdmin, isLicensedArbiter, canAny } = useAuth();
  const { location } = useRouterState();

  const learner: Item[] = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/search", label: "Search", icon: Search },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/my-learning", label: "My Learning", icon: PlayCircle },
    { to: "/seminars", label: "Seminars", icon: GraduationCap },
    { to: "/exams", label: "Examinations", icon: FileQuestion },
    { to: "/practice", label: "Practice", icon: ListChecks },
    { to: "/certificates", label: "Certificates", icon: Award },
    { to: "/badges", label: "Badges", icon: Trophy },
    { to: "/simulations", label: "Simulations", icon: Boxes },
    { to: "/mentorship", label: "Mentorship", icon: Handshake },
    { to: "/registry", label: "Arbiter Registry", icon: BookMarked },
    { to: "/resources", label: "Resource Library", icon: FolderOpen },
  ];
  if (isLicensedArbiter) {
    learner.splice(5, 0, { to: "/license", label: "My License", icon: IdCard });
    learner.splice(6, 0, { to: "/cpd", label: "CPD Tracker", icon: ListChecks });
  }
  // Anyone can view their progression path (candidates see how to become NA).
  learner.push({ to: "/promotions", label: "Promotions", icon: TrendingUp });

  // Each item's permission (when set) mirrors the real academy_permissions
  // keys backing that page's server functions -- an instructor only sees
  // what they can actually do, instead of the old blanket "any staff sees
  // every admin route" list. Items with no `permission` fall back to the
  // isStaff floor (matches their route's own `assertStaff` gate).
  const allStaffItems: Item[] = [
    { to: "/admin", label: "Admin Overview", icon: BarChart3 },
    { to: "/admin/courses", label: "Courses", icon: BookOpen, permission: ["courses.manage", "courses.create", "courses.edit.own"] },
    { to: "/admin/seminars", label: "Seminars", icon: GraduationCap, permission: ["seminars.manage", "seminars.manage.assigned"] },
    { to: "/admin/exams", label: "Exams", icon: FileQuestion, permission: ["exams.manage", "exams.create"] },
    { to: "/admin/questions", label: "Question Bank", icon: ListChecks, permission: ["questions.manage", "questions.create", "questions.edit.own"] },
    { to: "/admin/grading", label: "Grading Queue", icon: ClipboardCheck, permission: ["exams.manage", "exams.grade.manual", "assessments.manual_grade"] },
    { to: "/admin/certificates", label: "Certificates", icon: Award, permission: ["certificates.manage"] },
    { to: "/admin/licenses", label: "Licenses", icon: IdCard },
    { to: "/admin/cpd", label: "CPD Review", icon: BadgeCheck, permission: ["cpd.manage"] },
    { to: "/admin/resources", label: "Resources", icon: FolderOpen, permission: ["resources.upload"] },
    { to: "/admin/reports", label: "Reports", icon: TrendingUp, permission: ["reports.all", "reports.view.courses", "reports.view.exams"] },
  ];
  // Admins always see the full instructor toolset too; a plain instructor
  // only sees items whose permission they actually hold.
  const staff: Item[] = isAdmin
    ? allStaffItems
    : allStaffItems.filter((it) => !it.permission || canAny(it.permission));

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
            (instructors) still see both so they can teach AND moderate. NCAA-wide
            Academy administration (users/roles, compliance, mentorship, promotions,
            simulations, announcements, settings) is superadmin-tier and lives in
            the NCAA Command Center, linked below for admins only. */}
        {!isAdmin && (
          <SidebarSection title="Learning" items={learner} pathname={location.pathname} />
        )}
        {isStaff && <SidebarSection title="Instructor Tools" items={staff} pathname={location.pathname} />}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-60">NCAA-wide admin</div>
            <a
              href={COMMAND_CENTER_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition hover:bg-sidebar-accent text-sidebar-foreground/90"
            >
              <ExternalLink className="h-4 w-4" />
              <span>NCAA Command Center</span>
            </a>
          </div>
        )}
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
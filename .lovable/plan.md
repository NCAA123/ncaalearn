## NCAA Academy — Phase 1 Build Plan

Phase 1 in the spec is ~4 months across 8 sprints. I cannot ship all of it in one turn without producing shallow, broken modules. This plan delivers a **solid foundation** in this turn and reserves the heavy modules (full LMS viewer, exam runtime + anti-cheating, certificate PDF/QR, CPD workflows, admin reporting) for follow-up turns where each gets the focus it needs.

Per your instruction: **no public-facing site** — every route lives behind auth and renders dashboard chrome.

### What ships in this turn

**1. Auth + role system (Sprint 1 core)**
- Supabase email/password auth (sign up, sign in, password reset page)
- `academy_profiles` table linked to `auth.users` (first/last name, title, zone, state, phone, avatar, bio)
- `academy_user_roles` table with enum `app_role` = `candidate | national_arbiter | fide_arbiter | international_arbiter | instructor | academy_admin | super_admin`
- `has_role()` security-definer function for safe RLS checks
- Auto-create profile + default `candidate` role on signup via trigger
- Route guards: `_authenticated` layout + role-scoped layouts (`_admin`, `_instructor`)

**2. Dashboard shell (all variants from §9)**
- Persistent sidebar + topbar (notifications bell, profile menu, theme already light)
- Role-aware navigation (candidate vs arbiter vs instructor vs admin shows different menu items)
- `/dashboard` renders the correct variant by role:
  - Candidate: progress, modules, practice score, upcoming seminar, recent activity
  - Licensed Arbiter (NA/FA/IA): license status banner, CPD tracker, promotion readiness, pending tasks
  - Instructor: course stats, students, pending grading, upcoming seminars
  - Admin: system health stats, activity, alerts, quick actions
- All cards render real DB data where it exists, and clearly-labeled empty states elsewhere — no fake numbers

**3. Core schema scaffolding (so later modules can build on it)**
Tables created with RLS + grants:
- `academy_courses`, `academy_modules`, `academy_lessons`, `academy_enrollments`, `academy_lesson_progress`
- `academy_seminars`, `academy_seminar_registrations`
- `academy_exams`, `academy_questions`, `academy_exam_attempts`, `academy_exam_answers`
- `academy_certificates`, `academy_licenses`, `academy_cpd_records`
- `academy_resources`, `academy_notifications`, `academy_announcements`

Schema only — admin CRUD UIs and learner-facing viewers come in later turns. The exception is the routes/pages we need wired up so the dashboard nav doesn't dead-end (each lists from the DB with empty state + "coming soon" detail view).

**4. Profile page**
- View/edit own profile (name, title, zone, state, phone, bio, avatar upload to Supabase Storage)
- Password change

**5. Design system**
- Professional academic palette (deep navy + warm gold accent, light surfaces) defined in `src/styles.css` as oklch tokens
- Inter for body, semibold display for headings
- All shadcn components themed via tokens; no ad-hoc colors in components

### Deferred to follow-up turns (call them out by name when you want each)

- Sprint 2: Course catalog browse/search/filter, full course viewer, video/PDF/text lesson rendering, progress tracking
- Sprint 3: Interactive chess board (chessboard.js + chess.js), PGN exercises, module quizzes, My Learning
- Sprint 4: Seminar create/register/attend flows, materials, waitlist
- Sprint 5–6: Question bank CRUD + approval, exam runtime (MCQ/multi/T-F/essay), auto-grading, anti-cheating engine (tab-switch detection, fullscreen lock, violation log), manual grading
- Sprint 7: Certificate PDF generation + QR + public `/verify/:hash` endpoint, license issuance, CPD entry
- Sprint 8: Resource library upload/download, email notifications via server functions, admin reports, polish

### Technical notes

- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn (existing template)
- All data access via `createServerFn` with `requireSupabaseAuth` middleware where the user must be known; client-side `supabase` for auth flows + realtime
- Roles in **separate** `academy_user_roles` table (never on profile) — checked via `has_role()` SECURITY DEFINER
- Every new `public` table gets explicit GRANTs (authenticated + service_role) alongside RLS
- File uploads go to Supabase Storage buckets: `avatars` (public), `course-materials` (private), `certificates` (private)
- Sitemap/robots not added (no public surface)

### Risks / things to watch

- Existing Supabase project already has unrelated tables (arbiters, candidates, elections, gallery, chat_*) from the NCAA main site. I'll **namespace all new tables with `academy_`** to avoid collisions and won't modify the existing ones.
- The existing `arbiters` table overlaps conceptually with our license/profile data. For Phase 1 I'll keep them separate; cross-system sync is in the spec's §45 (Phase 2). Confirm this is OK or tell me to map onto existing tables instead.

Reply **approve** to proceed, or tell me what to change (e.g. "skip the design system, I'll provide one" / "use existing arbiters table for licensed users" / "build Sprint 2 in this turn too").
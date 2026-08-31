# NCAA Academy — Complete Platform Specification
## academy.ncaaweb.com.ng
### Version 1.0 | Full Build Reference Document

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Vision, Mission & Goals](#2-vision-mission--goals)
3. [Platform Architecture Overview](#3-platform-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [System Design Principles](#5-system-design-principles)
6. [Database Architecture](#6-database-architecture)
7. [User Roles & Permission System](#7-user-roles--permission-system)
8. [Authentication & Security](#8-authentication--security)
9. [Dashboard System](#9-dashboard-system)
10. [Learning Management System (LMS)](#10-learning-management-system-lms)
11. [Course Management](#11-course-management)
12. [Seminar & Webinar System](#12-seminar--webinar-system)
13. [Examination System](#13-examination-system)
14. [Question Bank System](#14-question-bank-system)
15. [Interactive Chess Board System](#15-interactive-chess-board-system)
16. [Practice Questions System](#16-practice-questions-system)
17. [Refresher Course System](#17-refresher-course-system)
18. [Grading System](#18-grading-system)
19. [Certification System](#19-certification-system)
20. [Digital License System](#20-digital-license-system)
21. [CPD Management System](#21-cpd-management-system)
22. [Promotion & Career Progression System](#22-promotion--career-progression-system)
23. [Resource Library](#23-resource-library)
24. [Notification System](#24-notification-system)
25. [Announcement System](#25-announcement-system)
26. [Analytics & Reporting System](#26-analytics--reporting-system)
27. [AI-Powered Features](#27-ai-powered-features)
28. [Tournament Experience Integration](#28-tournament-experience-integration)
29. [Mentorship Program](#29-mentorship-program)
30. [Digital Badge System](#30-digital-badge-system)
31. [Public Arbiter Registry](#31-public-arbiter-registry)
32. [Gamification System](#32-gamification-system)
33. [Mobile Experience](#33-mobile-experience)
34. [Accessibility](#34-accessibility)
35. [Admin Super Panel](#35-admin-super-panel)
36. [Payment Integration](#36-payment-integration)
37. [API Architecture](#37-api-architecture)
38. [Email & Communication System](#38-email--communication-system)
39. [File Management System](#39-file-management-system)
40. [Audit & Compliance System](#40-audit--compliance-system)
41. [Phase Implementation Roadmap](#41-phase-implementation-roadmap)
42. [Infrastructure & Deployment](#42-infrastructure--deployment)
43. [Testing Strategy](#43-testing-strategy)
44. [Performance Requirements](#44-performance-requirements)
45. [Integration Specifications](#45-integration-specifications)
46. [UI/UX Design System](#46-uiux-design-system)
47. [Navigation Architecture](#47-navigation-architecture)
48. [Error Handling Strategy](#48-error-handling-strategy)
49. [Data Migration Plan](#49-data-migration-plan)
50. [Maintenance & Support Plan](#50-maintenance--support-plan)

---

# 1. EXECUTIVE SUMMARY

The NCAA Academy is the official training, certification, licensing, and professional development platform for chess arbiters under the Nigerian Chess Association (NCAA). It serves as the single authoritative source for arbiter education in Nigeria — bridging the gap between raw candidates and internationally certified officials.

The platform is designed to operate at the level of a world-class professional certification body, comparable to systems used by major sporting federations globally. It is built to integrate natively with the broader NCAA ecosystem: the NCAA Dashboard, Payment System, Tournament Assignment System, Voting System, and Public Registry.

At its core, NCAA Academy has seven primary functions:

- **Train** new arbiters from zero knowledge to examination readiness
- **Certify** arbiters through rigorous, tamper-resistant examinations
- **License** certified arbiters with digitally verifiable credentials
- **Track** continuing professional development across all title levels
- **Manage** structured promotion pathways from Candidate to International Arbiter
- **Enforce** ongoing refresher obligations aligned with FIDE rule updates
- **Provide** a professional home where every arbiter in Nigeria can grow throughout their career

The system is built mobile-first, fully responsive, accessible to WCAG 2.1 AA standards, and capable of supporting thousands of concurrent users during peak examination periods.

---

# 2. VISION, MISSION & GOALS

## 2.1 Vision

To build the most comprehensive and technologically advanced arbiter education platform on the African continent — establishing NCAA as the gold standard for chess officiating excellence.

## 2.2 Mission

To provide every Nigerian chess arbiter — regardless of location or background — with equal access to high-quality training, fair certification, and a clear professional development pathway.

## 2.3 Strategic Goals

### Short-Term Goals (Phase 1 )
- Onboard all currently licensed arbiters in Nigeria
- Complete digitisation of the National Arbiter certification pathway
- Launch practice question bank with minimum 500 questions at launch
- Issue digital certificates and licenses to all active arbiters
- Track CPD points for all CA, NA, FA, and IA titleholders

### Medium-Term Goals (Phase 2 )
- Launch FIDE Arbiter preparation materials
- Integrate with FIDE Arbiters' Commission resources
- Implement interactive chess board examination questions
- Build decision-tree case study simulations
- Launch mentorship pairing programme
- Integrate with NCAA Tournament Assignment System for experience tracking

### Long-Term Goals (Phase 3 )
- Launch 2D Tournament Hall Simulator
- Implement AI-powered study assistant grounded on NCAA/FIDE materials
- Achieve recognition from FIDE as a model national arbiter academy
- Extend platform to other West African chess federations
- Build 3D virtual tournament hall training environment

## 2.4 Success Metrics

| Metric | 1 Target |  2 Target |  3 Target |
|--------|--------------|--------------|--------------|
| Registered Users | 500 | 1,200 | 2,500 |
| Certified Arbiters (via platform) | 50 | 200 | 500 |
| Questions in Bank | 500 | 1,500 | 3,000 |
| CPD Compliance Rate | 70% | 85% | 95% |
| Exam Pass Rate (first attempt) | 60% | 65% | 70% |
| Monthly Active Users | 200 | 600 | 1,500 |

---

# 3. PLATFORM ARCHITECTURE OVERVIEW

## 3.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  Web Browser (React SPA)  │  Mobile (React Native/PWA) │
└──────────────┬─────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼─────────────────────────────────────────┐
│                  CDN / EDGE LAYER                        │
│           Cloudflare (static assets, caching)           │
└──────────────┬─────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────┐
│                API GATEWAY LAYER                         │
│      Nginx Reverse Proxy + Rate Limiting + SSL          │
└──────────────┬─────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────┐
│              APPLICATION LAYER                           │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth    │ │  LMS     │ │  Exam    │ │  Cert    │  │
│  │  Service │ │  Service │ │  Service │ │  Service │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  CPD     │ │ Notify   │ │  AI      │ │  Report  │  │
│  │  Service │ │  Service │ │  Service │ │  Service │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└──────────────┬─────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────┐
│                 DATA LAYER                               │
│   MySQL/PostgreSQL/supabase  │  Redis Cache  │  File Storage     │
│   (primary data)    │  (sessions)   │  (media/docs)     │
└────────────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────┐
│            EXTERNAL INTEGRATIONS                         │
│   NCAA Dashboard  │  Payment System  │  FIDE API        │
│   Email (SMTP)    │  SMS Gateway     │  Push (FCM)      │
└────────────────────────────────────────────────────────┘
```

## 3.2 Monolith vs Microservices Decision

The platform should launch as a **well-structured monolith** with clear service boundaries, designed for easy extraction into microservices later. This gives the development speed of a monolith with the future flexibility of microservices.

**Recommended Structure:**
- Single Laravel application with domain-based folder structure
- Service classes for each domain (ExamService, CertificationService, CPDService, etc.)
- Event-driven communication internally (Laravel Events/Listeners)
- Queue workers for background tasks (certificate generation, email sending, report generation)

## 3.3 Domain Modules

```
app/
├── Domains/
│   ├── Auth/
│   ├── Users/
│   ├── Courses/
│   ├── Seminars/
│   ├── Examinations/
│   ├── Questions/
│   ├── Certifications/
│   ├── Licenses/
│   ├── CPD/
│   ├── Promotions/
│   ├── Resources/
│   ├── Notifications/
│   ├── Analytics/
│   ├── Reports/
│   ├── Badges/
│   ├── Mentorship/
│   ├── Simulations/
│   └── Admin/
```

---

# 4. TECHNOLOGY STACK

## 4.1 Backend

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Framework | Laravel | 11.x | Mature, rapid development, strong Nigerian dev community |
| Language | PHP | 8.3+ | Performance improvements, named arguments, readonly properties |
| Database | MySQL | 8.0+ | Reliable, well-documented, standard in Nigerian hosting |
| Cache | Redis | 7.x | Session storage, queue backend, rate limiting |
| Queue | Laravel Horizon | Latest | Supervisor for background jobs |
| Search | Laravel Scout + Meilisearch | Latest | Full-text search for question bank and resource library |
| WebSockets | Laravel Reverb | Latest | Real-time exam monitoring, live notifications |
| Storage | Laravel Filesystem + S3/Cloudflare R2 | Latest | File uploads, certificates, course media |
| PDF Generation | DomPDF / Browsershot | Latest | Certificate and report generation |
| Excel/CSV | Laravel Excel (Maatwebsite) | Latest | Report exports |

## 4.2 Frontend

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Framework | React | 18.x | Component reuse, large ecosystem |
| Build Tool | Vite | 5.x | Fast HMR, modern bundling |
| State Management | Zustand | 4.x | Lightweight, simpler than Redux for this scale |
| Server State | TanStack Query | 5.x | API data fetching, caching, synchronisation |
| Routing | React Router | 6.x | Client-side routing |
| UI Components | shadcn/ui + Radix UI | Latest | Accessible, unstyled primitives |
| Styling | Tailwind CSS | 3.x | Utility-first, consistent design system |
| Chess Library | chess.js + react-chessboard | Latest | Interactive chess board exercises |
| PGN Viewer | pgn-viewer or chessops | Latest | Game replay in course content |
| Forms | React Hook Form + Zod | Latest | Validation, schema-driven forms |
| Charts | Recharts | Latest | Analytics dashboards |
| Rich Text | Tiptap | Latest | Course content editor |
| PDF Viewer | react-pdf | Latest | Inline document viewing |
| Icons | Lucide React | Latest | Consistent icon system |
| Animations | Framer Motion | Latest | Smooth transitions |
| Dates | date-fns | Latest | Date manipulation |
| Tables | TanStack Table | Latest | Advanced data tables |

## 4.3 Mobile

| Component | Technology | Notes |
|-----------|-----------|-------|
| Primary approach | Progressive Web App (PWA) | Install to homescreen, offline capability |
| Service Worker | Workbox | Asset caching, background sync |
| Push Notifications | Firebase Cloud Messaging (FCM) | Via service worker |
| Offline Support | IndexedDB + Workbox | Cache course content, practice questions |

## 4.4 Infrastructure

| Component | Technology | Notes |
|-----------|-----------|-------|
| Web Server | Nginx | Reverse proxy, static serving |
| Process Manager | PHP-FPM | PHP processing |
| Queue Worker | Supervisor + Laravel Horizon | Background jobs |
| SSL | Let's Encrypt / Cloudflare | HTTPS enforcement |
| DNS + CDN | Cloudflare | Global CDN, DDoS protection |
| Object Storage | Cloudflare R2 | Cost-effective S3-compatible storage |
| Email | Mailgun / Amazon SES | Transactional email |
| SMS | Termii or AfricasTalking | Nigerian SMS gateway |
| Monitoring | Laravel Telescope (dev) + Sentry (prod) | Error tracking |
| Server | VPS — Ubuntu 22.04 | Minimum 4 vCPU, 8GB RAM, 100GB SSD |

## 4.5 Development Tools

| Tool | Purpose |
|------|---------|
| Git + GitHub | Version control |
| GitHub Actions | CI/CD pipeline |
| Docker + Laravel Sail | Local development environment |
| PHPUnit + Pest | Backend testing |
| Vitest + React Testing Library | Frontend testing |
| Playwright | End-to-end testing |
| Laravel Pint | PHP code style |
| ESLint + Prettier | JavaScript code style |
| Postman / Hoppscotch | API testing |

---

# 5. SYSTEM DESIGN PRINCIPLES

## 5.1 Core Principles

**1. Integrity First**
All examination data, certificates, and licenses must be tamper-evident and independently verifiable. Every certificate has a QR code linking to a public verification endpoint. Every exam session is logged with timestamps, IP addresses, and violation records.

**2. Mobile-First**
The majority of Nigerian users access the internet via mobile devices. Every interface must be designed for a 375px viewport first, then progressively enhanced for larger screens.

**3. Progressive Enhancement**
Core functionality must work even on slow connections. JavaScript enhancements load progressively. Critical content is server-side rendered or sent as HTML, not dependent on JavaScript.

**4. Offline Capability**
Practice questions, downloaded resources, and course content should be available offline via PWA caching. Exam submissions should queue locally and sync when connectivity is restored.

**5. Accessibility**
The platform must be usable by arbiters with visual impairments, motor disabilities, or cognitive differences. WCAG 2.1 AA compliance is a minimum requirement.

**6. Data Privacy**
User data is stored in Nigeria where possible. No user data is shared with third parties except as required for FIDE reporting. All data transfers are encrypted.

**7. Audit Everything**
Every significant action in the system — exam attempts, certificate issuance, license changes, admin actions — is recorded with actor, timestamp, and before/after state.

**8. Fail Gracefully**
Exam submissions must never be lost due to connectivity issues. Certificate generation must retry automatically. Payment confirmations must be idempotent.

## 5.2 Naming Conventions

- Database tables: `snake_case`, plural (e.g., `academy_courses`, `academy_exam_attempts`)
- All academy tables prefixed with `academy_` to avoid conflicts with main NCAA system
- API endpoints: RESTful, resource-based (`/api/v1/courses/{id}/modules`)
- React components: PascalCase (`ExamQuestion`, `CPDTracker`)
- PHP classes: PascalCase (`ExamService`, `CertificateGenerator`)

## 5.3 API Versioning

All API routes are versioned: `/api/v1/...`

Breaking changes require a new version (`/api/v2/...`). The old version is supported for 12 months after the new version launches.

---

# 6. DATABASE ARCHITECTURE

## 6.1 User Tables

```sql
-- Core user table (shared with main NCAA system)
users
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                CHAR(36) UNIQUE NOT NULL
  first_name          VARCHAR(100) NOT NULL
  last_name           VARCHAR(100) NOT NULL
  email               VARCHAR(255) UNIQUE NOT NULL
  email_verified_at   TIMESTAMP NULL
  phone               VARCHAR(20) NULL
  phone_verified_at   TIMESTAMP NULL
  password            VARCHAR(255) NOT NULL
  profile_photo_path  VARCHAR(2048) NULL
  date_of_birth       DATE NULL
  gender              ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL
  state_of_origin     VARCHAR(100) NULL
  city                VARCHAR(100) NULL
  fide_id             VARCHAR(20) NULL UNIQUE
  ncaa_member_id      VARCHAR(20) NULL UNIQUE
  status              ENUM('active', 'suspended', 'banned', 'inactive') DEFAULT 'active'
  remember_token      VARCHAR(100) NULL
  last_login_at       TIMESTAMP NULL
  last_login_ip       VARCHAR(45) NULL
  two_factor_secret   TEXT NULL
  two_factor_enabled  TINYINT(1) DEFAULT 0
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  deleted_at          TIMESTAMP NULL

-- Academy-specific user profiles
academy_user_profiles
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id             BIGINT UNSIGNED NOT NULL UNIQUE
  arbiter_title       ENUM('candidate', 'na', 'fa', 'ia') DEFAULT 'candidate'
  bio                 TEXT NULL
  professional_title  VARCHAR(200) NULL
  preferred_language  VARCHAR(10) DEFAULT 'en'
  timezone            VARCHAR(100) DEFAULT 'Africa/Lagos'
  notification_pref   JSON NOT NULL DEFAULT '{}'
  privacy_settings    JSON NOT NULL DEFAULT '{}'
  onboarding_complete TINYINT(1) DEFAULT 0
  onboarding_step     VARCHAR(50) NULL
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- Roles and permissions
roles
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  name                VARCHAR(100) UNIQUE NOT NULL
  slug                VARCHAR(100) UNIQUE NOT NULL
  description         TEXT NULL
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

permissions
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  name                VARCHAR(100) UNIQUE NOT NULL
  slug                VARCHAR(100) UNIQUE NOT NULL
  description         TEXT NULL
  module              VARCHAR(100) NOT NULL
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

role_user
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id             BIGINT UNSIGNED NOT NULL
  role_id             BIGINT UNSIGNED NOT NULL
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  UNIQUE KEY (user_id, role_id)

permission_role
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  permission_id       BIGINT UNSIGNED NOT NULL
  role_id             BIGINT UNSIGNED NOT NULL
  UNIQUE KEY (permission_id, role_id)
```

## 6.2 Course & LMS Tables

```sql
-- Course catalog
academy_courses
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  title                 VARCHAR(255) NOT NULL
  slug                  VARCHAR(255) UNIQUE NOT NULL
  description           TEXT NULL
  short_description     VARCHAR(500) NULL
  thumbnail_path        VARCHAR(2048) NULL
  preview_video_url     VARCHAR(2048) NULL
  category              VARCHAR(100) NOT NULL
  level                 ENUM('beginner', 'national_arbiter', 'fide_arbiter', 'international_arbiter', 'cpd') NOT NULL
  target_audience       JSON NOT NULL DEFAULT '[]'
  learning_outcomes     JSON NOT NULL DEFAULT '[]'
  prerequisites         JSON NOT NULL DEFAULT '[]'
  tags                  JSON NOT NULL DEFAULT '[]'
  duration_hours        DECIMAL(5,2) NULL
  cpd_points            TINYINT UNSIGNED DEFAULT 0
  is_mandatory          TINYINT(1) DEFAULT 0
  mandatory_for         JSON NOT NULL DEFAULT '[]'
  is_published          TINYINT(1) DEFAULT 0
  published_at          TIMESTAMP NULL
  is_featured           TINYINT(1) DEFAULT 0
  sort_order            SMALLINT UNSIGNED DEFAULT 0
  pass_mark             TINYINT UNSIGNED DEFAULT 70
  certificate_eligible  TINYINT(1) DEFAULT 1
  created_by            BIGINT UNSIGNED NOT NULL
  updated_by            BIGINT UNSIGNED NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  deleted_at            TIMESTAMP NULL
  FOREIGN KEY (created_by) REFERENCES users(id)

-- Course modules
academy_course_modules
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  course_id             BIGINT UNSIGNED NOT NULL
  title                 VARCHAR(255) NOT NULL
  description           TEXT NULL
  sort_order            SMALLINT UNSIGNED DEFAULT 0
  is_published          TINYINT(1) DEFAULT 0
  unlock_after_module_id BIGINT UNSIGNED NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE

-- Lessons within modules
academy_lessons
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  module_id             BIGINT UNSIGNED NOT NULL
  title                 VARCHAR(255) NOT NULL
  type                  ENUM('video', 'document', 'text', 'interactive_board', 'quiz', 'pgn_exercise', 'scorm') NOT NULL
  content               LONGTEXT NULL
  video_url             VARCHAR(2048) NULL
  video_duration_seconds INT UNSIGNED NULL
  video_transcript      LONGTEXT NULL
  document_path         VARCHAR(2048) NULL
  fen_position          VARCHAR(100) NULL
  pgn_data              LONGTEXT NULL
  sort_order            SMALLINT UNSIGNED DEFAULT 0
  is_published          TINYINT(1) DEFAULT 0
  is_preview            TINYINT(1) DEFAULT 0
  estimated_minutes     SMALLINT UNSIGNED DEFAULT 10
  created_by            BIGINT UNSIGNED NOT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (module_id) REFERENCES academy_course_modules(id) ON DELETE CASCADE

-- Student enrollment
academy_enrollments
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  user_id               BIGINT UNSIGNED NOT NULL
  course_id             BIGINT UNSIGNED NOT NULL
  enrolled_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  started_at            TIMESTAMP NULL
  completed_at          TIMESTAMP NULL
  progress_percentage   TINYINT UNSIGNED DEFAULT 0
  status                ENUM('enrolled', 'in_progress', 'completed', 'dropped') DEFAULT 'enrolled'
  enrollment_type       ENUM('free', 'paid', 'sponsored', 'assigned') DEFAULT 'free'
  payment_id            BIGINT UNSIGNED NULL
  assigned_by           BIGINT UNSIGNED NULL
  expires_at            TIMESTAMP NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  UNIQUE KEY (user_id, course_id)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE

-- Lesson progress tracking
academy_lesson_progress
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id               BIGINT UNSIGNED NOT NULL
  lesson_id             BIGINT UNSIGNED NOT NULL
  status                ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started'
  progress_percentage   TINYINT UNSIGNED DEFAULT 0
  video_position_seconds INT UNSIGNED DEFAULT 0
  notes                 TEXT NULL
  started_at            TIMESTAMP NULL
  completed_at          TIMESTAMP NULL
  time_spent_seconds    INT UNSIGNED DEFAULT 0
  attempt_count         SMALLINT UNSIGNED DEFAULT 0
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  UNIQUE KEY (user_id, lesson_id)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  FOREIGN KEY (lesson_id) REFERENCES academy_lessons(id) ON DELETE CASCADE

-- User notes on lessons
academy_lesson_notes
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id               BIGINT UNSIGNED NOT NULL
  lesson_id             BIGINT UNSIGNED NOT NULL
  note_text             TEXT NOT NULL
  timestamp_seconds     INT UNSIGNED NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  FOREIGN KEY (lesson_id) REFERENCES academy_lessons(id) ON DELETE CASCADE
```

## 6.3 Examination Tables

```sql
-- Examination definitions
academy_exams
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  title                 VARCHAR(255) NOT NULL
  slug                  VARCHAR(255) UNIQUE NOT NULL
  description           TEXT NULL
  exam_type             ENUM('certification', 'practice', 'mock', 'refresher', 'recertification') NOT NULL
  target_level          ENUM('candidate', 'na', 'fa', 'ia') NOT NULL
  total_marks           SMALLINT UNSIGNED NOT NULL DEFAULT 100
  pass_mark             TINYINT UNSIGNED NOT NULL DEFAULT 70
  duration_minutes      SMALLINT UNSIGNED NOT NULL DEFAULT 90
  total_questions       SMALLINT UNSIGNED NOT NULL
  question_categories   JSON NOT NULL DEFAULT '[]'
  randomise_questions   TINYINT(1) DEFAULT 1
  randomise_options     TINYINT(1) DEFAULT 1
  show_result_immediately TINYINT(1) DEFAULT 0
  allow_review          TINYINT(1) DEFAULT 1
  max_attempts          TINYINT UNSIGNED DEFAULT 3
  cooldown_hours        SMALLINT UNSIGNED DEFAULT 24
  is_proctored          TINYINT(1) DEFAULT 0
  anti_cheat_level      ENUM('none', 'basic', 'strict') DEFAULT 'basic'
  instructions          LONGTEXT NULL
  is_published          TINYINT(1) DEFAULT 0
  available_from        TIMESTAMP NULL
  available_until       TIMESTAMP NULL
  prerequisite_course_ids JSON NOT NULL DEFAULT '[]'
  prerequisite_exam_ids JSON NOT NULL DEFAULT '[]'
  created_by            BIGINT UNSIGNED NOT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  deleted_at            TIMESTAMP NULL

-- Individual exam attempts
academy_exam_attempts
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  exam_id               BIGINT UNSIGNED NOT NULL
  user_id               BIGINT UNSIGNED NOT NULL
  attempt_number        TINYINT UNSIGNED NOT NULL DEFAULT 1
  status                ENUM('in_progress', 'submitted', 'graded', 'voided', 'timed_out') DEFAULT 'in_progress'
  started_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  submitted_at          TIMESTAMP NULL
  graded_at             TIMESTAMP NULL
  time_spent_seconds    INT UNSIGNED DEFAULT 0
  raw_score             DECIMAL(6,2) NULL
  percentage_score      DECIMAL(5,2) NULL
  pass_fail             ENUM('pass', 'fail', 'pending') DEFAULT 'pending'
  violation_count       SMALLINT UNSIGNED DEFAULT 0
  violation_log         JSON NOT NULL DEFAULT '[]'
  ip_address            VARCHAR(45) NULL
  user_agent            TEXT NULL
  browser_fingerprint   VARCHAR(255) NULL
  screen_resolution     VARCHAR(20) NULL
  window_blur_count     SMALLINT UNSIGNED DEFAULT 0
  tab_switch_count      SMALLINT UNSIGNED DEFAULT 0
  flagged_for_review    TINYINT(1) DEFAULT 0
  flagged_reason        TEXT NULL
  reviewed_by           BIGINT UNSIGNED NULL
  reviewed_at           TIMESTAMP NULL
  override_result       ENUM('pass', 'fail') NULL
  override_reason       TEXT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (exam_id) REFERENCES academy_exams(id)
  FOREIGN KEY (user_id) REFERENCES users(id)

-- Answers submitted per attempt
academy_exam_responses
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  attempt_id            BIGINT UNSIGNED NOT NULL
  question_id           BIGINT UNSIGNED NOT NULL
  response_data         JSON NOT NULL DEFAULT '{}'
  is_correct            TINYINT(1) NULL
  marks_awarded         DECIMAL(5,2) NULL
  time_spent_seconds    SMALLINT UNSIGNED DEFAULT 0
  flagged_by_user       TINYINT(1) DEFAULT 0
  graded_by             BIGINT UNSIGNED NULL
  grader_feedback       TEXT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (attempt_id) REFERENCES academy_exam_attempts(id) ON DELETE CASCADE

-- Exam violation log (individual events)
academy_exam_violations
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  attempt_id            BIGINT UNSIGNED NOT NULL
  violation_type        ENUM('tab_switch', 'window_blur', 'copy_attempt', 'paste_attempt', 'print_attempt', 'context_menu', 'devtools_open', 'multiple_monitors', 'idle_timeout', 'screen_share_detected') NOT NULL
  occurred_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  details               JSON NULL
  FOREIGN KEY (attempt_id) REFERENCES academy_exam_attempts(id) ON DELETE CASCADE
```

## 6.4 Question Bank Tables

```sql
-- Questions
academy_questions
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  question_text         LONGTEXT NOT NULL
  question_html         LONGTEXT NULL
  question_type         ENUM('mcq', 'multi_select', 'true_false', 'scenario', 'essay', 'board_position', 'fill_blank', 'matching', 'ordering') NOT NULL
  category              VARCHAR(100) NOT NULL
  sub_category          VARCHAR(100) NULL
  difficulty            ENUM('easy', 'medium', 'hard', 'expert') NOT NULL DEFAULT 'medium'
  marks                 DECIMAL(4,2) NOT NULL DEFAULT 1.00
  negative_marks        DECIMAL(4,2) NOT NULL DEFAULT 0.00
  tags                  JSON NOT NULL DEFAULT '[]'
  explanation           LONGTEXT NULL
  explanation_html      LONGTEXT NULL
  fide_article_reference VARCHAR(100) NULL
  reference_material    TEXT NULL
  fen_position          VARCHAR(100) NULL
  pgn_data              LONGTEXT NULL
  board_instructions    TEXT NULL
  image_path            VARCHAR(2048) NULL
  audio_path            VARCHAR(2048) NULL
  is_active             TINYINT(1) DEFAULT 1
  is_approved           TINYINT(1) DEFAULT 0
  approved_by           BIGINT UNSIGNED NULL
  approved_at           TIMESTAMP NULL
  created_by            BIGINT UNSIGNED NOT NULL
  times_used            INT UNSIGNED DEFAULT 0
  times_correct         INT UNSIGNED DEFAULT 0
  discrimination_index  DECIMAL(5,4) NULL
  difficulty_index      DECIMAL(5,4) NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  deleted_at            TIMESTAMP NULL
  FOREIGN KEY (created_by) REFERENCES users(id)

-- Answer options for MCQ and multi-select
academy_question_options
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  question_id           BIGINT UNSIGNED NOT NULL
  option_text           TEXT NOT NULL
  option_html           TEXT NULL
  is_correct            TINYINT(1) DEFAULT 0
  explanation           TEXT NULL
  sort_order            TINYINT UNSIGNED DEFAULT 0
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (question_id) REFERENCES academy_questions(id) ON DELETE CASCADE

-- Exam question mapping (which questions belong to which exam)
academy_exam_questions
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  exam_id               BIGINT UNSIGNED NOT NULL
  question_id           BIGINT UNSIGNED NOT NULL
  sort_order            SMALLINT UNSIGNED DEFAULT 0
  marks_override        DECIMAL(4,2) NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  UNIQUE KEY (exam_id, question_id)
  FOREIGN KEY (exam_id) REFERENCES academy_exams(id) ON DELETE CASCADE
  FOREIGN KEY (question_id) REFERENCES academy_questions(id) ON DELETE CASCADE
```

## 6.5 Certification & License Tables

```sql
-- Certificate records
academy_certificates
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  certificate_number    VARCHAR(50) UNIQUE NOT NULL
  user_id               BIGINT UNSIGNED NOT NULL
  exam_attempt_id       BIGINT UNSIGNED NULL
  course_id             BIGINT UNSIGNED NULL
  seminar_id            BIGINT UNSIGNED NULL
  certificate_type      ENUM('national_arbiter', 'fide_arbiter', 'international_arbiter', 'course_completion', 'seminar_attendance', 'cpd') NOT NULL
  title_awarded         VARCHAR(100) NOT NULL
  issued_date           DATE NOT NULL
  issued_by             BIGINT UNSIGNED NOT NULL
  expiry_date           DATE NULL
  status                ENUM('active', 'expired', 'revoked', 'superseded') DEFAULT 'active'
  pdf_path              VARCHAR(2048) NULL
  pdf_generated_at      TIMESTAMP NULL
  qr_code_data          TEXT NULL
  verification_hash     VARCHAR(64) UNIQUE NOT NULL
  revoked_at            TIMESTAMP NULL
  revoked_by            BIGINT UNSIGNED NULL
  revocation_reason     TEXT NULL
  metadata              JSON NOT NULL DEFAULT '{}'
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (user_id) REFERENCES users(id)

-- Digital licenses
academy_licenses
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  license_number        VARCHAR(50) UNIQUE NOT NULL
  user_id               BIGINT UNSIGNED NOT NULL
  certificate_id        BIGINT UNSIGNED NOT NULL
  title                 ENUM('na', 'fa', 'ia') NOT NULL
  issue_date            DATE NOT NULL
  expiry_date           DATE NOT NULL
  status                ENUM('active', 'expired', 'suspended', 'revoked', 'pending_renewal') DEFAULT 'active'
  renewal_count         TINYINT UNSIGNED DEFAULT 0
  last_renewed_at       DATE NULL
  suspended_at          TIMESTAMP NULL
  suspended_by          BIGINT UNSIGNED NULL
  suspension_reason     TEXT NULL
  revoked_at            TIMESTAMP NULL
  revoked_by            BIGINT UNSIGNED NULL
  revocation_reason     TEXT NULL
  notes                 TEXT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (user_id) REFERENCES users(id)
  FOREIGN KEY (certificate_id) REFERENCES academy_certificates(id)
```

## 6.6 CPD Tables

```sql
-- CPD requirements by title
academy_cpd_requirements
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  title                 ENUM('na', 'fa', 'ia') NOT NULL
  period_years          TINYINT UNSIGNED NOT NULL DEFAULT 2
  required_points       SMALLINT UNSIGNED NOT NULL
  mandatory_activities  JSON NOT NULL DEFAULT '[]'
  description           TEXT NULL
  effective_from        DATE NOT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- CPD activities that can earn points
academy_cpd_activities
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  title                 VARCHAR(255) NOT NULL
  description           TEXT NULL
  activity_type         ENUM('course', 'seminar', 'webinar', 'assessment', 'fide_event', 'tournament', 'mentoring', 'research', 'other') NOT NULL
  source_type           ENUM('internal', 'external') DEFAULT 'internal'
  source_id             BIGINT UNSIGNED NULL
  points                SMALLINT UNSIGNED NOT NULL
  max_points_per_period SMALLINT UNSIGNED NULL
  eligible_titles       JSON NOT NULL DEFAULT '[]'
  requires_verification TINYINT(1) DEFAULT 0
  is_active             TINYINT(1) DEFAULT 1
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Individual CPD records per user
academy_cpd_records
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id               BIGINT UNSIGNED NOT NULL
  activity_id           BIGINT UNSIGNED NULL
  title                 VARCHAR(255) NOT NULL
  activity_type         VARCHAR(100) NOT NULL
  points_earned         SMALLINT UNSIGNED NOT NULL
  completion_date       DATE NOT NULL
  evidence_path         VARCHAR(2048) NULL
  notes                 TEXT NULL
  status                ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'
  reviewed_by           BIGINT UNSIGNED NULL
  reviewed_at           TIMESTAMP NULL
  review_notes          TEXT NULL
  period_start          DATE NOT NULL
  period_end            DATE NOT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (user_id) REFERENCES users(id)
```

## 6.7 Seminar Tables

```sql
-- Seminars and workshops
academy_seminars
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  title                 VARCHAR(255) NOT NULL
  slug                  VARCHAR(255) UNIQUE NOT NULL
  description           LONGTEXT NULL
  seminar_type          ENUM('national_arbiter', 'fide_arbiter', 'ia', 'workshop', 'webinar', 'refresher') NOT NULL
  format                ENUM('physical', 'online', 'hybrid') NOT NULL DEFAULT 'physical'
  location              VARCHAR(255) NULL
  venue_address         TEXT NULL
  state                 VARCHAR(100) NULL
  online_platform       VARCHAR(100) NULL
  online_meeting_url    VARCHAR(2048) NULL
  online_meeting_id     VARCHAR(100) NULL
  online_meeting_password VARCHAR(100) NULL
  lead_instructor_id    BIGINT UNSIGNED NOT NULL
  instructor_ids        JSON NOT NULL DEFAULT '[]'
  start_date            DATETIME NOT NULL
  end_date              DATETIME NOT NULL
  registration_deadline DATETIME NULL
  capacity              SMALLINT UNSIGNED NULL
  waitlist_capacity     SMALLINT UNSIGNED NULL
  min_attendance_percent TINYINT UNSIGNED DEFAULT 80
  fee                   DECIMAL(10,2) NOT NULL DEFAULT 0.00
  fee_currency          VARCHAR(3) DEFAULT 'NGN'
  is_free               TINYINT(1) DEFAULT 0
  sponsored_by          VARCHAR(255) NULL
  exam_id               BIGINT UNSIGNED NULL
  cpd_points            TINYINT UNSIGNED DEFAULT 0
  materials             JSON NOT NULL DEFAULT '[]'
  status                ENUM('draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft'
  banner_path           VARCHAR(2048) NULL
  created_by            BIGINT UNSIGNED NOT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Seminar registrations
academy_seminar_registrations
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  seminar_id            BIGINT UNSIGNED NOT NULL
  user_id               BIGINT UNSIGNED NOT NULL
  registration_number   VARCHAR(50) UNIQUE NOT NULL
  status                ENUM('registered', 'waitlisted', 'cancelled', 'attended', 'no_show') DEFAULT 'registered'
  registered_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  payment_id            BIGINT UNSIGNED NULL
  payment_status        ENUM('free', 'paid', 'waived', 'pending') DEFAULT 'free'
  attended              TINYINT(1) DEFAULT 0
  attendance_percentage TINYINT UNSIGNED DEFAULT 0
  join_time             TIMESTAMP NULL
  leave_time            TIMESTAMP NULL
  exam_unlocked         TINYINT(1) DEFAULT 0
  notes                 TEXT NULL
  UNIQUE KEY (seminar_id, user_id)
  FOREIGN KEY (seminar_id) REFERENCES academy_seminars(id)
  FOREIGN KEY (user_id) REFERENCES users(id)
```

## 6.8 Simulation & Scenario Tables

```sql
-- Advanced scenario/simulation definitions
academy_scenarios
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  title                 VARCHAR(255) NOT NULL
  description           LONGTEXT NULL
  scenario_type         ENUM('board_position', 'case_study', 'decision_tree', 'hall_simulation', 'tournament_management') NOT NULL
  difficulty            ENUM('easy', 'medium', 'hard', 'expert') NOT NULL DEFAULT 'medium'
  target_level          ENUM('candidate', 'na', 'fa', 'ia') NOT NULL
  total_steps           SMALLINT UNSIGNED NOT NULL DEFAULT 1
  passing_score         TINYINT UNSIGNED DEFAULT 70
  estimated_minutes     SMALLINT UNSIGNED DEFAULT 15
  category              VARCHAR(100) NOT NULL
  tags                  JSON NOT NULL DEFAULT '[]'
  introduction          LONGTEXT NULL
  is_active             TINYINT(1) DEFAULT 1
  created_by            BIGINT UNSIGNED NOT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Chess positions used in scenarios
academy_scenario_positions
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  scenario_id           BIGINT UNSIGNED NOT NULL
  step_number           SMALLINT UNSIGNED NOT NULL DEFAULT 1
  fen                   VARCHAR(100) NOT NULL
  pgn                   LONGTEXT NULL
  move_number           SMALLINT UNSIGNED NULL
  side_to_move          ENUM('white', 'black', 'none') DEFAULT 'none'
  context_text          LONGTEXT NULL
  clock_white_seconds   INT UNSIGNED NULL
  clock_black_seconds   INT UNSIGNED NULL
  incident_type         VARCHAR(100) NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  FOREIGN KEY (scenario_id) REFERENCES academy_scenarios(id) ON DELETE CASCADE

-- Decision tree nodes for branching scenarios
academy_decision_nodes
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  scenario_id           BIGINT UNSIGNED NOT NULL
  parent_node_id        BIGINT UNSIGNED NULL
  step_number           SMALLINT UNSIGNED NOT NULL
  question_text         LONGTEXT NOT NULL
  context_text          LONGTEXT NULL
  node_type             ENUM('question', 'outcome_pass', 'outcome_fail', 'information') NOT NULL DEFAULT 'question'
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  FOREIGN KEY (scenario_id) REFERENCES academy_scenarios(id) ON DELETE CASCADE

-- Actions available at each decision node
academy_decision_actions
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  node_id               BIGINT UNSIGNED NOT NULL
  action_text           VARCHAR(500) NOT NULL
  is_correct            TINYINT(1) DEFAULT 0
  explanation           LONGTEXT NULL
  fide_article_reference VARCHAR(100) NULL
  next_node_id          BIGINT UNSIGNED NULL
  points                DECIMAL(4,2) DEFAULT 0.00
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  FOREIGN KEY (node_id) REFERENCES academy_decision_nodes(id) ON DELETE CASCADE

-- Simulation attempts
academy_simulation_attempts
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  scenario_id           BIGINT UNSIGNED NOT NULL
  user_id               BIGINT UNSIGNED NOT NULL
  status                ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress'
  started_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  completed_at          TIMESTAMP NULL
  decision_accuracy     DECIMAL(5,2) NULL
  rule_accuracy         DECIMAL(5,2) NULL
  response_time_avg     DECIMAL(6,2) NULL
  final_score           DECIMAL(5,2) NULL
  pass_fail             ENUM('pass', 'fail', 'incomplete') DEFAULT 'incomplete'
  path_taken            JSON NOT NULL DEFAULT '[]'
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  FOREIGN KEY (scenario_id) REFERENCES academy_scenarios(id)
  FOREIGN KEY (user_id) REFERENCES users(id)
```

## 6.9 Promotion & Badge Tables

```sql
-- Promotion pathway requirements
academy_promotion_requirements
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  from_level            ENUM('candidate', 'na', 'fa') NOT NULL
  to_level              ENUM('na', 'fa', 'ia') NOT NULL
  requirement_type      ENUM('exam', 'seminar', 'norms', 'cpd', 'experience', 'mentoring', 'other') NOT NULL
  description           VARCHAR(500) NOT NULL
  quantity_required     SMALLINT UNSIGNED NOT NULL DEFAULT 1
  reference_id          BIGINT UNSIGNED NULL
  is_mandatory          TINYINT(1) DEFAULT 1
  notes                 TEXT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- User progress against promotion requirements
academy_promotion_progress
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id               BIGINT UNSIGNED NOT NULL
  from_level            ENUM('candidate', 'na', 'fa') NOT NULL
  to_level              ENUM('na', 'fa', 'ia') NOT NULL
  requirement_id        BIGINT UNSIGNED NOT NULL
  quantity_completed    SMALLINT UNSIGNED DEFAULT 0
  status                ENUM('not_started', 'in_progress', 'completed', 'waived') DEFAULT 'not_started'
  completed_at          TIMESTAMP NULL
  evidence              JSON NOT NULL DEFAULT '[]'
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  UNIQUE KEY (user_id, requirement_id)
  FOREIGN KEY (user_id) REFERENCES users(id)

-- Tournament norms
academy_norms
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id               BIGINT UNSIGNED NOT NULL
  norm_type             ENUM('na', 'fa', 'ia') NOT NULL
  tournament_name       VARCHAR(255) NOT NULL
  tournament_id         BIGINT UNSIGNED NULL
  event_date            DATE NOT NULL
  location              VARCHAR(255) NULL
  chief_arbiter_id      BIGINT UNSIGNED NULL
  role                  VARCHAR(100) NOT NULL
  verified              TINYINT(1) DEFAULT 0
  verified_by           BIGINT UNSIGNED NULL
  verified_at           TIMESTAMP NULL
  rejection_reason      TEXT NULL
  notes                 TEXT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  FOREIGN KEY (user_id) REFERENCES users(id)

-- Badge definitions
academy_badges
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  name                  VARCHAR(100) NOT NULL
  slug                  VARCHAR(100) UNIQUE NOT NULL
  description           TEXT NULL
  icon_path             VARCHAR(2048) NULL
  colour                VARCHAR(7) DEFAULT '#FFD700'
  badge_type            ENUM('achievement', 'specialisation', 'milestone', 'community') NOT NULL
  criteria              JSON NOT NULL DEFAULT '{}'
  is_active             TINYINT(1) DEFAULT 1
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

-- User earned badges
academy_user_badges
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id               BIGINT UNSIGNED NOT NULL
  badge_id              BIGINT UNSIGNED NOT NULL
  earned_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  context               JSON NULL
  UNIQUE KEY (user_id, badge_id)
  FOREIGN KEY (user_id) REFERENCES users(id)
  FOREIGN KEY (badge_id) REFERENCES academy_badges(id)
```

## 6.10 Supporting Tables

```sql
-- Resource library
academy_resources
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  title                 VARCHAR(255) NOT NULL
  description           TEXT NULL
  category              VARCHAR(100) NOT NULL
  file_path             VARCHAR(2048) NOT NULL
  file_type             VARCHAR(50) NOT NULL
  file_size_bytes       BIGINT UNSIGNED NOT NULL
  version               VARCHAR(20) NULL
  language              VARCHAR(10) DEFAULT 'en'
  tags                  JSON NOT NULL DEFAULT '[]'
  is_public             TINYINT(1) DEFAULT 0
  eligible_roles        JSON NOT NULL DEFAULT '[]'
  view_count            INT UNSIGNED DEFAULT 0
  download_count        INT UNSIGNED DEFAULT 0
  uploaded_by           BIGINT UNSIGNED NOT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Notifications
academy_notifications
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  user_id               BIGINT UNSIGNED NOT NULL
  type                  VARCHAR(100) NOT NULL
  title                 VARCHAR(255) NOT NULL
  body                  TEXT NOT NULL
  data                  JSON NULL
  read_at               TIMESTAMP NULL
  action_url            VARCHAR(2048) NULL
  icon                  VARCHAR(100) NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  INDEX (user_id, read_at)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- Announcements
academy_announcements
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  title                 VARCHAR(255) NOT NULL
  body                  LONGTEXT NOT NULL
  announcement_type     ENUM('general', 'exam', 'seminar', 'rule_change', 'certification', 'urgent') DEFAULT 'general'
  target_audience       JSON NOT NULL DEFAULT '[]'
  is_pinned             TINYINT(1) DEFAULT 0
  publish_at            TIMESTAMP NULL
  expires_at            TIMESTAMP NULL
  created_by            BIGINT UNSIGNED NOT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Audit log
academy_audit_logs
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  user_id               BIGINT UNSIGNED NULL
  action                VARCHAR(255) NOT NULL
  model_type            VARCHAR(100) NULL
  model_id              BIGINT UNSIGNED NULL
  old_values            JSON NULL
  new_values            JSON NULL
  ip_address            VARCHAR(45) NULL
  user_agent            TEXT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  INDEX (user_id, created_at)
  INDEX (model_type, model_id)

-- Mentorship
academy_mentorships
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  mentor_id             BIGINT UNSIGNED NOT NULL
  mentee_id             BIGINT UNSIGNED NOT NULL
  status                ENUM('pending', 'active', 'completed', 'terminated') DEFAULT 'pending'
  started_at            TIMESTAMP NULL
  ended_at              TIMESTAMP NULL
  goals                 TEXT NULL
  notes                 TEXT NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (mentor_id) REFERENCES users(id)
  FOREIGN KEY (mentee_id) REFERENCES users(id)

-- Mentorship interactions
academy_mentorship_interactions
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  mentorship_id         BIGINT UNSIGNED NOT NULL
  interaction_type      ENUM('message', 'meeting', 'resource_shared', 'feedback', 'milestone') NOT NULL
  content               TEXT NULL
  interaction_date      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  logged_by             BIGINT UNSIGNED NOT NULL
  FOREIGN KEY (mentorship_id) REFERENCES academy_mentorships(id)
```

---

# 7. USER ROLES & PERMISSION SYSTEM

## 7.1 Role Definitions

### Role: candidate
A user who is studying toward their first arbiter certification. Has not yet passed any certification examination.

**Default Permissions:**
- `courses.view.beginner` — view beginner-level courses
- `courses.enroll.free` — enroll in free courses
- `practice.attempt` — take unlimited practice exams
- `exams.certification.attempt` — take certification exams they are eligible for
- `resources.download.public` — download publicly available resources
- `seminars.view` — view seminar listings
- `seminars.register` — register for seminars
- `profile.edit` — edit own profile
- `certificates.view.own` — view own certificates
- `notifications.manage` — manage own notification preferences

**Restrictions:**
- Cannot access CPD modules
- Cannot access FA or IA materials
- Cannot access advanced courses
- Cannot create or edit any content

### Role: national_arbiter (na)
A user who holds a valid National Arbiter title and license.

**Inherits all candidate permissions, plus:**
- `courses.view.na` — view NA-level courses
- `cpd.track` — access CPD tracker
- `cpd.records.create` — submit CPD activity records
- `recertification.attempt` — take recertification quizzes
- `licenses.view.own` — view own license
- `resources.download.na` — download NA-level resources
- `refresher.access.na` — access NA refresher courses
- `promotion.track` — view promotion requirements

### Role: fide_arbiter (fa)
A user who holds a valid FIDE Arbiter title.

**Inherits all national_arbiter permissions, plus:**
- `courses.view.fa` — view FA-level courses
- `resources.download.fa` — download FA-level resources
- `refresher.access.fa` — access FA refresher courses
- `mentoring.mentor` — act as a mentor to candidates and NAs
- `exams.grade.assist` — assist with grading (limited to essay review under IA supervision)

### Role: international_arbiter (ia)
A user who holds a valid International Arbiter title.

**Inherits all fide_arbiter permissions, plus:**
- `courses.view.ia` — view IA-level courses
- `resources.download.ia` — download all resources
- `content.create.seminar` — create seminar content
- `exams.grade.manual` — grade essay responses
- `certifications.recommend` — recommend certification approvals
- `assessments.manual_grade` — grade manual assessments

### Role: instructor
A content-creation role, may not hold an arbiter title.

**Permissions:**
- `courses.create` — create new courses
- `courses.edit.own` — edit own courses
- `exams.create` — create examinations
- `questions.create` — create questions
- `questions.edit.own` — edit own questions
- `seminars.manage.assigned` — manage assigned seminars
- `resources.upload` — upload resources
- `reports.view.courses` — view course engagement reports
- `reports.view.exams` — view exam performance reports

### Role: academy_admin
Full administrative access to all academy functions.

**All permissions plus:**
- `users.manage` — manage all users
- `roles.manage` — manage roles and permissions
- `courses.manage` — manage all courses
- `exams.manage` — manage all examinations
- `questions.manage` — manage all questions
- `certificates.manage` — issue, revoke, manage certificates
- `licenses.manage` — manage all licenses
- `cpd.manage` — manage CPD requirements and records
- `seminars.manage` — manage all seminars
- `reports.all` — access all reports
- `audit.view` — view audit logs
- `system.settings` — manage system settings

### Role: super_admin
System-level access. NCAA IT staff only.

**All academy_admin permissions plus:**
- `system.maintenance` — enable maintenance mode
- `system.migrations` — run database migrations
- `system.backups` — manage backups
- `integrations.manage` — manage external integrations
- `audit.export` — export audit logs

## 7.2 Permission Evaluation Logic

Permissions are evaluated using the following priority order:

1. Check if user has `super_admin` role → allow all
2. Check if user has `academy_admin` role → allow all academy permissions
3. Check direct user permissions (user-level override)
4. Check role permissions (role-based permissions)
5. If no permission found → deny

## 7.3 Context-Based Access Control

Beyond roles, certain resources require context checks:

- **License Active Check**: CPD tracker requires an active license
- **Enrollment Check**: Course content requires active enrollment
- **Prerequisite Check**: Advanced courses require completion of prerequisites
- **Attendance Check**: Certification exam locked if seminar attendance < 80%
- **Cooldown Check**: Certification exams have retry cooldown periods
- **Period Check**: Exams have available_from and available_until windows

---

# 8. AUTHENTICATION & SECURITY

## 8.1 Authentication Flow

=
```

### Login
```
1. User submits email + password
2. System validates credentials
3. If 2FA enabled: send TOTP code via authenticator app
4. On success: issue Laravel Sanctum API token (SPA token)
5. Store in HTTP-only cookie
6. Log login time and IP
7. If suspicious login (new location, new device): send security alert email
```

### Password Reset
```
1. User requests password reset
2. System sends signed reset link (expires in 60 minutes)
3. User clicks link → enters new password
4. All existing sessions invalidated
5. Login required again
```


## 8.2 Two-Factor Authentication

Users can enable TOTP-based 2FA via:
- Authenticator apps (Google Authenticator, Authy)
- Backup codes (8 single-use codes, downloadable as PDF)

2FA is **mandatory** for:
- academy_admin role
- super_admin role
- Instructors creating certification exams

## 8.3 Session Management

```
Session duration (regular users): 8 hours of inactivity
Session duration (exam): Duration of exam + 30 minutes
Session duration (admin): 4 hours of inactivity
Concurrent sessions: Allowed (multi-device)
Session invalidation: On password change, role change, account suspension
```

## 8.4 Exam Security

### Browser-Level Controls
```javascript
// Implemented via React exam wrapper component
- Disable right-click context menu
- Disable keyboard shortcuts: Ctrl+C, Ctrl+V, Ctrl+P, Ctrl+S, F12
- Detect DevTools open (window.outerWidth - window.innerWidth > threshold)
- Detect window blur (user switched tabs or windows)
- Track idle time (no interaction > 2 minutes = warning; > 5 minutes = auto-submit)
- Disable text selection on question content
- Disable print media queries for question content
```

### Server-Level Controls
```
- Validate that each answer submission comes from the same IP as the session start
- Enforce one active attempt per exam per user at a time
- Timestamp each answer submission server-side
- Rate limit: max 1 answer submission per second
- Validate that the time between start and submit is within the allowed duration
- Token rotation: issue short-lived tokens for each answer submission
```

### Anti-Cheating Log
```
Every violation is logged:
- Violation type (see ENUM in database)
- Exact timestamp
- Count of violations
- At 3 violations: warning shown to user
- At 10 violations: exam flagged for admin review
- At 20 violations (or DevTools open + 5+ tab switches): exam auto-submitted and flagged
```

## 8.5 API Security

```
- All API routes require authentication (Sanctum token or session)
- Public routes: registration, login, certificate verification endpoint
- Rate limiting: 60 requests/minute for authenticated users; 10/minute for guests
- CORS: restricted to academy.ncaaweb.com.ng and admin origins
- Request validation: all inputs validated with Laravel Form Requests
- SQL injection: impossible via Eloquent ORM (never raw queries with user input)
- XSS: all outputs escaped; Content-Security-Policy headers set
- CSRF: Laravel CSRF token on all state-changing requests
- HTTPS: enforced via Cloudflare + HSTS headers (min-age: 31536000)
```

## 8.6 Data Protection

```
- Passwords: hashed with bcrypt (cost factor 12)
- Sensitive fields: encrypted at rest (2FA secrets, ID numbers)
- PII: user data deletable on request (GDPR-style right to erasure)
- Certificate verification hashes: SHA-256, generated on issue
- File uploads: virus-scanned, type-validated, stored outside web root
- Database: daily automated backups, 30-day retention, encrypted
```

---

# 9. DASHBOARD SYSTEM

## 9.1 Dashboard Architecture

The dashboard is dynamically rendered based on the authenticated user's role and arbiter title. It is the first screen a user sees after login and serves as a personalised control panel.

**Underlying data queries are cached with Redis for 5 minutes per user to minimise DB load during peak hours.**

## 9.2 Candidate Dashboard

```
Layout: 12-column grid

Row 1 — Welcome Banner
┌────────────────────────────────────────────────────┐
│ Welcome back, {first_name}                          │
│ Your journey to National Arbiter                   │
│ [Continue Learning ▶]                              │
└────────────────────────────────────────────────────┘

Row 2 — Key Metrics (4 cards)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Progress │ │ Modules  │ │ Practice │ │ Upcoming │
│   62%    │ │  8 / 12  │ │  Score   │ │ Seminar  │
│          │ │          │ │   74%    │ │  3 days  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Row 3 — Progress & Next Action
┌────────────────────────────┐ ┌──────────────────────┐
│ Course Progress             │ │ Next Action          │
│ ████████████░░░░ 62%       │ │                      │
│                             │ │ Complete Module 9:   │
│ Laws of Chess    ████ 100% │ │ Pairing Systems      │
│ Rapid Rules      ██░░  50% │ │                      │
│ Anti-Cheating    ░░░░   0% │ │ [Start Module 9 →]   │
└────────────────────────────┘ └──────────────────────┘

Row 4 — Recent Activity & Upcoming
┌────────────────────────────┐ ┌──────────────────────┐
│ Recent Activity             │ │ Upcoming Exams       │
│ • Completed Lesson 8.3     │ │ NCAA NA Seminar Exam │
│ • Practice: 14/20 correct  │ │ Date: DD/MM/YYYY     │
│ • Downloaded Laws PDF       │ │ Duration: 90 min     │
└────────────────────────────┘ └──────────────────────┘
```

## 9.3 Licensed Arbiter Dashboard (NA/FA/IA)

```
Row 1 — Status Banner
┌──────────────────────────────────────────────────────┐
│ Title: National Arbiter                               │
│ License: NCA-2025-0042 | Status: Active ✓            │
│ Expires: March 2028 | 2 years 4 months remaining     │
└──────────────────────────────────────────────────────┘

Row 2 — Key Metrics
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ CPD      │ │ Promo    │ │ Pending  │ │ Rule     │
│ 34/50    │ │ 75%      │ │ Exams    │ │ Updates  │
│ points   │ │ ready    │ │  1       │ │  2 new   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Row 3 — CPD Tracker
┌──────────────────────────────────────────────────────┐
│ CPD Progress — 2025–2027 Period                       │
│ ████████████████████░░░░░░░░ 34 / 50 points         │
│ 18 points needed by March 2027                       │
│ [View CPD Record] [Log New Activity]                  │
└──────────────────────────────────────────────────────┘

Row 4 — Promotion Readiness
┌────────────────────────────┐ ┌──────────────────────┐
│ Promotion to FA             │ │ Pending Tasks        │
│ ✓ Training Complete         │ │ □ FIDE Laws Update   │
│ ✓ NA Exam Passed            │ │ □ Annual Refresher   │
│ □ 2 Norms Required (1/2)   │ │ □ Ethics Course      │
│ □ CPD Minimum (34/40)      │ │                      │
│ Progress: ██████░░ 75%     │ │ [View All Tasks →]   │
└────────────────────────────┘ └──────────────────────┘
```

## 9.4 Instructor Dashboard

```
Row 1 — Quick Stats
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Courses  │ │ Students │ │ Pending  │ │ Avg Pass │
│ 4 active │ │  248     │ │ Grading  │ │ Rate 71% │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Row 2 — Courses I Manage
[Table of courses with title, enrolled count, avg completion, last updated]

Row 3 — Pending Manual Grading
[List of essay submissions waiting for review]

Row 4 — Upcoming Seminars
[Seminars this instructor is leading]
```

## 9.5 Admin Dashboard

```
Row 1 — System Health
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Total    │ │ Active   │ │ Exams    │ │ Certs    │ │ Pending  │
│ Users    │ │ Licenses │ │ Today    │ │ Issued   │ │ Reviews  │
│  1,234   │ │  687     │ │  23      │ │  89 total│ │   7      │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

Row 2 — Activity Charts
[7-day exam attempts line chart] | [CPD compliance pie chart]

Row 3 — Recent Activity & Alerts
[Latest exam submissions] | [System alerts: expiring licenses, pending approvals]

Row 4 — Quick Actions
[Create Announcement] [Upload Resource] [Schedule Seminar] [Generate Report]
```

---

# 10. LEARNING MANAGEMENT SYSTEM (LMS)

## 10.1 Course Catalog

### Filtering & Sorting

```
Filter Panel (left sidebar):
├── Level
│   ├── □ Beginner
│   ├── □ National Arbiter
│   ├── □ FIDE Arbiter
│   ├── □ International Arbiter
│   └── □ CPD
├── Topic
│   ├── □ Laws of Chess
│   ├── □ Pairings
│   ├── □ Anti-Cheating
│   ├── □ Tournament Regulations
│   ├── □ Ethics
│   ├── □ Appeals
│   └── □ International Regulations
├── Duration
│   ├── □ Under 1 hour
│   ├── □ 1–3 hours
│   └── □ 3+ hours
├── Status
│   ├── □ Not Started
│   ├── □ In Progress
│   └── □ Completed
└── CPD Points
    ├── □ Earns CPD Points
    └── □ Any

Sort Options:
- Recommended (default for users with history)
- Newest First
- Most Popular
- CPD Points (high to low)
- Duration (short to long)
- Alphabetical
```

### Course Card Component

```
┌──────────────────────────────────┐
│ [Thumbnail Image]                │
│                       [Level Tag]│
├──────────────────────────────────┤
│ Course Title                     │
│ Short description (2 lines max)  │
│                                  │
│ 📚 12 modules  ⏱ 4.5 hrs        │
│ 🏆 3 CPD points  👥 124 enrolled│
├──────────────────────────────────┤
│ ████████░░░░ 65% complete        │
│ [Continue →]  or  [Enroll Free] │
└──────────────────────────────────┘
```

## 10.2 Course Viewer

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER: Course Title | Breadcrumb | Progress %               │
├──────────────┬───────────────────────────────────────────────┤
│ SIDEBAR      │  CONTENT AREA                                  │
│              │                                                │
│ Module 1 ▼  │  [Active Lesson Content]                       │
│   ✓ Lesson 1│  Video / Document / Quiz / Interactive Board   │
│   ✓ Lesson 2│                                                │
│   ▶ Lesson 3│                                                │
│   ○ Lesson 4│  ─────────────────────────────────────────── │
│              │  [Notes Panel — collapsible]                  │
│ Module 2 ▶  │  [Your notes for this lesson]                 │
│ Module 3 ▶  │                                                │
│              │  ────────────────────────────────────────────│
│ Resources    │  Navigation: [← Previous]  [Next →]          │
│ Discussions  │  [Mark as Complete]                           │
└──────────────┴───────────────────────────────────────────────┘
```

### Video Player Features

```
Controls:
- Play/Pause
- Volume
- Playback speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- Quality selector (if multiple resolutions stored)
- Full screen
- Captions toggle (if transcript available)
- Picture-in-picture

Progress:
- Saves position every 10 seconds to database
- On return: "Resume from 12:34?" prompt
- Marks complete when user reaches 90% of video

Interactions:
- "Take Note" button: opens note panel, pre-fills timestamp
- Transcript tab: shows full searchable transcript, click to jump
- Speed learning: allows 1.5x / 2x viewing for revisits

Mobile:
- Swipe left/right to skip 10 seconds
- Double-tap to pause
- Pinch to zoom (full-screen mode)
```

## 10.3 Interactive Chess Board Component

This is a critical feature of the LMS. It uses `chess.js` for game logic and `react-chessboard` for rendering.

### Board Feature Set

```
View Modes:
- Static display: show a position, no moves
- Replay mode: step through PGN moves forward/backward
- Interactive exercise: candidate makes a decision/move

Controls:
- Flip board button
- Reset to start button
- Step forward / backward through moves
- Auto-play at configurable speed
- Highlight last move
- Show/hide arrows
- Show/hide coordinates
- Show/hide piece legal moves on hover

Clock Display (when relevant):
- White time / Black time
- Displayed as actual increment clocks

Annotation Support:
- Display comment for each move
- Highlight squares (arrows and coloured squares from PGN annotations)
- Mark specific squares as "important"

Exercise Types:
1. Observation only: "What do you notice about this position?"
2. Rule identification: "What FIDE article applies here?"
3. Move selection: "Click the piece that should have been moved (touch move)"
4. Decision point: "What should the arbiter do?"
5. Sequence replay: "Step through this game and identify when the illegal move occurred"
```

### PGN Exercise Example Flow

```
1. Lesson presents: "Study Game A vs B, Round 3"
2. Board initialises at starting position
3. Candidate steps through moves using forward button
4. At move 34, an annotation appears: "A critical moment"
5. Board pauses. Question shown: "Black claims threefold repetition. Is the claim valid?"
6. Options: [Valid] [Not Valid]
7. Candidate selects. System evaluates.
8. Explanation shown: "The position occurred twice, not three times. Claim invalid. See Article 9.2."
9. Board continues to next annotated moment.
```

## 10.4 My Learning

A personal progress hub showing:

```
Tabs:
- In Progress (sorted by last accessed)
- Completed
- Assigned to Me
- Bookmarked

For each course:
- Progress bar
- Last accessed date
- Time remaining estimate
- Next lesson to do
- Certificate download button (if completed)

Learning Statistics:
- Total time spent learning
- Courses completed this month
- Current streak (days with learning activity)
- CPD points earned from courses
```

---

# 11. COURSE MANAGEMENT

## 11.1 Course Creation Flow (Instructor/Admin)

### Step 1: Basic Information

```
Fields:
- Title (required)
- Slug (auto-generated, editable)
- Short description (max 200 chars)
- Full description (rich text editor)
- Level (dropdown)
- Category (multi-select)
- Tags (free-form, suggestion list)
- Thumbnail upload
- Preview video URL (optional)
- Target audience (multi-select of roles)
- Learning outcomes (add/remove list)
- Prerequisites (course selector)
- Estimated duration hours
- CPD points (0–20)
- Is mandatory (toggle + for which roles)
- Pass mark (default 70%)
- Certificate eligible (toggle)
```

### Step 2: Module & Lesson Builder

```
Module Manager (drag-and-drop reorder):
└── Module 1: Laws of Chess Foundation
    ├── Lesson 1.1: Introduction to the Laws (Video)
    ├── Lesson 1.2: The Chessboard Setup (Document)
    ├── Lesson 1.3: Piece Movement Rules (Interactive Board)
    └── Lesson 1.4: Module Quiz (Quiz)
```

**Lesson types and their editors:**

| Type | Editor |
|------|--------|
| Video | URL upload / embed + transcript editor |
| Document | File upload (PDF, DOCX, PPTX) |
| Text | Tiptap rich text editor with LaTeX support |
| Interactive Board | FEN input + PGN editor + question builder |
| Quiz | Question selector from question bank |
| PGN Exercise | PGN upload + annotation editor |

### Step 3: Publish Settings

```
- Save as draft
- Schedule for future publish date
- Require review before publish (if instructor, not admin)
- Notify enrolled users when published
- Access restrictions (specific dates, license status)
```

## 11.2 Course Duplication

Admins and instructors can duplicate an entire course (all modules, lessons, settings). Duplicated course is created as a draft. Useful for creating level-based variants.

## 11.3 Course Versioning

When a published course has significant content changes:
1. Admin creates a new version
2. Existing enrolled students remain on the current version
3. New enrollments get the latest version
4. Admins can force-migrate all students to the new version with notification

---

# 12. SEMINAR & WEBINAR SYSTEM

## 12.1 Seminar Creation

### Required Fields

```
Basic Info:
- Title
- Type (NA Seminar, FA Seminar, Workshop, Webinar, Refresher)
- Format (Physical / Online / Hybrid)
- Lead Instructor (user selector with IA/FA filter)
- Co-Instructors (multi-user selector)

Schedule:
- Start Date & Time
- End Date & Time
- Registration Deadline
- Timezone (default: Africa/Lagos)

Location (if physical/hybrid):
- Venue Name
- Full Address
- State
- Google Maps embed link (optional)

Online Details (if online/hybrid):
- Platform (Zoom, Google Meet, Microsoft Teams, Other)
- Meeting URL
- Meeting ID
- Meeting Password

Capacity:
- Maximum Capacity (blank = unlimited)
- Waitlist Capacity (blank = no waitlist)

Fees:
- Fee Amount (0 = free)
- Currency (NGN default)
- Sponsored By (text, optional)

Linked Exam:
- Attach certification exam (exam selector — exam is locked until attendance verified)

CPD:
- CPD Points awarded for attendance
- CPD category

Content:
- Description (rich text)
- Prerequisites
- Materials (file uploads — pre-seminar reading)
- Post-seminar materials (visible after completion)

Banner Image:
- File upload
```

## 12.2 Registration Process

```
User visits Seminar listing → Clicks Register →

Step 1: Check Prerequisites
- Is user role eligible for this seminar type?
- Has user completed required pre-seminar courses?
- If failed: show what's missing with links to complete

Step 2: Check Availability
- Is registration still open?
- Is there capacity available?
- If full: offer waitlist option

Step 3: Payment (if fee > 0)
- Redirect to NCAA Payment System
- On successful payment: registration confirmed
- On failed payment: registration cancelled, user notified

Step 4: Confirmation
- Registration confirmation email sent
- Calendar invite attachment (.ics file)
- Access to pre-seminar materials unlocked
- Added to seminar participant list
```

## 12.3 Attendance Tracking

### Physical Seminars

```
- QR code generated per registration (unique token)
- Instructor/admin scans QR code at check-in
- Admin panel shows real-time attendance count
- Manual attendance marking also available
- Attendance percentage: time present / total seminar duration
```

### Online Seminars

```
System tracks via platform integration or manual log:
- Join Time (when user clicks meeting link through platform)
- Leave Time (estimated or manually logged)
- Attendance Percentage = (time attended / seminar duration) × 100

If attendance platform integration is unavailable:
- Instructor manually uploads attendance CSV
- System processes file and updates attendance records

Attendance Lock Logic:
- If attendance_percentage < min_attendance_percent (default 80%)
  → exam remains locked
  → user receives notification: "Your attendance was 72%. Minimum required is 80%."
  → Admin can manually override and unlock exam on appeal
```

## 12.4 Seminar Management Dashboard (Instructor View)

```
Participants Tab:
- Full list with registration status, attendance, exam status
- Send message to all participants
- Export participant list (PDF/Excel)
- Mark attendance manually

Materials Tab:
- Upload pre-seminar and post-seminar materials
- Manage what's visible to participants vs general public

Exam Tab:
- View exam readiness for all participants
- See who is locked (attendance insufficient)
- Manually unlock specific participants

Communications Tab:
- Send email to all registered participants
- Send reminder notifications
- Post announcement in seminar discussion
```

## 12.5 Waitlist Management

```
When seminar reaches capacity:
- Subsequent registrations go to waitlist
- User notified they are on waitlist with their position number
- If a spot opens (cancellation): first waitlist person is auto-notified
- If they don't confirm within 48 hours: offer moves to next person
- Payment is only charged when confirmed off waitlist
```

---

# 13. EXAMINATION SYSTEM

## 13.1 Exam Access Control

Before a user can start a certification exam, the system validates:

```
Pre-flight Checklist:
1. User is enrolled (registered for seminar or enrolled in prerequisite course)
2. Attendance requirement met (if exam tied to a seminar)
3. No active attempt already in progress
4. User has not exceeded maximum allowed attempts
5. Cooldown period from last attempt has expired
6. Exam is currently within its available window (available_from to available_until)
7. All prerequisite exams have been passed
8. User's account is active and not suspended

If any check fails: show specific reason with guidance on how to resolve.
```

## 13.2 Exam Interface

### Pre-Exam Screen

```
┌────────────────────────────────────────────────────────┐
│ NCAA National Arbiter Certification Examination         │
│                                                         │
│ Instructions:                                           │
│ • You have 90 minutes to complete this examination.    │
│ • There are 60 questions.                              │
│ • Pass mark: 70% (42/60)                               │
│ • Once started, the timer cannot be paused.            │
│ • Do not switch tabs or windows.                       │
│ • Switching windows 3 times will flag your attempt.   │
│ • You may flag questions to revisit.                   │
│                                                         │
│ This attempt will be attempt 2 of 3 allowed.           │
│ You must wait 48 hours before your next attempt.       │
│                                                         │
│ By clicking "Start Examination" you confirm you:       │
│ □ Are in a quiet, private location                     │
│ □ Will not use any external resources                  │
│ □ Have read and agree to the exam rules                │
│                                                         │
│ [Cancel]              [Start Examination →]            │
└────────────────────────────────────────────────────────┘
```

### Exam Interface Layout

```
┌───────────────────────────────────────────────────────────┐
│ HEADER: Timer: 01:23:47 | Q 12/60 | Flag | Remaining: 48 │
├─────────────────────────────┬─────────────────────────────┤
│ QUESTION PANEL              │ NAVIGATION PANEL            │
│                             │                             │
│ Question 12                 │ Question Navigator:         │
│                             │ 1  2  3  4  5  6  7  8  9 │
│ A player touches their rook│ 10 11 [12] 13 14 15 16 17  │
│ but then moves a different  │ 18 19 20 21 22 23 24 25    │
│ piece. What should you do? │ ...                         │
│                             │                             │
│ ○ A. Issue a warning        │ Legend:                     │
│ ○ B. Apply touch move rule  │ ■ Answered                  │
│ ○ C. Allow the move         │ □ Not answered              │
│ ○ D. Stop the clocks        │ ⚑ Flagged                   │
│                             │                             │
│ [Flag this question ⚑]     │ [Submit Examination]        │
└─────────────────────────────┴─────────────────────────────┘
```

### Timer Behaviour

```
- Timer counts down from exam duration
- At 30 minutes remaining: yellow banner warning
- At 10 minutes remaining: orange banner warning, persistent
- At 5 minutes remaining: red banner, audio chime (once)
- At 0: auto-submit (saves all current answers, marks remaining as unanswered)
- Timer syncs with server every 60 seconds (prevents client-side manipulation)
```

## 13.3 Question Rendering by Type

### MCQ (Multiple Choice — Single Answer)

```
Radio button group
One option must be selected to proceed
Cannot submit question without selecting an answer (or must explicitly "skip")
```

### Multi-Select

```
Checkbox group
Instructions shown: "Select ALL correct answers"
Number of correct answers NOT disclosed to candidate
Partial credit: (correct selections - incorrect selections) / total correct * marks
No negative below zero
```

### True / False

```
Two large toggle buttons: TRUE / FALSE
Visually distinct selection state
```

### Scenario Question

```
Scenario text (may include image):
┌──────────────────────────────────────────┐
│ [Scenario description in a shaded box]   │
│ Images may appear here                   │
│ Clock times may be shown                 │
└──────────────────────────────────────────┘

Then question below, followed by answer options.
```

### Interactive Board Question

```
Full react-chessboard rendered above the question.
Controls: flip board, view move history.
Question asks: "Based on this position..." or "Black has just completed this move..."
Answer may be MCQ, True/False, or text input (for essay-type board questions).
```

### Essay Question

```
Tiptap rich text editor (minimal toolbar: bold, italic, numbered list, bullet list)
Word count displayed
Minimum word count enforced (e.g. 100 words minimum)
Saved to database on every keystroke with 500ms debounce
Marked "Pending Manual Grading" after submission
```

## 13.4 Anti-Cheating Engine

### Event Detection

```javascript
// Tab/Window visibility
document.addEventListener('visibilitychange', () => {
  if (document.hidden) logViolation('tab_switch');
});

// Window blur
window.addEventListener('blur', () => logViolation('window_blur'));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (
    (e.ctrlKey && ['c','v','p','s','a','u'].includes(e.key)) ||
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && e.key === 'I')
  ) {
    e.preventDefault();
    logViolation('keyboard_shortcut');
  }
});

// Right click
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  logViolation('context_menu');
});

// DevTools detection (heuristic)
setInterval(() => {
  if (window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160) {
    logViolation('devtools_open');
  }
}, 2000);

// Idle detection
let lastActivity = Date.now();
['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(e =>
  document.addEventListener(e, () => lastActivity = Date.now())
);
setInterval(() => {
  if (Date.now() - lastActivity > 120000) logViolation('idle_timeout');
}, 30000);
```

### Violation Response Logic

```
1–2 violations: Silent log only
3 violations: Toast warning: "You have received a violation warning. Your exam may be flagged."
5–9 violations: Second warning: "Continued violations will result in your exam being flagged for review."
10–19 violations: Exam flagged automatically. Admin notified.
20+ violations: Exam auto-submitted. Flagged as suspicious. Admin review required before result released.
```

## 13.5 Exam Submission & Results

### Submission Flow

```
User clicks "Submit Examination"
→ Confirmation modal: "Are you sure? You have 12 unanswered questions."
→ User confirms
→ All answers sent to server in single transaction
→ Server validates:
    - All answers received
    - Timestamps are within bounds
    - No duplicate submissions
    - Violation count within auto-void threshold
→ Auto-grading runs (MCQ, multi-select, true/false)
→ Essay questions marked as "Pending Manual Grading"
→ Result calculated (if no essay questions: immediate)
→ Result stored
→ Notification sent to user
→ Certificate generation triggered (if passed, no pending manual grading)
```

### Results Screen

```
┌────────────────────────────────────────────────────────────┐
│ Examination Complete                                        │
│                                                             │
│ NCAA National Arbiter Certification Examination            │
│ Completed: DD/MM/YYYY at HH:MM                            │
│                                                             │
│           ┌─────────────┐                                  │
│           │    PASS ✓   │  or  │    FAIL ✗   │            │
│           │   78.3%     │      │   52.0%     │            │
│           └─────────────┘                                  │
│                                                             │
│ Score: 47 / 60 correct                                      │
│ Marks: 78.3 / 100                                          │
│ Pass mark: 70.0 / 100                                      │
│ Time taken: 1h 14m                                         │
│                                                             │
│ ── Performance by Category ──                              │
│ Laws of Chess         █████████░ 90% (18/20)               │
│ Pairings              ███████░░░ 70% (14/20)               │
│ Anti-Cheating         █████░░░░░ 50% (10/20)               │
│                                                             │
│ [Review Answers]  [Download Certificate]  [Back to Home]   │
└────────────────────────────────────────────────────────────┘
```

### Review Mode

After submission, candidates can review all questions with:
- Their selected answer highlighted
- Correct answer revealed (in green)
- Explanation shown
- FIDE article reference shown
- Time spent on each question shown

---

# 14. QUESTION BANK SYSTEM

## 14.1 Question Categories

```
Primary Categories (used for filtering and exam construction):
├── Laws of Chess
│   ├── Basic Rules
│   ├── Piece Movement
│   ├── Special Moves
│   ├── Illegal Moves
│   ├── Draw Conditions
│   └── Touch Move
├── Rapid Chess Rules
├── Blitz Chess Rules
├── Pairings Systems
│   ├── Swiss System
│   ├── Dutch Pairing
│   ├── Round Robin
│   └── Accelerated Pairings
├── Anti-Cheating
│   ├── Detection Methods
│   ├── Procedures
│   ├── Electronics Policy
│   └── Reporting
├── Tournament Regulations
│   ├── Time Controls
│   ├── Scoring
│   ├── Tie-breaks
│   └── Arbiter Procedures
├── Appeals Committee
│   ├── Procedure
│   ├── Evidence
│   └── Rulings
├── Ethics
│   ├── Arbiter Conduct
│   ├── FIDE Ethics Code
│   └── Conflict of Interest
├── Rating Regulations
├── FIDE Handbook
└── Online Chess
```

## 14.2 Question Creation Interface

### Rich Question Editor

```
Question Text:
[Tiptap rich text editor]
- Bold, italic, underline
- Tables
- Image upload
- Code blocks (for FEN/PGN)
- Mathematical notation

Question Type: [Dropdown]

For MCQ / Multi-Select:
Option A: [text input] [correct: toggle]
Option B: [text input] [correct: toggle]
Option C: [text input] [correct: toggle]
Option D: [text input] [correct: toggle]
[+ Add Option] [Shuffle options on delivery: toggle]

For Board Position:
FEN: [input with validate button]
[Board Preview renders in real time]
PGN (optional): [textarea]
Board Instructions: [textarea]

Metadata:
Category: [dropdown]
Sub-category: [dropdown]
Difficulty: [Easy / Medium / Hard / Expert]
Marks: [number input]
Tags: [multi-input]
FIDE Article Reference: [text input, e.g. "Article 7.5.5"]
Reference Material: [text input, e.g. "FIDE Laws 2023, p.14"]

Explanation:
[Tiptap rich text editor — shown to candidate after answering]

Image (optional):
[File upload — shown alongside question text]
```

## 14.3 Question Import

Bulk import from CSV/Excel using a template:

```
Template columns:
question_text | question_type | option_a | option_b | option_c | option_d |
correct_options | category | sub_category | difficulty | marks | explanation |
fide_reference | tags

Validation:
- All required fields present
- Question type valid
- At least one correct option for MCQ
- At least one correct option for multi-select
- Difficulty value valid
- Category exists in system

Import results:
- Imported: N questions
- Errors: N rows with error descriptions
- All imported questions saved as draft (not yet approved)
```

## 14.4 Question Review & Approval Workflow

```
1. Instructor creates question → status: draft
2. Instructor submits for review → status: pending_review
3. IA or Academy Admin reviews question
   - If approved: status: approved, is_active = true
   - If rejected: status: rejected, rejection_reason recorded
   - If edits needed: status: revision_needed, comments added
4. Approved questions become available in question bank for exam construction
5. Questions auto-tagged with creator and approver

AI Question Generator (Phase 2):
1. Admin prompts AI with topic + difficulty + type
2. AI generates draft question with options and explanation
3. Draft saved to question bank with status: ai_generated
4. Admin/IA reviews, edits if needed, approves
5. Question enters normal approval flow
```

## 14.5 Question Analytics

For each question, track:

```
- Times included in exams
- Times answered by candidates
- Percentage answered correctly (discrimination index)
- Average time spent answering
- Most common wrong answer
- Flag rate (how often candidates flag this question for review)
```

This data feeds into:
- Identifying poorly worded questions (too many flags, confusion)
- Identifying questions too easy/hard vs their tagged difficulty
- Continuous improvement of the question bank quality

---

# 15. INTERACTIVE CHESS BOARD SYSTEM

## 15.1 Core Components

The chess board system is built on:

```javascript
// Dependencies
"chess.js": "^1.0.0"        // Game logic, move validation, FEN/PGN handling
"react-chessboard": "^4.x"  // Rendering, interaction
"chessops": "^0.x"          // Advanced position analysis (optional)
```

## 15.2 Board Configuration Options

```typescript
interface ChessBoardConfig {
  fen: string;                    // Starting position
  pgn?: string;                   // Game moves for replay mode
  mode: 'static' | 'replay' | 'exercise' | 'freeplay';
  orientation: 'white' | 'black';
  allowFlip: boolean;
  showControls: boolean;          // Replay controls
  showCoordinates: boolean;
  showMoveHistory: boolean;
  showClock?: {                   // Optional clock display
    whiteSeconds: number;
    blackSeconds: number;
  };
  annotations?: SquareAnnotation[]; // Arrows and coloured squares
  exerciseConfig?: ExerciseConfig;  // For exercise mode
}

interface ExerciseConfig {
  questionText: string;
  questionType: 'mcq' | 'move_selection' | 'square_selection' | 'text_input';
  options?: AnswerOption[];
  correctAnswer: string | string[];
  explanation: string;
  fideArticle?: string;
  stepTrigger?: number;          // Show question after Nth move in replay
}
```

## 15.3 Lesson Integration

### FEN Exercise Type

```
Lesson type: interactive_board
- Instructor provides FEN string
- Board renders with position
- Instructions text displayed above board
- Question below board (MCQ or text)
- On answer: explanation revealed with board highlighting
```

### PGN Replay Exercise

```
Lesson type: pgn_exercise
- Instructor provides PGN with annotations
- Board starts at initial position (or specified move)
- User steps through moves
- At annotated positions: question prompt appears
- User answers before continuing
- Wrong answer: explanation shown, user must re-answer
- Correct answer: board continues
```

### Example Arbiter Board Exercise

```
Position: Move 42, White has just played Rook captures f7

Question: "At this point, Black's king is in check. Black's flag falls
while the king is in check. What is the correct ruling?"

Options:
A. Black loses on time — the game is over
B. Draw — since Black's opponent cannot checkmate with remaining material
C. White wins — since Black has been flagged
D. White wins only if they have sufficient mating material

Correct: D
FIDE Reference: Article 6.9
Explanation: When a flag falls, the player loses unless the opponent
cannot checkmate by any sequence of legal moves. The arbiter must
assess whether sufficient mating material exists.
```

## 15.4 Advanced Scenario: Decision Tree Board Integration

The most advanced board feature is the branching scenario:

```
Phase 1: Initial Position
- Board shows position at move 38
- Context: "Player A has touched their rook but now wants to move the king"
- Candidate selects: "Apply touch-move rule" or "Allow king move" or "Stop clocks first"

Phase 2: Branching
- If "Apply touch-move rule" → correct → "Player A protests. What next?"
  - Options: "Uphold ruling" / "Escalate to chief arbiter" / "Reverse decision"
- If "Allow king move" → incorrect → explanation given → "Let's revisit..."
- Each branch scored separately

Phase 3: Resolution
- Total score calculated from all decision points
- Pass/fail shown
- Full path reviewed with explanations at each node
```

---

# 16. PRACTICE QUESTIONS SYSTEM

## 16.1 Practice Dashboard

```
┌────────────────────────────────────────────────────────────┐
│ Practice Questions                                          │
│                                                             │
│ Your Performance Overview                                   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ Total    │ │ Correct  │ │ Average  │ │ Streak   │      │
│ │  347     │ │  261     │ │  75.2%   │ │  7 days  │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│ Performance by Topic:                                       │
│ Laws of Chess      ████████████░░░░ 88%                    │
│ Anti-Cheating      ████████████████ 92%                    │
│ Swiss Pairings     ██████████░░░░░░ 58% ← Weak Area       │
│ Appeals            ████████████░░░░ 73%                    │
│ Rapid Rules        ████████░░░░░░░░ 52% ← Weak Area       │
│                                                             │
│ [Start Recommended Practice] [Choose Topic] [Mock Exam]    │
└────────────────────────────────────────────────────────────┘
```

## 16.2 Practice Modes

### Quick Practice

```
User selects: 10 / 20 / 50 questions
System selects: Random questions from all categories at appropriate level
Format:
- One question at a time
- Immediate feedback after each answer
- Running score shown
- Can exit and resume later (progress saved)

After completion:
- Score summary
- Incorrect questions listed with explanations
- "Practice wrong answers" shortcut button
```

### Topic Practice

```
User selects one or more topics
System presents only questions from selected topics
Useful for:
- Pre-seminar preparation
- Targeted weakness improvement
- Exam countdown cramming
```

### Weak Areas Mode

```
System automatically identifies:
- Topics where user scores below 70% overall
- Topics where user score has decreased over time
- Topics with most incorrect answers in last 30 days

Presents a targeted session with questions from weak areas only
After completion:
- Updated weak area scores
- Progress chart showing improvement over time
- Recommendation: "Keep practicing Swiss Pairings — you're improving!"
```

### Exam Simulation Mode

```
Mirrors the real certification exam:
- Full duration timer (90 minutes)
- Same question count as real exam
- No hints, no immediate feedback
- Question navigator sidebar
- Anti-distraction mode (optional: hides browser chrome)
- Result only shown at end

After completion:
- Detailed results breakdown
- Performance vs previous simulations
- Readiness indicator: "Based on your score, you are 85% ready for the certification exam"
```

### Daily Challenge

```
Each day: 5 new questions, one per category
Available from 00:00 to 23:59 Nigeria time
Cannot be repeated
Streak tracking: consecutive days of completing daily challenge
Special badge for 30-day streak, 90-day streak, 365-day streak
```

## 16.3 Question Display in Practice Mode

```
┌────────────────────────────────────────────────────────────┐
│ Practice  │ Laws of Chess  │ Medium  │ Q 7 / 20           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Question 7                                                  │
│                                                             │
│ During an online game, a player makes an illegal move.     │
│ The arbiter is monitoring the game and notices              │
│ immediately. What is the correct procedure on the          │
│ FIRST illegal move?                                         │
│                                                             │
│ ○ A. Declare the game lost for the player                  │
│ ○ B. Give a 2-minute time penalty and restore position     │
│ ○ C. Give a time penalty of 1 minute                       │
│ ○ D. Give a warning and restore the position               │
│                                                             │
│ [Skip]                              [Submit Answer]         │
└────────────────────────────────────────────────────────────┘
```

After answering:

```
┌────────────────────────────────────────────────────────────┐
│ ✗ Incorrect                                                 │
│                                                             │
│ Your answer: B. Give a 2-minute time penalty               │
│ Correct answer: B. Give a 2-minute time penalty            │
│ Wait — actually the answer depends on the game type:       │
│                                                             │
│ EXPLANATION:                                               │
│ For standard (classical) games under Article 7.5:         │
│ First illegal move: 2-minute time increase for opponent,  │
│ position restored.                                          │
│ Second illegal move: game lost.                             │
│                                                             │
│ FIDE Reference: Article 7.5.5                              │
│ Reference: FIDE Laws of Chess 2023                         │
│                                                             │
│ [Book this for review] [Continue →]                        │
└────────────────────────────────────────────────────────────┘
```

## 16.4 Bookmarked Questions

Users can bookmark any question encountered in practice or exams for later review:

```
Bookmarks:
- Saved from practice mode
- Saved from post-exam review
- Manually added by user

Bookmark View:
- List of bookmarked questions
- Filter by category, difficulty
- "Practice bookmarks only" mode
- Remove bookmark option
```

---

# 17. REFRESHER COURSE SYSTEM

## 17.1 Refresher Course Types

### Annual Refresher (Mandatory)

```
Assigned to: All licensed arbiters (NA, FA, IA)
Frequency: Every year (on license anniversary date)
Content: Laws update, common mistakes, recent rulings
Duration: 2–3 hours
CPD Points: 5
Consequence if not completed within 90 days:
  - CPD points locked for the period
  - Warning notification
  - Tournament assignment system notified (optional flag)
```

### Rule Change Refresher

```
Triggered by: FIDE updating Laws of Chess or key regulations
Timing: Within 3 months of FIDE update
Content:
  - What changed (before/after comparison)
  - Why the change was made
  - Practical examples using interactive board
  - Mini assessment (must score 80% to complete)
CPD Points: 2–5 (depending on extent of changes)
Mandatory for: All active arbiters
```

### Title-Based Refreshers

```
National Arbiter Track:
- Advanced Pairings Workshop (annual)
- Appeals Handling Procedures (biennial)
- Tournament Administration Best Practices (biennial)
- Chief Arbiter Fundamentals (biennial)

FIDE Arbiter Track:
- International Regulations Update (annual)
- Title Norm Events Management (biennial)
- FIDE Reporting Procedures (biennial)
- Multi-round Events Management (annual)

International Arbiter Track:
- Complex Appeals and Rulings (annual)
- High-Level Event Management (biennial)
- Chief Arbiter Responsibilities at FIDE Events (biennial)
- Mentoring and Training Delivery (annual)
```

### Micro-Learning Refreshers

```
Format: 5–10 minute focused lessons
Accessed from: "Quick Refresher" widget on dashboard
Topics:
- Touch-Move Rule: 3 scenarios, 5 minutes
- Threefold Repetition Claims: 2 positions, 7 minutes
- Flag Fall with Insufficient Material: 4 board positions, 8 minutes
- Dead Position Recognition: 5 positions, 10 minutes
- Forfeit vs Resignation Distinction: 6 minutes
- Electronic Device Policy: 5 scenarios, 8 minutes
- Conduct & Behaviour: 3 case studies, 10 minutes
- Correct Use of Increment Clocks: 5 minutes
- Draw Offer Procedures: 5 minutes
- Score Sheet Requirements: 6 minutes

Gamification:
- Micro-refreshers count as "daily practice" for streak tracking
- Completing 10 micro-refreshers unlocks "Quick Learner" badge
- Completing all available micro-refreshers unlocks "Comprehensive Knowledge" badge
```

## 17.2 Refresher Course Components

Every refresher course must contain:

```
1. Pre-Assessment (optional)
   - 5 questions to gauge current knowledge
   - Score shown but does not affect completion
   - Helps candidate identify focus areas

2. Video Lessons
   - 1–4 short videos (max 15 min each)
   - Closed captions required
   - Downloadable for offline viewing

3. PDF Summary
   - Key points from video in 1–2 page reference document
   - Downloadable

4. Interactive Board Examples
   - Minimum 3 board scenarios for rules-based refreshers
   - Decision point questions at key positions

5. Knowledge Check Quiz
   - 10–15 questions
   - Must score ≥ 80% to complete
   - Unlimited attempts (but explanations shown after each attempt)
   - Questions randomised per attempt

6. Certificate of Completion
   - Auto-generated PDF
   - Adds to CPD record
   - Counts toward required CPD points
```

## 17.3 Mandatory Refresher Enforcement

```
Dashboard warning system:
- 90 days before due: "Reminder: Your annual refresher is due in 90 days"
- 30 days before due: Yellow banner on dashboard
- 7 days before due: Red banner, email sent
- Overdue: Red alert, email to user + admin notification

Consequences (configurable by admin):
- CPD points locked (no new CPD can be added until completed)
- Tournament assignment flag (visible to assignment admin)
- License renewal blocked (most severe — only for repeated non-compliance)

Grace period:
- Admin can grant 30-day extensions on request
- Medical/emergency exceptions logged and approved by admin
```

## 17.4 Refresher Recommendation Engine

The system analyses each user's data and recommends refreshers:

```
Input signals:
- Exam performance by category (weak in pairings = recommend Pairings Refresher)
- Practice question accuracy by topic
- Time since last refresher in each topic
- Recent FIDE rule changes (new refresher available)
- Upcoming promotion requirements
- Upcoming tournament assignments

Output:
Dashboard widget: "Recommended For You"
├── Swiss Pairings Refresher (score 52% in practice)
├── Anti-Cheating Update 2026 (new content available)
└── Appeals Committee Procedures (required for FA promotion)

Email (weekly digest):
"Based on your recent activity, here are 3 refreshers that could help you..."
```

---

# 18. GRADING SYSTEM

## 18.1 Auto-Grading Logic

```
MCQ (single correct answer):
score = (correct ? marks : 0) - negative_marks_if_wrong

Multi-Select:
# No negative marks version (default):
correct_selected = count of user's answers that are correct
incorrect_selected = count of user's answers that are incorrect
total_correct = total correct options for this question
score = max(0, (correct_selected - incorrect_selected) / total_correct * marks)

# With negative marks version (configurable):
score = max(0, (correct_selected * 1 - incorrect_selected * 0.5) / total_correct * marks)

True/False:
score = (correct ? marks : 0)

Board Position (if answer is an option selection):
Same as MCQ

Board Position (if answer is a specific move):
chess.js validates the submitted move notation against the correct answer
Score = correct ? marks : 0

Fill-in-blank:
Case-insensitive string comparison
Accent-insensitive comparison (é = e)
Configurable: exact match or keyword match

Matching / Ordering:
Partial credit: (correct_matches / total_pairs) * marks
```

## 18.2 Manual Grading Workflow

### Essay Grading Interface (IA/Admin)

```
Grading Queue (sorted by submission time, oldest first):

┌──────────────────────────────────────────────────────────┐
│ Pending Manual Grades: 23                                 │
│                                                           │
│ Filter: [All Exams ▼] [All Instructors ▼] [Date ▼]      │
└──────────────────────────────────────────────────────────┘

For each submission:
┌──────────────────────────────────────────────────────────┐
│ Candidate: John Doe | Exam: NA Certification | Q14       │
│ Submitted: DD/MM/YYYY HH:MM | Time spent: 8m 23s        │
├──────────────────────────────────────────────────────────┤
│ QUESTION:                                                 │
│ Describe the correct procedure for handling a claim      │
│ of threefold repetition when no score sheets are         │
│ available.                                                │
├──────────────────────────────────────────────────────────┤
│ CANDIDATE'S ANSWER:                                       │
│ The arbiter should first... [full answer shown]          │
├──────────────────────────────────────────────────────────┤
│ MARKING RUBRIC:                                           │
│ □ Identifies that position must be proven (2 marks)      │
│ □ References position reconstruction method (3 marks)    │
│ □ Mentions Article 9.2 (2 marks)                         │
│ □ Correct final ruling stated (3 marks)                  │
├──────────────────────────────────────────────────────────┤
│ Marks Awarded: [  ] / 10                                 │
│ Feedback (shown to candidate): [text input]              │
│                                                           │
│ [Save & Next]  [Save Draft]  [Escalate to Admin]         │
└──────────────────────────────────────────────────────────┘
```

## 18.3 Grade Release

```
Exam with no essay questions:
- Result immediately available after submission
- Certificate generation triggered if passed

Exam with essay questions:
- Partial result shown immediately (auto-graded questions only)
- "Awaiting manual grading for N question(s)" banner shown
- Email sent when grading complete
- Final result confirmed and certificate generated

Maximum grading time SLA:
- Academy target: 5 business days
- Admin receives alert if any submission is older than 3 business days
- Candidate can see status of manual grading in their exam history
```

## 18.4 Grade Dispute

```
Candidate can raise a dispute within 7 days of result release:
1. Candidate submits dispute with reason
2. System notifies grading admin
3. Different IA or admin reviews the answer independently
4. If dispute upheld: grade updated, user notified
5. If dispute rejected: original grade stands, explanation provided
6. All disputes logged in audit trail
```

---

# 19. CERTIFICATION SYSTEM

## 19.1 Certification Pathways

### National Arbiter Pathway

```
Requirements to certify as NA:
1. Complete all beginner courses (or demonstrate equivalence via placement test)
2. Attend NCAA National Arbiter Seminar (minimum 80% attendance)
3. Pass NCAA NA Certification Examination (minimum 70%)
4. No outstanding integrity violations

Process:
1. Seminar attendance verified → exam unlocked
2. Candidate passes exam
3. System triggers certification workflow:
   a. Auto-creates certificate record
   b. Generates PDF certificate
   c. Creates digital license record
   d. Sends congratulations email with certificate download
   e. Updates user's arbiter_title to 'na'
   f. Logs in audit trail
   g. Updates Public Arbiter Registry (if enabled)
   h. Notifies admin for records
```

### FIDE Arbiter Pathway

```
Requirements (must meet ALL):
1. Hold valid National Arbiter title
2. Minimum 3 years as active NA
3. Minimum 3 NA norm tournaments
4. Pass FIDE Arbiter seminar (run by FA or IA instructor)
5. Pass FIDE Arbiter examination
6. Score minimum 80% in FA examination (higher than NA requirement)
7. Minimum 50 CPD points in last 2 years
8. Letter of recommendation from current FIDE Arbiter or IA

NCAA processes this pathway; FIDE title is applied for separately after NCAA confirms eligibility.
```

### International Arbiter Pathway

```
Requirements (must meet ALL):
1. Hold valid FIDE Arbiter title
2. Minimum 5 years as active FA
3. Minimum 3 IA norm tournaments as deputy arbiter under an IA
4. Pass IA examination with minimum 80%
5. Recommendation from International Arbiter
6. Approved by NCAA board

This pathway is largely managed manually by senior officials;
the Academy tracks the data and flags when all requirements are met.
```

## 19.2 Certificate Generation

### Certificate Template Fields

```
Certificate Layout:
┌──────────────────────────────────────────────────────────────┐
│ [NCAA LOGO]                              [FIDE LOGO if FA/IA] │
│                                                               │
│            Nigerian Chess Association                         │
│                    ACADEMY                                    │
│                                                               │
│     This certifies that                                       │
│                                                               │
│            OLUWASEUN ADEBAYO                                  │
│     [Full Name in large, official typeface]                   │
│                                                               │
│     has successfully completed all requirements and           │
│     is hereby awarded the title of                            │
│                                                               │
│            NATIONAL ARBITER                                   │
│     [Title in bold, prominent display]                        │
│                                                               │
│     Certificate No: NCA-NA-2025-0042                         │
│     Issued: 14 March 2025                                     │
│     Valid until: 14 March 2028                               │
│                                                               │
│     [Signature Block — President]  [Signature Block — Secretary]│
│                                                               │
│     [QR CODE]                          Verify at:            │
│                                  verify.ncaaweb.com.ng        │
└──────────────────────────────────────────────────────────────┘
```

### Certificate Number Format

```
Format: {ASSOC}-{LEVEL}-{YEAR}-{SEQUENCE}

Examples:
NCA-NA-2025-0042    → NCAA National Arbiter, 2025, number 42
NCA-FA-2025-0007    → NCAA FIDE Arbiter, 2025, number 7
NCA-IA-2026-0001    → NCAA International Arbiter, 2026, first issued
NCA-CC-2025-0789    → Course Completion Certificate
NCA-SA-2025-0123    → Seminar Attendance Certificate
```

### QR Code & Verification

```
QR code encodes:
https://verify.ncaaweb.com.ng/{verification_hash}

Verification hash: SHA-256 of (certificate_number + user_uuid + issue_date + secret_salt)

Public verification endpoint returns:
{
  "status": "valid",
  "certificate_number": "NCA-NA-2025-0042",
  "holder": "Oluwaseun Adebayo",
  "title": "National Arbiter",
  "issued": "2025-03-14",
  "expires": "2028-03-14",
  "license_status": "active"
}

Or:
{
  "status": "revoked",
  "revoked_date": "2026-01-10",
  "reason": "License not renewed"
}
```

## 19.3 Certificate Download

```
On first certificate generation:
- PDF generated server-side using DomPDF or Browsershot
- Stored in secure file storage
- Path recorded in database
- Download link sent via email

On subsequent downloads:
- If PDF exists: serve from storage
- If PDF missing: regenerate on the fly

PDF security:
- PDF is print-enabled but not copy-text enabled
- Metadata includes certificate number, issue date, NCAA details
- No editing permissions
```

---

# 20. DIGITAL LICENSE SYSTEM

## 20.1 License vs Certificate

```
Certificate: permanent record of achievement
             Issued once on passing the exam
             Does not expire (the achievement is permanent)
             Can be shown as proof of having earned the title

License: time-limited permission to practice as an arbiter
         Expires and must be renewed
         Tied to ongoing CPD compliance
         Can be suspended or revoked
         Required for tournament assignments
```

## 20.2 License Lifecycle

```
PENDING
  │ (admin issues license manually or system auto-issues on cert)
  ▼
ACTIVE ◄──────────────────────────────────┐
  │                                        │ (renewal approved)
  │ (60 days before expiry)               │
  ▼                                        │
EXPIRY WARNING ──────────────────────────►┤
  │ (after expiry date)                   │
  ▼                                        │
EXPIRED ────────────────────────────────► RENEWAL APPLICATION
  │ (admin action: misconduct)                    │
  ▼                                        │
SUSPENDED ──────── (reinstatement) ──────►┘
  │ (admin action: severe violation)
  ▼
REVOKED (terminal — requires full re-certification to return)
```

## 20.3 License Renewal Process

```
Trigger: 60 days before license expiry

Step 1: System sends renewal reminder (email + in-app notification)

Step 2: User initiates renewal from dashboard
  → System checks CPD compliance for current period:
    - If CPD points complete → eligibility confirmed
    - If CPD incomplete → show deficit, suggest activities to complete
   
Step 3: User completes any mandatory outstanding refreshers

Step 4: User submits renewal application
  → Pays renewal fee (if applicable — configured by admin)
 
Step 5: Admin reviews application
  → Auto-approve if all requirements met (configurable)
  → Manual review if any flags exist
 
Step 6: New license issued
  → Updated expiry date
  → Renewed certificate (if applicable)
  → Confirmation email
 
Consequence of not renewing:
  → License expires → status becomes EXPIRED
  → User cannot be assigned to tournaments via assignment system
  → User retains their title but cannot act as a licensed arbiter
  → CPD data preserved (not deleted)
```

## 20.4 License Suspension

```
Grounds for suspension:
- Active disciplinary investigation
- Integrity violation
- CPD non-compliance (extreme case)
- Request by user (e.g. medical leave)

Suspension process:
1. Admin initiates suspension with reason
2. User notified via email
3. License status changes to SUSPENDED
4. Tournament assignment system notified
5. Suspension visible in public registry (reason: "Administrative Review" — no specifics)

Reinstatement:
1. Admin clicks Reinstate
2. Enters reinstatement reason
3. License reverts to ACTIVE
4. User notified
```

---

# 21. CPD MANAGEMENT SYSTEM

## 21.1 CPD Framework

```
CPD Period Structure:
- Period is 2 years (configurable per title level)
- Period starts from license issue date (or last renewal date)
- Points reset at each renewal

Required Points by Title:
- National Arbiter: 50 points per 2-year period
- FIDE Arbiter: 70 points per 2-year period
- International Arbiter: 80 points per 2-year period

Mandatory Activities (must complete regardless of total points):
- Annual Laws of Chess Refresher
- Any active Anti-Cheating Update course
- At least 1 seminar or webinar per year
```

## 21.2 CPD Point Sources

| Activity Type | Points | Maximum Per Period |
|---------------|--------|--------------------|
| Academy course completion | per course | No limit |
| Laws of Chess Refresher | 5 | 1 per year |
| Anti-Cheating Update | 5 | 1 per update |
| Pairings Workshop | 4 | No limit |
| Ethics Training | 3 | No limit |
| NCAA Seminar attendance | 8 | No limit |
| NCAA Webinar attendance | 3 | 20 per year |
| FIDE Arbiters Commission workshop | 10 | No limit |
| FIDE Online Tournament | 5 | 10 per period |
| Chief Arbiter appointment | 3 per event | 15 per period |
| Mentoring a candidate | 5 | 10 per period |
| Research/article published | 5 | 5 per period |
| External professional training | Up to admin discretion | 10 per period |

## 21.3 CPD Tracker Interface

```
┌──────────────────────────────────────────────────────────────┐
│ CPD Tracker — 2025–2027 Period                               │
├──────────────────────────────────────────────────────────────┤
│ Required: 50 points  Earned: 34 points  Remaining: 16 points│
│                                                               │
│ ████████████████████████████░░░░░░░░░░░░░ 68%               │
│                                                               │
│ Period ends: March 14, 2027 (18 months remaining)            │
│ On track: Yes ✓ (at current rate, you will reach 52 points) │
├──────────────────────────────────────────────────────────────┤
│ Mandatory Activities Status:                                  │
│ ✓ Annual Laws Refresher 2025 (completed March 2025)         │
│ ✗ Annual Laws Refresher 2026 (due March 2026)               │
│ ✓ Anti-Cheating Update 2025 (completed June 2025)           │
│ ✓ Seminar attendance 2025 (attended April 2025)             │
│ ✗ Seminar/Webinar attendance 2026 (pending)                  │
├──────────────────────────────────────────────────────────────┤
│ HISTORY                        [+ Log External Activity]     │
│                                                               │
│ Nov 2025  FIDE Online Webinar              +3 pts  Approved │
│ Sep 2025  Appeals Procedures Course        +4 pts  Approved │
│ Jun 2025  Anti-Cheating Update 2025        +5 pts  Approved │
│ Apr 2025  NCAA National Seminar 2025       +8 pts  Approved │
│ Mar 2025  Annual Laws Refresher 2025       +5 pts  Approved │
│ Feb 2025  Pairings Workshop                +4 pts  Approved │
│ Jan 2025  Ethics and Conduct               +3 pts  Approved │
│ Dec 2024  Intro to FIDE Online Chess       +2 pts  Pending ⏳│
└──────────────────────────────────────────────────────────────┘
```

## 21.4 External Activity Submission

```
For activities completed outside the Academy platform:

Form fields:
- Activity Title
- Activity Type (dropdown)
- Provider / Organisation
- Date Completed
- Description
- Evidence (file upload — certificate, confirmation email, etc.)
- Points Claimed

Admin review:
- Review evidence
- Approve / Reject with notes
- Or: Adjust points claimed
```

---

# 22. PROMOTION & CAREER PROGRESSION SYSTEM

## 22.1 Promotion Tracker UI

```
┌──────────────────────────────────────────────────────────────┐
│ Career Progression                                           │
│                                                               │
│    [Candidate] ──── [NA] ──── [FA] ──── [IA]               │
│                       ▲                                       │
│                   Current Level                              │
├──────────────────────────────────────────────────────────────┤
│ Next Milestone: FIDE Arbiter                                 │
│ Overall Progress: ████████░░ 75%                             │
├──────────────────────────────────────────────────────────────┤
│ Requirements:                               Status           │
│ ────────────────────────────────────────────────────────── │
│ Minimum 3 years as active NA               ✓ 3y 2m done    │
│ Complete FA preparation courses            ✓ All done       │
│ Minimum 3 NA norm tournaments              ✗ 1 of 3 done   │
│ Attend FIDE Arbiter seminar                ✗ Not attended   │
│ Pass FA examination (min 80%)              ✗ Not attempted  │
│ Minimum 50 CPD points                      ✓ 52 points      │
│ Recommendation letter                      ✗ Not submitted  │
├──────────────────────────────────────────────────────────────┤
│ What to do next:                                             │
│ 1. Officiate 2 more NA norm tournaments                     │
│ 2. Submit recommendation letter request to an FA/IA         │
│ 3. Register for the next FIDE Arbiter Seminar               │
│                                                              │
│ [View Upcoming Seminars]  [Contact an FA/IA Mentor]         │
└──────────────────────────────────────────────────────────────┘
```

## 22.2 Norm Tracking

```
A "norm" is a qualifying performance as an arbiter at a specific level of tournament.

Norm types:
- NA Norm: officiating at a tournament rated for NA norms
- FA Norm: officiating at an international or qualifying FA event
- IA Norm: officiating as deputy arbiter under an IA at a qualifying event

Norm record fields:
- Tournament name
- Date
- Location
- FIDE tournament ID (if applicable)
- Role (Deputy Arbiter, Arbiter, etc.)
- Chief Arbiter (must be higher title than norm being applied for)
- Verifying IA/admin

Norms are submitted by:
1. User manually submits via "Add Norm" form
2. Integration with NCAA Tournament Assignment System (auto-import)

Admin verifies each norm before it counts.
```

## 22.3 Experience Records

```
Beyond norms, users can log broader experience:
- Tournaments officiated (any level)
- Role in each
- Number of players
- Duration (days)
- Chief Arbiter name

This builds a comprehensive arbiter portfolio.
Visible to admins, IAs, and the user themselves.
Used in promotion committee decisions.
```

---

# 23. RESOURCE LIBRARY

## 23.1 Library Architecture

```
Categories:
├── FIDE Documents
│   ├── Laws of Chess
│   ├── Rapid & Blitz Rules
│   ├── Anti-Cheating Guidelines
│   ├── Ethics Code
│   └── Rating Regulations
├── NCAA Documents
│   ├── Local Tournament Rules
│   ├── Academy Syllabi
│   └── Official Circulars
├── Pairing Manuals
│   ├── Swiss System Manual
│   ├── Dutch Pairing Manual
│   └── Round Robin Guide
├── Anti-Cheating
│   ├── Procedures Manual
│   └── Device Policy
├── Appeals
│   ├── Procedure Guide
│   └── Past Rulings (anonymised)
├── Forms & Templates
│   ├── Score Sheets
│   ├── Appeal Forms
│   ├── Protest Forms
│   └── Tournament Report Templates
├── Training Slides
│   └── [Seminar presentation archives]
└── Reference Cards
    └── [Quick reference laminated cards for arbiter desks]
```

## 23.2 Search & Discovery

```
Full-text search:
- Search across all resource titles and descriptions
- Search within PDF content (where metadata available)
- Fuzzy matching for typos

Filters:
- Category
- File type (PDF, DOCX, PPTX, Excel)
- Language (English, French, Spanish — for FIDE docs)
- Date range
- Access level (public, NA, FA, IA, admin only)

Sorting:
- Most downloaded
- Newest
- Alphabetical
- Relevance (when searching)
```

## 23.3 Resource Access Control

```
Public resources: Anyone can download without login
  - FIDE Laws of Chess (latest edition)
  - Basic arbiter information sheets

Candidate-level resources:
  - All beginner course PDFs
  - NA preparation guides

NA-level resources:
  - All NA course materials
  - Pairing manuals
  - Tournament administration guides

FA/IA-level resources:
  - Advanced materials
  - FIDE Arbiters Commission documents
  - Past seminar slides (advanced)

Admin-only:
  - Internal operational documents
  - Candidate assessment rubrics
  - Past examination papers (before publication)
```

---

# 24. NOTIFICATION SYSTEM

## 24.1 Notification Types

```
Category: Examination
- exam_scheduled: "Your certification exam has been scheduled for [date]"
- exam_reminder: "Your exam is in 24 hours. Good luck!"
- exam_passed: "Congratulations! You passed the NA Certification Exam."
- exam_failed: "Your exam result is available. You scored X%."
- exam_graded: "Manual grading is complete for your submission."
- exam_flagged: "Your exam has been flagged for review."

Category: Certification & License
- certificate_ready: "Your National Arbiter certificate is ready to download."
- license_issued: "Your arbiter license NCA-NA-2025-0042 has been issued."
- license_expiring_90: "Your license expires in 90 days. Renew now."
- license_expiring_30: "URGENT: Your license expires in 30 days."
- license_expiring_7: "FINAL NOTICE: Your license expires in 7 days."
- license_expired: "Your arbiter license has expired."
- license_renewed: "Your license has been successfully renewed."
- license_suspended: "Your arbiter license has been suspended."

Category: CPD
- cpd_activity_approved: "Your CPD activity has been approved (+X points)"
- cpd_activity_rejected: "Your CPD activity was not approved. [Reason]"
- cpd_milestone: "Milestone: You've reached 50% of your CPD target!"
- cpd_due_reminder: "Your CPD period ends in 6 months. You need X more points."
- cpd_overdue: "Your CPD requirement is overdue. Please complete it."

Category: Courses & Learning
- course_enrolled: "You've been enrolled in [course name]."
- course_assigned: "You've been assigned [course name] by the admin."
- module_unlocked: "New module unlocked: [module name]"
- course_completed: "You've completed [course name]!"
- refresher_due: "Your annual refresher is due. Complete it to maintain compliance."
- refresher_overdue: "OVERDUE: [refresher name] must be completed."

Category: Seminars
- seminar_registration_confirmed: "Registration confirmed: [seminar name]"
- seminar_waitlist: "You're on the waitlist for [seminar name]. Position: 3"
- seminar_spot_available: "A spot has opened in [seminar name]. Confirm within 48 hours."
- seminar_reminder: "Reminder: [seminar name] starts in 2 days"
- seminar_materials_available: "Seminar materials are now available."
- seminar_exam_unlocked: "Your seminar exam has been unlocked."

Category: Promotions & Badges
- norm_verified: "Your norm for [tournament] has been verified."
- promotion_eligible: "You may now be eligible for promotion to FA."
- badge_earned: "New badge earned: Rules Expert!"

Category: Announcements & System
- new_announcement: "[Announcement title]"
- rule_update: "New FIDE rule update: A refresher course is available."
- maintenance_scheduled: "Scheduled maintenance: [time]"
- security_alert: "New login from an unrecognised device."
- password_changed: "Your password has been changed."
```

## 24.2 Notification Delivery Channels

```
In-App (always):
- Bell icon shows unread count
- Notification dropdown in header
- Notification centre page with full history
- Mark as read (individual or all)
- Delete notifications

Email:
- HTML emails with NCAA branding
- Plain text fallback
- Unsubscribe links (per category, not all-or-nothing)
- Open tracking (optional — privacy respecting)

Push Notifications (PWA):
- Via Firebase Cloud Messaging
- Requires user permission
- For time-sensitive notifications only (exam tomorrow, license expiring)

SMS (optional, for critical alerts only):
- Via Termii or Africa's Talking
- License expiry final warning
- Exam passed/failed (quick result)
- Admin emergency announcements
- User can opt out
```

## 24.3 Notification Preferences

```
User can configure per-category:
- In-App only
- Email only
- In-App + Email
- In-App + Email + Push
- Push only
- Disabled (only for non-mandatory categories)

Mandatory notifications (cannot be disabled):
- exam_passed
- exam_failed
- license_suspended
- license_expired
- security_alert (password change, new login)
```

---

# 25. ANNOUNCEMENT SYSTEM

## 25.1 Announcement Types

```
General: Academy-wide news
  - Rule change announcements
  - New course launches
  - Platform feature updates

Examination: Exam-specific news
  - New exam scheduled
  - Exam date changes
  - Pass rate statistics

Seminar: Seminar-specific news
  - Upcoming seminars
  - Registration opening
  - Venue changes
  - Cancellations

Certification: Certification news
  - New certification available
  - Certification policy changes
  - Title elevations

Urgent: Requires immediate attention
  - Red banner treatment on dashboard
  - Sent via all available channels
  - Cannot be dismissed until acknowledged
```

## 25.2 Targeting

```
Announcements can be targeted to:
- All users
- By role: candidates / NAs / FAs / IAs / instructors
- By title: specific arbiter titles only
- By state/region: geographic targeting
- By enrollment: enrolled in a specific course
- By seminar: registered for a specific seminar

Scheduling:
- Publish immediately
- Schedule for future date/time
- Set expiry date (announcement auto-hides after expiry)
- Pin to top of dashboard (pinned announcements show above others)
```

---

# 26. ANALYTICS & REPORTING SYSTEM

## 26.1 Admin Analytics Dashboard

### Platform Overview Metrics

```
Row 1: Key Numbers (updated every hour)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Total    │ │ Active   │ │ Courses  │ │ Exam     │ │ Certs    │
│ Users    │ │ Licenses │ │ Completed│ │ Pass Rate│ │ Issued   │
│  1,234   │ │  687     │ │  2,341   │ │  71.4%   │ │  389     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

Row 2: Charts
┌────────────────────────────┐ ┌──────────────────────────────┐
│ New Registrations          │ │ Exam Attempts (30 days)      │
│ [Line chart - 12 months]   │ │ [Bar chart - daily]          │
└────────────────────────────┘ └──────────────────────────────┘

Row 3: More Charts
┌────────────────────────────┐ ┌──────────────────────────────┐
│ CPD Compliance             │ │ Title Distribution           │
│ [Donut: 78% compliant]     │ │ [Pie: Candidate/NA/FA/IA]   │
└────────────────────────────┘ └──────────────────────────────┘
```

## 26.2 Report Types

### Certification Report

```
Filters: Date range, title level, state
Columns: Name, Certificate Number, Title, Issue Date, Expiry, Status
Export: PDF, Excel, CSV
Summary: Total issued, active, expired, revoked
Chart: Certifications by month
```

### CPD Compliance Report

```
Filters: Title level, CPD period, compliance status
Columns: Name, Title, Period, Required Points, Earned Points, Mandatory Activities, Status
Export: PDF, Excel, CSV
Summary: % compliant, average points, at-risk count (below 50% with less than 6 months left)
```

### Exam Performance Report

```
Filters: Exam name, date range, candidate level
Columns: Candidate, Exam, Attempt, Score, Pass/Fail, Date, Violation Count
Export: PDF, Excel, CSV
Summary: Total attempts, pass rate, average score, score distribution histogram
Question analysis: Pass rate per question, top incorrect questions
```

### Attendance Report (Seminars)

```
Filters: Seminar name, date range, format
Columns: Name, Seminar, Registration Date, Attended, Attendance %, Exam Unlocked
Export: PDF, Excel, CSV
```

### License Status Report

```
Filters: Title, status, expiry window
Columns: Name, License Number, Title, Issue Date, Expiry, Status
Highlights: Expiring in 30/60/90 days (different colour rows)
Export: PDF, Excel, CSV
```

### Resource Usage Report

```
Columns: Resource Title, Category, Views, Downloads, Last Downloaded
Sorted by: Download count (desc)
Useful for: Identifying most-used and least-used resources
```

## 26.3 Instructor Analytics

```
For each course they manage:
- Enrolled count over time
- Completion rate
- Average completion time
- Dropout point (which lesson do most students stop at?)
- Quiz scores by question
- Video engagement (average % watched)

For each exam they created:
- Total attempts
- Pass rate
- Score distribution
- Time distribution
- Most difficult questions
- Most flagged questions
```

---

# 27. AI-POWERED FEATURES

## 27.1 AI Study Assistant

```
Interface: Chat widget in the right panel of any course or resource page

System prompt grounding:
- FIDE Laws of Chess (latest edition)
- NCAA Local Rules
- Academy course content (summaries)
- Common arbiter decision patterns

Example interactions:
User: "Explain Article 7.5"
AI: "Article 7.5 covers illegal moves. When a player makes an
     illegal move, the position must be restored. On the first
     illegal move, the arbiter gives the opponent an extra 2
     minutes. On the second, the game is forfeited. Let me show
     you a board example..."

User: "What's the difference between a draw offer and a draw claim?"
AI: "A draw offer is a proposal — the other player can accept or
     decline. A draw claim is made when a specific condition exists
     (e.g. threefold repetition, 50-move rule) and requires arbiter
     verification..."

User: "How does Swiss pairing work with an odd number of players?"
AI: "With an odd number of players, one player receives a bye (full
     point, no game played). The bye is typically given to the lowest-
     ranked player who hasn't had one yet..."

Features:
- Cites specific FIDE articles in all answers
- Refuses to answer non-chess/arbiter questions
- Suggests relevant course modules for deeper learning
- Can quiz the user: "Want to test your understanding? I'll give you 3 questions on Article 7."
- Session saved per course page (context-aware)
```

## 27.2 AI Question Generator

```
Admin interface: Question Bank → Generate with AI

Inputs:
- Topic / Category
- Sub-category
- Difficulty level
- Question type
- Number to generate (1–10)
- Source material (optional — paste text from FIDE laws)

Process:
1. Admin enters inputs
2. AI generates draft questions with options and explanations
3. Each generated question shows:
   - Question text
   - Options with correct answers marked
   - Explanation
   - Suggested FIDE reference
4. Admin can:
   - Accept as-is (moves to pending review)
   - Edit and accept
   - Regenerate this question
   - Reject

Quality safeguards:
- Generated questions always require approval before activation
- Never directly added to live question bank
- Admin can see "AI Generated" tag on all AI questions
- Keeps humans in the loop for content quality
```

## 27.3 Smart Content Recommendations

```
Algorithm considers:
- User's completed courses and scores
- Practice question performance by category
- Time since last activity in each area
- Upcoming deadlines (exam dates, CPD period end)
- Promotion pathway requirements

Outputs:
- "Continue Learning" section (most likely next course)
- "Weak Areas to Strengthen" (practice topic suggestions)
- "Coming Up" (deadlines approaching)
- "Recommended Reading" (specific resources)
- "Quick Win" (micro-refresher that takes under 10 minutes and gives CPD point)
```

---

# 28. TOURNAMENT EXPERIENCE INTEGRATION

## 28.1 Integration with NCAA Tournament Assignment System

```
When a tournament is created in the main NCAA system and an arbiter is assigned:

Data pulled automatically to Academy:
- Tournament name
- Date(s)
- Location
- Role assigned (Arbiter, Deputy, Chief Arbiter)
- Number of rounds
- Number of players
- Whether it qualifies for norms

This eliminates manual entry for most experience records.
```

## 28.2 Experience Dashboard

```
Tournaments Tab:
┌──────────────────────────────────────────────────────────────┐
│ Tournament Experience                                        │
│                                                              │
│ Total tournaments officiated: 18                            │
│ As Chief Arbiter: 4                                         │
│ As Deputy Arbiter: 12                                       │
│ As Arbiter: 2                                               │
│ Total days as arbiter: 47 days                             │
├──────────────────────────────────────────────────────────────┤
│ DATE       TOURNAMENT              ROLE        PLAYERS│ROUNDS│
│ Jan 2026   Lagos Open 2026         Chief Arb.    60   │  9   │
│ Nov 2025   NCAA Nationals 2025     Deputy Arb.  120   │ 11   │
│ Sep 2025   Abuja Rapid 2025        Arbiter       40   │  7   │
│ ...                                                          │
│                                                              │
│ [Add Manual Entry]  [Export to PDF]                         │
└──────────────────────────────────────────────────────────────┘
```

## 28.3 Norm Auto-Detection

```
When a tournament with norm status is assigned:
1. System checks: Is the user's role sufficient for a norm?
2. Is the tournament format and player field sufficient for a norm?
3. If yes: draft norm record created automatically
4. Admin/IA prompted to verify
5. On verification: norm counted toward promotion requirements
```

---

# 29. MENTORSHIP PROGRAM

## 29.1 Mentor Eligibility

```
Who can be a mentor:
- FIDE Arbiter (can mentor Candidates and NAs)
- International Arbiter (can mentor Candidates, NAs, and FAs)
- Must have active license
- Must opt in to mentoring in their profile
- Maximum active mentees: 3 (configurable)

Who can be a mentee:
- Any Candidate seeking to become NA
- Any NA seeking to become FA
- Any FA seeking to become IA
```

## 29.2 Mentor Matching

```
Option A: Self-selection
- Mentee browses list of available mentors (filtered by title, state, specialisation)
- Mentee sends request with personalised message
- Mentor accepts or declines

Option B: Admin matching
- Admin pairs mentors and mentees
- Both notified

Option C: Algorithm suggestion (Phase 2)
- System suggests mentors based on:
  - Same state/region
  - Similar specialisation interests
  - Available capacity
  - Track record with previous mentees
```

## 29.3 Mentorship Tracking

```
Mentorship Record:
- Duration: start to completion/termination
- Goals set (free text)
- Number of interactions logged
- Resources shared
- Milestones achieved
- Final status

Interaction Types:
- Message (text)
- Virtual meeting (link + summary)
- Resource shared (document with note)
- Feedback given
- Milestone marked

CPD Points for Mentoring:
- Mentor earns 5 CPD points per completed mentee
- Maximum 10 points per period from mentoring
```

---

# 30. DIGITAL BADGE SYSTEM

## 30.1 Badge Categories

### Achievement Badges

```
Rules Expert
- Earned by: Scoring 90%+ in Laws of Chess category in 3 consecutive practice sessions
- Icon: Open book with crown

Anti-Cheating Specialist  
- Earned by: Completing the Anti-Cheating certification course AND scoring 90%+ in anti-cheating practice questions
- Icon: Shield with checkmark

Pairings Expert
- Earned by: Completing Pairings mastery course AND 85%+ in pairings practice
- Icon: Grid/bracket

Appeals Authority
- Earned by: Completing Appeals Committee course with distinction (90%+)
- Icon: Gavel

Ethics Guardian
- Earned by: Completing Ethics and Conduct course
- Icon: Scales of justice
```

### Milestone Badges

```
First Step
- Earned by: Completing first lesson
- Icon: Footprints

Knowledge Seeker
- Earned by: Completing 5 courses
- Icon: Magnifying glass

Certified Arbiter
- Earned by: Receiving first arbiter certification
- Icon: Certificate scroll

Century Club
- Earned by: Answering 100 practice questions
- Icon: 100 with chess piece

Consistent Learner
- Earned by: 30-day learning streak
- Icon: Flame streak

Dedicated Scholar
- Earned by: 90-day learning streak
- Icon: Golden flame
```

### Specialisation Badges

```
Swiss Pairing Master
- Earned by: Complete pairing courses at all levels

Chief Arbiter Ready
- Earned by: Complete Chief Arbiter fundamentals course + 3 tournament experiences as Chief Arbiter

Online Chess Specialist
- Earned by: Complete online chess arbitration course + score 90%+ in online chess exam

Rapid & Blitz Expert
- Earned by: Complete all rapid/blitz courses + score 90%+ in relevant practice
```

### Community Badges

```
Mentor
- Earned by: Successfully completing mentorship with 1 mentee

Senior Mentor
- Earned by: Successfully completing mentorship with 3+ mentees

Content Contributor
- Earned by: Having a question approved for the question bank (IA/Instructor only)

Seminar Veteran
- Earned by: Attending 5+ seminars/webinars
```

## 30.2 Badge Display

```
On profile: Badge gallery showing all earned badges (locked badges shown greyed out)
On dashboard: Recent badge section
On leaderboard: Badge count as a secondary ranking factor
Certificate PDF: Option to include top 3 badges on certificate
Email signature widget: Embed link showing top badges
```

---

# 31. PUBLIC ARBITER REGISTRY

## 31.1 Registry Overview

```
URL: registry.ncaaweb.com.ng (or /registry on Academy domain)
Access: Public, no login required
Purpose: Allow anyone to verify an arbiter's credentials
```

## 31.2 Search Functionality

```
Search by:
- Full name
- FIDE ID
- NCAA Member ID
- License number
- State/Region

Filters:
- Arbiter title (NA, FA, IA)
- License status (Active, Expired)
- State

Results show (per arbiter):
- Full name
- Title
- License number
- License status
- License expiry date
- State
- FIDE ID (if has one)
```

## 31.3 Individual Arbiter Profile (Public View)

```
┌──────────────────────────────────────────────────────────┐
│ OLUWASEUN ADEBAYO                                        │
│ National Arbiter                                         │
│                                                           │
│ License: NCA-NA-2025-0042                                │
│ Status: ACTIVE ✓                                         │
│ Valid Until: March 2028                                   │
│ FIDE ID: 12345678                                        │
│ State: Lagos                                             │
│                                                           │
│ Specialisations:                                         │
│ 🏅 Anti-Cheating Specialist                              │
│ 🏅 Pairings Expert                                       │
│                                                           │
│ [Verify via QR] [Download Verification PDF]              │
└──────────────────────────────────────────────────────────┘
```

## 31.4 Privacy Controls

Users can configure what's shown publicly:
- Name: Always shown (required)
- Title: Always shown
- License number: Always shown
- License status: Always shown
- State: Optional (default: shown)
- FIDE ID: Optional (default: shown)
- Badges: Optional (default: shown)

---

# 32. GAMIFICATION SYSTEM

## 32.1 Points & Leaderboard

```
Points are separate from CPD points — they are for engagement/motivation only.

Earning points:
- Complete a lesson: +10 pts
- Complete a course: +100 pts
- Pass a practice quiz: +5 pts per correct answer
- Complete daily challenge: +25 pts
- Complete a seminar: +150 pts
- Pass certification exam: +500 pts
- Earn a badge: +50 pts
- Log in for 7 consecutive days: +30 pts bonus

Leaderboard types:
- All-time leaders (global)
- Monthly leaders
- Seminar cohort leaderboard (during seminar period — friendly competition among seminar attendees)
- State-based leaderboard

Leaderboard shows:
- Rank
- Name
- Arbiter Title
- Points
- Badges count
```

## 32.2 Streaks

```
Learning Streak: consecutive days with at least 1 lesson completed or 1 practice question answered
Practice Streak: consecutive days with at least 5 practice questions answered

Streak milestones:
3 days: "Getting started!" notification
7 days: Small bonus + "One week streak" badge
30 days: "Consistent Learner" badge + 100 bonus points
90 days: "Dedicated Scholar" badge + 300 bonus points
365 days: "Academy Legend" badge + 1000 bonus points + personalised email from NCAA

Streak freeze:
- Users can earn up to 2 streak freeze tokens (earned through milestones)
- A freeze token preserves the streak for 1 day if the user misses

Streak recovery:
- If streak breaks, a "Recovery Mode" is available for 48 hours
- Completing 10 practice questions in one session recovers a broken streak (once per month)
```

## 32.3 Levels System

```
Experience Level (different from arbiter title — this is engagement level):

Level 1: Novice (0–499 pts)
Level 2: Learner (500–1,499 pts)
Level 3: Student (1,500–3,999 pts)
Level 4: Practitioner (4,000–9,999 pts)
Level 5: Expert (10,000–24,999 pts)
Level 6: Master (25,000–49,999 pts)
Level 7: Grand Master (50,000+ pts)

Level shown on profile and leaderboard.
Each level-up shows a celebration animation.
```

---

# 33. MOBILE EXPERIENCE

## 33.1 PWA Configuration

```json
// manifest.json
{
  "name": "NCAA Academy",
  "short_name": "NCAA Academy",
  "description": "Official Nigerian Chess Arbiter Training Platform",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1a472a",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

## 33.2 Offline Capability

```
Cached for offline use (via Workbox):
- Static assets (HTML, CSS, JS, fonts)
- Course thumbnails and metadata
- Downloaded resources (user-initiated)
- Last-viewed lesson content
- Practice question bank (last 200 questions viewed)

Online-only features:
- Certification examinations (must be online, due to anti-cheating requirements)
- Real-time notifications
- Certificate downloads (fresh generation)
- CPD point logging

Sync on reconnect:
- Practice question answers stored in IndexedDB while offline
- On reconnect: sync to server automatically
- Progress updates sent to server
- User sees "Syncing..." indicator then "All caught up"
```

## 33.3 Mobile-Specific UI Patterns

```
Navigation: Bottom tab bar on mobile (replaces sidebar)
  Home | Learn | Exams | CPD | Profile

Cards: Full-width on mobile (vs grid on desktop)
Modals: Bottom sheet style on mobile (slide up from bottom)
Tables: Horizontal scroll with sticky first column
Forms: Large touch targets (min 44x44px)
Video: Native full-screen on mobile
Chess board: Touch-friendly drag and drop, adequate sizing (min 300x300px)

Gestures:
- Swipe right on lesson: previous lesson
- Swipe left on lesson: next lesson
- Pull to refresh on lists
- Swipe up from bottom: quick actions

Typography:
- Body: 16px minimum (no squinting)
- Buttons: 16px+ text, 44px+ height
- Form labels: 14px minimum
```

---

# 34. ACCESSIBILITY

## 34.1 WCAG 2.1 AA Requirements

```
Perceivable:
✓ Alt text for all images (including chess piece positions described textually)
✓ Captions for all videos
✓ Colour is never the only means of conveying information
✓ Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text
✓ Resize text up to 200% without loss of content

Operable:
✓ All functionality accessible via keyboard
✓ No keyboard traps
✓ Skip navigation links
✓ Focus visible at all times
✓ No seizure-triggering animations
✓ Sufficient time to complete forms (no time limits except exams — and exams have warning)

Understandable:
✓ Language of page declared in HTML
✓ Error messages identify the field and describe the error
✓ No unexpected context changes on input

Robust:
✓ Valid HTML structure
✓ ARIA labels on all interactive components
✓ Tested with NVDA (Windows), VoiceOver (Mac/iOS), TalkBack (Android)
```

## 34.2 Specific Implementations

```
Chess Board Accessibility:
- Text description of board position provided alongside visual board
- Move history readable as text list: "1. e4 e5 2. Nf3 Nc6..."
- "Screen reader mode" toggle: replaces board with text notation view
- Keyboard navigation: tab to board, arrow keys to move between squares

Exam Accessibility:
- All questions readable by screen reader
- Answer options announced by screen reader
- Timer announced periodically via aria-live region
- "Skip to question" keyboard shortcut

Video Accessibility:
- Auto-generated captions (reviewed for accuracy)
- Transcript available as downloadable text file
- Audio descriptions for visual-only content (e.g. board demonstrations)
```

## 34.3 Additional Accessibility Features

```
High Contrast Mode:
- System-preference detects prefers-color-scheme
- Manual override in user preferences
- High contrast toggle in accessibility menu

Text Size:
- User-controlled text size: small, medium (default), large, extra-large
- Affects all text in the platform

Keyboard Navigation:
- Tab order follows visual layout
- All interactive elements focusable
- Esc closes modals and dropdowns
- Enter/Space activates buttons

Reduced Motion:
- Respects prefers-reduced-motion media query
- Animations skipped for users with motion sensitivity
- Essential transitions kept but simplified

Language Support (future):
- Yoruba translation (Phase 3)
- Igbo translation (Phase 3)
- Hausa translation (Phase 3)
```

---

# 35. ADMIN SUPER PANEL

## 35.1 Admin Navigation

```
Admin Panel Navigation:
├── Overview Dashboard
├── Users
│   ├── All Users
│   ├── By Role
│   ├── Pending Verification
│   ├── Suspended / Banned
│   └── Import Users (CSV)
├── Courses
│   ├── All Courses
│   ├── Create Course
│   ├── Pending Review
│   └── Course Analytics
├── Seminars
│   ├── All Seminars
│   ├── Create Seminar
│   └── Attendance Records
├── Examinations
│   ├── All Exams
│   ├── Create Exam
│   ├── Active Attempts (Live)
│   ├── Flagged Attempts
│   └── Manual Grading Queue
├── Question Bank
│   ├── All Questions
│   ├── Create Question
│   ├── Pending Approval
│   ├── AI Generator
│   └── Import Questions
├── Certifications
│   ├── All Certificates
│   ├── Issue Certificate
│   └── Revoke Certificate
├── Licenses
│   ├── All Licenses
│   ├── Issue License
│   ├── Expiring Soon
│   └── Suspended / Revoked
├── CPD
│   ├── CPD Overview
│   ├── Pending Activities
│   └── CPD Requirements Editor
├── Badges
│   ├── All Badges
│   ├── Create Badge
│   └── User Badge Records
├── Mentorship
│   ├── Active Pairs
│   ├── Pending Requests
│   └── Completed
├── Resources
│   ├── All Resources
│   ├── Upload Resource
│   └── Usage Statistics
├── Communications
│   ├── Announcements
│   ├── Send Mass Email
│   └── Email Templates
├── Reports
│   ├── Certification Report
│   ├── CPD Report
│   ├── Exam Report
│   ├── Attendance Report
│   ├── License Report
│   └── Custom Report Builder
├── Audit Logs
│   ├── All Logs
│   ├── User Activity
│   └── Export Logs
└── System Settings
    ├── General
    ├── Email
    ├── Integrations
    ├── Roles & Permissions
    ├── Notification Templates
    └── Maintenance Mode
```

## 35.2 Live Exam Monitor

```
Real-time exam monitoring (admin/instructor view during exam period):

Shows:
- Active attempts: count of users currently in exam
- Exam name, start time
- Per-user: name, time remaining, questions answered, violation count
- Colour coding: green (normal), yellow (minor violations), red (flagged)
- Click on any user to see their violation log in real time
- Button: "Send warning message to user"
- Button: "Force-submit exam" (emergency)
- Button: "Extend time by N minutes" (individual or all)

Powered by Laravel Reverb WebSockets for real-time data.
```

## 35.3 User Management

```
User record shows:
- Basic profile
- Current role(s)
- Current arbiter title
- Active license details
- All certificates
- CPD records
- Exam history (all attempts with scores)
- Seminar registrations
- Course enrollments
- Audit trail (all actions by this user)
- Login history

Admin actions on user:
- Edit profile (override)
- Change role
- Assign courses
- Manually issue certificate
- Manually issue license
- Suspend/unsuspend account
- Reset password (sends reset link)
- Force 2FA
- Impersonate user (for support — logged in audit trail)
- Export user data (GDPR compliance)
- Delete/anonymise user (GDPR right to erasure)
```

## 35.4 System Settings

```
General:
- Platform name, tagline
- Contact email
- Default timezone
- Default language
- Maintenance mode toggle
- Registration open/closed toggle

Exam Settings:
- Default exam duration
- Default pass mark
- Default max attempts
- Default cooldown hours
- Anti-cheat settings (violation thresholds)

CPD Settings:
- Points required per level
- Period length
- Mandatory activities list

License Settings:
- License duration by title
- Renewal window (days before expiry to allow renewal)
- Renewal fee by title
- Auto-approve renewals toggle

Notification Settings:
- Email template editor (each template customisable)
- SMS toggle per notification type
- Push notification toggle

Integration Settings:
- NCAA Main Site API key
- NCAA Payment System webhook secret
- FIDE API key (optional)
- SMS gateway credentials
- Push notification (FCM) server key
```

---

# 36. PAYMENT INTEGRATION

## 36.1 Integration Approach

The Academy integrates with the existing NCAA Payment System rather than implementing its own payment gateway. This ensures:
- Consistent transaction records across all NCAA systems
- Single reconciliation point
- Existing compliance and security certifications are not duplicated

## 36.2 Payable Items in Academy

```
1. Seminar/Webinar registration fees
2. Exam retake fees (configurable — may be free or paid)
3. License renewal fees
4. Replacement certificate fee (physical copy if needed)

Each payable item:
- Fee is configurable in admin settings
- Can be set to zero (free)
- Can be set as "sponsored" (fee waived for specific users)
```

## 36.3 Payment Flow

```
1. User initiates payable action (e.g. seminar registration)
2. Academy creates a pending record
3. Academy redirects to NCAA Payment System with:
   - Amount
   - Description
   - Return URL (success/failure)
   - Reference ID (academy transaction reference)
4. User completes payment on NCAA Payment System
5. NCAA Payment System sends webhook to Academy:
   - Status: success/failed
   - Reference ID
   - Transaction ID
6. Academy processes webhook:
   - If success: confirm the registration/renewal/etc.
   - If failed: cancel the pending record, notify user
7. User sees confirmation

Idempotency:
- Webhook processing is idempotent (duplicate webhooks ignored via reference ID)
- Payment status checked before allowing access to the paid service
```

## 36.4 Payment Records

```
academy_payments
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  uuid                  CHAR(36) UNIQUE NOT NULL
  user_id               BIGINT UNSIGNED NOT NULL
  reference             VARCHAR(100) UNIQUE NOT NULL
  ncaa_transaction_id   VARCHAR(100) NULL UNIQUE
  amount                DECIMAL(12,2) NOT NULL
  currency              VARCHAR(3) DEFAULT 'NGN'
  purpose               VARCHAR(100) NOT NULL
  purpose_reference_id  BIGINT UNSIGNED NULL
  status                ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending'
  paid_at               TIMESTAMP NULL
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

---

# 37. API ARCHITECTURE

## 37.1 RESTful API Design

```
Base URL: https://academy.ncaaweb.com.ng/api/v1

Authentication: Bearer token (Sanctum) in Authorization header

Standard response format:
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": {
    "pagination": {
      "current_page": 1,
      "last_page": 5,
      "per_page": 20,
      "total": 98
    }
  }
}

Error response:
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

## 37.2 Key API Endpoints

```
Authentication:
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
GET    /api/v1/auth/user (get current user)
PUT    /api/v1/auth/user (update profile)

Courses:
GET    /api/v1/courses (list with filters)
GET    /api/v1/courses/{id} (single course)
POST   /api/v1/courses (create — admin/instructor)
PUT    /api/v1/courses/{id} (update — admin/instructor)
DELETE /api/v1/courses/{id} (soft delete — admin)
POST   /api/v1/courses/{id}/enroll
GET    /api/v1/courses/{id}/modules
GET    /api/v1/courses/{id}/lessons
PUT    /api/v1/lessons/{id}/progress (update progress)

Examinations:
GET    /api/v1/exams (list available exams)
GET    /api/v1/exams/{id} (exam details)
POST   /api/v1/exams/{id}/attempts (start attempt)
GET    /api/v1/exam-attempts/{uuid} (get active attempt)
PUT    /api/v1/exam-attempts/{uuid}/answers/{questionId} (submit answer)
POST   /api/v1/exam-attempts/{uuid}/submit (final submission)
GET    /api/v1/exam-attempts/{uuid}/result (get result)

Practice:
GET    /api/v1/practice/questions (get practice questions)
POST   /api/v1/practice/answers (submit practice answers)
GET    /api/v1/practice/stats (performance statistics)
GET    /api/v1/practice/weak-areas (weak area analysis)

Certifications:
GET    /api/v1/certifications (list user's certs)
GET    /api/v1/certifications/{uuid} (single cert)
GET    /api/v1/certifications/{uuid}/download (download PDF)
GET    /api/v1/certifications/verify/{hash} (public verification — no auth)

Licenses:
GET    /api/v1/licenses (list user's licenses)
GET    /api/v1/licenses/{uuid} (single license)
POST   /api/v1/licenses/{uuid}/renewal (initiate renewal)

CPD:
GET    /api/v1/cpd/summary (CPD progress summary)
GET    /api/v1/cpd/records (CPD record list)
POST   /api/v1/cpd/records (log external activity)
GET    /api/v1/cpd/activities (available CPD activities)

Seminars:
GET    /api/v1/seminars (list seminars)
GET    /api/v1/seminars/{id} (seminar details)
POST   /api/v1/seminars/{id}/register (register for seminar)
DELETE /api/v1/seminars/{id}/registration (cancel registration)

Notifications:
GET    /api/v1/notifications (list notifications)
PUT    /api/v1/notifications/{id}/read (mark as read)
PUT    /api/v1/notifications/read-all
DELETE /api/v1/notifications/{id}

Admin endpoints (all require admin role):
GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/{id}
PUT    /api/v1/admin/users/{id}
POST   /api/v1/admin/users/{id}/suspend
POST   /api/v1/admin/certificates/issue
POST   /api/v1/admin/certificates/{id}/revoke
POST   /api/v1/admin/licenses/issue
POST   /api/v1/admin/licenses/{id}/suspend
GET    /api/v1/admin/reports/{type}
GET    /api/v1/admin/audit-logs
```

---

# 38. EMAIL & COMMUNICATION SYSTEM

## 38.1 Email Architecture

```
Provider: Mailgun or Amazon SES
Template engine: Laravel Blade + Mailtrap for dev testing
Design: Responsive HTML emails, NCAA branding

Email components:
- NCAA Academy header (logo + tagline)
- Content block
- CTA button
- Footer (contact, unsubscribe, address)
```

## 38.2 Core Email Templates

```
1. Welcome & Email Verification
   Subject: "Welcome to NCAA Academy — Verify your email"
   
2. Password Reset
   Subject: "Reset your NCAA Academy password"
   
3. Exam Result — Pass
   Subject: "Congratulations! You passed the [exam name]"
   Body: Score, certificate preview, download link
   
4. Exam Result — Fail
   Subject: "Your [exam name] result"
   Body: Score, pass mark, breakdown by topic, "What to study next" section, next attempt eligibility
   
5. Certificate Ready
   Subject: "Your [title] certificate is ready"
   Body: Certificate preview, download link, share on LinkedIn prompt
   
6. License Expiry Warning (90 / 30 / 7 days)
   Subject: "Your arbiter license expires in [X] days"
   Body: Expiry date, renewal steps, CPD status check
   
7. CPD Reminder
   Subject: "Your CPD period ends in 6 months — [X] points needed"
   Body: Current points, required points, recommended activities
   
8. Seminar Registration Confirmation
   Subject: "Registered: [Seminar Name]"
   Body: Date, location, pre-seminar materials, calendar invite attachment
   
9. Seminar Reminder
   Subject: "[Seminar Name] starts tomorrow"
   Body: Time, location/link, materials reminder
   
10. Weekly Digest (optional, user-configurable)
    Subject: "Your NCAA Academy week in review"
    Body: Points earned, lessons completed, upcoming events, recommended content
```

## 38.3 SMS Templates

```
SMS used only for time-critical, short messages:

License Expiry (7 days): "NCAA Academy: Your arbiter license expires in 7 days. Log in to renew: {link}"

Exam Result: "NCAA Academy: Your result is ready. You {passed/did not pass} the {exam name} with {score}%. Check details: {link}"

New Assignment Notification: "NCAA Academy: You have been assigned to {tournament} as {role}. Details: {link}"
```

---

# 39. FILE MANAGEMENT SYSTEM

## 39.1 File Types & Storage

```
Course Videos:
- Stored in: Cloudflare R2 or S3
- Format: MP4 (H.264 + AAC)
- Max size: 2GB per video
- Transcoding: Multiple quality levels (360p, 720p, 1080p)
- Streaming: HLS or direct URL
- CDN delivery: Cloudflare

Course Documents:
- Stored in: Cloudflare R2
- Supported: PDF, DOCX, PPTX, XLSX
- Max size: 50MB
- Served via: Signed temporary URLs (expire in 1 hour)

Resource Library Files:
- Stored in: Cloudflare R2
- Same types and limits as course documents

Profile Photos:
- Stored in: Cloudflare R2
- Max size: 5MB
- Format: JPEG, PNG, WebP
- Auto-resized to: 400x400px and 100x100px

Certificate PDFs:
- Stored in: Cloudflare R2 (secure, private bucket)
- Served via: Signed URLs
- Regenerated on-demand if missing

Exam Violation Screenshots (if implemented):
- Stored in: Cloudflare R2 (secure, private bucket)
- Retained for: 1 year post-exam
- Admin access only
```

## 39.2 Upload Security

```
All uploads validated server-side:
1. File extension must be in whitelist
2. MIME type must match extension (prevents spoofing)
3. File content scanned for malicious patterns
4. Max file size enforced
5. Filename sanitised before storage (UUID-based names used in storage)
6. Original filename stored in database for display

For video uploads:
- Check is actually a video file (FFMPEG probe)
- Duration limit: 3 hours maximum
- Extract thumbnail automatically
- Queue for transcoding if needed
```

---

# 40. AUDIT & COMPLIANCE SYSTEM

## 40.1 Audit Log Schema

Every significant action is logged:

```
academy_audit_logs:
- user_id: who performed the action
- action: what was done (e.g. "certificate.issued", "exam.force_submitted")
- model_type + model_id: what was affected
- old_values: JSON — state before action
- new_values: JSON — state after action
- ip_address: from where
- user_agent: with which browser
- created_at: when

Actions logged (non-exhaustive):
- user.registered
- user.login
- user.login_failed
- user.password_changed
- user.2fa_enabled
- user.suspended
- user.role_changed
- exam.started
- exam.submitted
- exam.violated (each violation)
- exam.force_submitted (admin)
- exam.override_result (admin)
- certificate.issued
- certificate.revoked
- license.issued
- license.renewed
- license.suspended
- license.revoked
- cpd.activity_approved
- cpd.activity_rejected
- admin.impersonated_user
- admin.settings_changed
```

## 40.2 Data Retention

```
Audit logs: 7 years (legal compliance)
Exam attempt data: 5 years
Exam violation logs: 2 years
Certificate records: Permanent (never deleted)
License records: 10 years after expiry
User data: Until deletion request + 30-day grace
CPD records: 10 years
```

## 40.3 GDPR-Style Compliance

```
User rights implemented:
1. Right to access: User can download all their data
2. Right to correction: User can update their profile
3. Right to erasure: User can request account deletion
   - Personal data anonymised
   - Exam records: anonymised (scores kept for statistical purposes)
   - Certificate records: kept with name (certificate was issued — part of regulatory record)
4. Right to portability: User can export data as JSON

Admin response time: 30 days maximum for all data requests
```

---

# 41. PHASE IMPLEMENTATION ROADMAP

## 41.1 Pre-Development (Month 0 — 6 weeks)

```
Week 1–2: Requirements Finalisation
- Stakeholder meetings with NCAA board
- Sign off on this specification
- Identify any gaps or local regulations
- Confirm FIDE integration requirements

Week 3–4: Technical Preparation
- Finalise tech stack decisions
- Set up development environment (Docker + Laravel Sail)
- Set up GitHub repository with branch protection
- Set up CI/CD pipeline
- Set up staging and production servers
- Configure Cloudflare DNS and CDN
- Set up monitoring (Sentry, server monitoring)

Week 5–6: Design System
- Define brand colours, typography, spacing
- Design core UI components
- Design key screens: dashboard, course viewer, exam interface
- Get stakeholder approval on designs
- Build component library (shadcn/ui customisation)
```

## 41.2 Phase 1: Foundation (Months 1–4)

```
Month 1: Core Infrastructure
Sprint 1:
- Database schema creation (all tables from Section 6)
- Authentication system (registration, login, email verification, password reset)
- User profile management
- Role and permission system
- Basic admin panel: user management

Sprint 2:
- Course catalog (list, filter, search)
- Course viewer (modules, lessons, progress tracking)
- Video player with progress tracking
- PDF viewer
- Text-based lessons (rich text)

Month 2: LMS Completion
Sprint 3:
- Interactive chess board component
- PGN exercise lessons
- Module quiz functionality
- Lesson notes
- My Learning dashboard
- Course search

Sprint 4:
- Seminar management (create, list, detail)
- Seminar registration flow
- Attendance tracking (manual)
- Material distribution

Month 3: Examination System
Sprint 5:
- Question bank (create, edit, approve, categorise)
- MCQ and True/False exam rendering
- Exam attempt management (start, answer, submit)
- Auto-grading engine
- Results display and review mode

Sprint 6:
- Anti-cheating engine (violation detection and logging)
- Exam timer and auto-submit
- Manual grading interface (essay questions)
- Exam history view

Month 4: Certification & Polish
Sprint 7:
- Certificate generation (PDF via DomPDF)
- QR code generation
- Public verification endpoint
- Digital license system
- CPD tracker (basic)
- Notifications (in-app)

Sprint 8:
- Dashboard (all role variants)
- Resource library (upload, search, download)
- Email notifications
- Admin reporting (basic)
- Security review
- Performance optimisation
- UAT preparation

Phase 1 Deliverable: Fully functional Academy platform covering:
✓ User registration and profiles
✓ Courses (video, document, text, quiz)
✓ Seminars with registration and attendance
✓ Certification examinations with anti-cheating
✓ Certificate and license management
✓ Basic CPD tracking
✓ Resource library
✓ Email notifications
✓ Admin panel
```

## 41.3 Phase 2: Advanced Learning (Months 5–8)

```
Month 5: Interactive Chess & Practice
Sprint 9:
- Interactive chess board questions in exams
- Practice question system (all modes)
- Weak areas identification algorithm
- Daily challenge feature

Sprint 10:
- Refresher course system
- Micro-learning refreshers
- Refresher compliance tracking
- Smart content recommendations

Month 6: CPD Enhancement & Promotions
Sprint 11:
- Full CPD management (external activity submission, admin review)
- CPD compliance reporting
- License renewal workflow
- Promotion tracker (all pathways)

Sprint 12:
- Norm tracking
- Experience records
- Mentorship programme (basic)
- Badge system (core badges)

Month 7: Analytics & AI
Sprint 13:
- Full analytics dashboard for admin
- Custom report builder
- Question analytics (discrimination index, difficulty analysis)
- Instructor analytics

Sprint 14:
- AI Study Assistant (grounded on FIDE/NCAA materials)
- AI Question Generator (admin tool)
- Smart recommendation engine improvement

Month 8: Integrations & Gamification
Sprint 15:
- Tournament experience integration with NCAA Assignment System
- Norm auto-detection
- Push notifications (PWA)
- SMS notifications

Sprint 16:
- Leaderboards
- Streaks system
- Experience levels
- Seminar cohort competitions
- Public Arbiter Registry

Phase 2 Deliverable:
✓ Interactive chess board exam questions
✓ Full practice question system
✓ Refresher course system
✓ CPD renewal and compliance enforcement
✓ Promotion pathway tracking
✓ Mentorship programme
✓ Badge system
✓ AI Study Assistant
✓ Analytics dashboard
✓ Tournament experience integration
✓ Gamification system
✓ Public Registry
```

## 41.4 Phase 3: Simulation & Advanced Features (Months 9–14)

```
Month 9–10: Case Studies & Decision Trees
- Build scenario/decision tree data model
- Admin interface for creating branching scenarios
- Candidate interface for working through decision trees
- Scoring engine for multi-step scenarios
- Library of 20+ arbiter case study scenarios at launch

Month 11–12: 2D Tournament Hall Simulator
- Design tournament hall data model
- Build top-down hall view (canvas-based)
- Implement incident generation engine
- Build candidate response interface
- Implement scoring and feedback system
- Create Chief Arbiter training mode

Month 13–14: Advanced Features & Internationalisation
- 3D hall simulator research and prototype (Three.js)
- Yoruba/Igbo/Hausa translations
- FIDE integration improvements
- Advanced AI features (simulator)
- Performance at scale testing
- Launch preparation for West African expansion

Phase 3 Deliverable:
✓ Decision tree case study system
✓ 2D Tournament Hall Simulator
✓ Multi-language support
✓ 3D hall prototype
✓ AI-driven simulation (research)
```

---

# 42. INFRASTRUCTURE & DEPLOYMENT

## 42.1 Server Configuration

```
Production Server Requirements:
- CPU: 4 vCPU minimum (8 recommended)
- RAM: 8GB minimum (16GB recommended)
- Storage: 100GB SSD (expandable)
- OS: Ubuntu 22.04 LTS
- Location: Nigeria or South Africa (low latency for Nigerian users)

Software stack:
- Nginx 1.24+
- PHP 8.3 + PHP-FPM
- MySQL 8.0
- Redis 7.x
- Node.js 20.x (for build processes and Reverb WebSocket server)
- Supervisor (for queue workers and Reverb)
- Certbot (Let's Encrypt SSL)

Additional Services:
- Cloudflare R2 (file storage — external service)
- Cloudflare CDN (DNS + CDN — external service)
- Mailgun or SES (email — external service)
- Termii or Africa's Talking (SMS — external service)
- Sentry (error tracking — external service)
```

## 42.2 Deployment Pipeline

```
Development → Staging → Production

Branch strategy:
- main: production-ready code
- staging: staging environment
- develop: integration branch
- feature/*: individual features
- hotfix/*: production bug fixes

GitHub Actions CI/CD:
On push to develop:
  1. Run PHPUnit tests
  2. Run Vitest tests
  3. Run PHP linting (Pint)
  4. Run JS linting (ESLint)
  5. Deploy to staging

On push to main:
  1. All tests pass
  2. Build frontend assets (Vite build)
  3. Deploy to production (zero-downtime with Laravel maintenance mode)
  4. Run database migrations
  5. Clear caches
  6. Health check
```

## 42.3 Backup Strategy

```
Daily backups:
- MySQL: full backup at 02:00 Lagos time
- Redis: snapshot at 02:30 Lagos time
- File storage: incremental backup at 03:00 Lagos time

Backup retention:
- Daily: 30 days
- Weekly: 3 months
- Monthly: 1 year

Backup storage:
- Primary: Cloudflare R2 (separate bucket, different region)
- Secondary: External storage service

Recovery testing:
- Quarterly: test restoration from backup to staging
- Document recovery time objectives
```

---

# 43. TESTING STRATEGY

## 43.1 Backend Testing (Laravel)

```
Unit Tests:
- All Service classes
- Certificate generation
- CPD calculation
- Exam scoring engine
- Promotion requirement checking

Feature Tests:
- All API endpoints
- Authentication flows
- Exam attempt lifecycle
- Certificate issuance
- Payment webhook handling

Integration Tests:
- Full exam flow (start → answer → submit → grade → certificate)
- Full certification pathway
- CPD tracking through period

Test coverage target: 80% minimum

Tools:
- Pest PHP (modern test framework on top of PHPUnit)
- Laravel HTTP Testing helpers
- Database factories and seeders
```

## 43.2 Frontend Testing (React)

```
Unit Tests (Vitest):
- Utility functions
- Chess board move validation
- Exam timer logic
- Score calculation

Component Tests (React Testing Library):
- Course viewer renders correctly
- Exam question types render and accept answers
- Chess board renders position
- Dashboard widgets show correct data

Coverage target: 70% minimum
```

## 43.3 End-to-End Testing (Playwright)

```
Critical paths tested:
1. Full registration → email verification → onboarding
2. Enroll in course → complete lesson → take quiz
3. Register for seminar → attend → take exam → receive certificate
4. Log in as admin → create course → publish → verify visible to students
5. Take certification exam → pass → receive certificate → verify via QR
6. CPD log → approval → points reflected in tracker
7. License expiry warning → renewal → new license issued
```

## 43.4 Performance Testing

```
Tools: k6 or Locust

Scenarios:
- 100 concurrent users taking practice exams simultaneously
- 500 concurrent users browsing course catalog
- Peak seminar registration (200 users registering simultaneously)
- 50 concurrent exam submissions

Targets:
- Course listing: < 200ms response time at 500 concurrent
- Exam answer submission: < 300ms at 100 concurrent
- Certificate PDF generation: < 5 seconds
- Dashboard load: < 1 second
```

---

# 44. PERFORMANCE REQUIREMENTS

## 44.1 Response Time Targets

| Endpoint Type | Target Response | Maximum |
|--------------|----------------|---------|
| Dashboard | < 500ms | 2s |
| Course listing | < 300ms | 1s |
| Course viewer (lesson load) | < 500ms | 2s |
| Practice questions | < 200ms | 500ms |
| Exam question load | < 200ms | 500ms |
| Exam answer submit | < 300ms | 1s |
| Admin reports | < 2s | 10s |
| Certificate PDF | < 3s | 10s |

## 44.2 Caching Strategy

```
Redis cache:
- User dashboard data: 5 minutes
- Course catalog: 10 minutes
- Individual course data: 15 minutes
- Question bank categories: 1 hour
- Practice question sets: 30 minutes
- User CPD summary: 5 minutes
- Leaderboards: 15 minutes

Database query optimisation:
- All foreign keys indexed
- Additional indexes on frequently queried columns:
  - users.email
  - academy_exam_attempts.user_id + exam_id
  - academy_enrollments.user_id + course_id
  - academy_cpd_records.user_id + period
  - academy_certificates.verification_hash
  - academy_licenses.user_id + status
- Full-text search indexes on:
  - academy_questions.question_text
  - academy_resources.title + description

Query limits:
- Never return unbounded result sets
- All list queries paginated (max 100 per page)
- Complex reports run as background jobs (not synchronous API calls)
```

---

# 45. INTEGRATION SPECIFICATIONS

## 45.1 NCAA Main Site Integration

```
Shared data:
- users table (read/write from both systems)
- Payments system
- Member IDs

SSO (Phase 2):
- Single login session across ncaaweb.com.ng and academy.ncaaweb.com.ng
- Implemented via shared session cookie on parent domain
- Laravel Sanctum tokens shared via API

Data sync:
- User profile changes on main site → pushed to Academy via webhook
- Member suspension on main site → reflected in Academy
- Payment completion on main site → Academy webhook updates registration/renewal
```

## 45.2 NCAA Tournament Assignment Integration

```
Webhook from Assignment System to Academy:
POST /api/v1/integrations/assignment-webhook

Payload:
{
  "event": "arbiter_assigned",
  "tournament_id": 456,
  "tournament_name": "Lagos Open 2026",
  "arbiter_user_id": 789,
  "role": "chief_arbiter",
  "start_date": "2026-06-01",
  "end_date": "2026-06-07",
  "rounds": 9,
  "players": 60,
  "is_norm_qualifying": true,
  "norm_type": "na"
}

Academy response:
- Creates/updates experience record
- If norm-qualifying: creates draft norm record for admin verification
- Updates CPD if the event awards CPD points
- Awards "Chief Arbiter" badge if first Chief Arbiter assignment
```

## 45.3 FIDE API Integration (Phase 2)

```
Purpose: Validate FIDE IDs, pre-fill profiles, import FIDE titles

Endpoint used: FIDE public arbiters API
- GET https://ratings.fide.com/profile/{fide_id} (or API equivalent)

Data pulled:
- Full name
- Country
- FIDE title (if any arbiter title on record)
- FIDE ID verification

Used during:
- User registration (validate FIDE ID if provided)
- Norm verification (check if tournament was registered with FIDE)
- Title confirmation (cross-reference FIDE title with Academy records)
```

---

# 46. UI/UX DESIGN SYSTEM

## 46.1 Brand Identity

```
Primary Colour: #1a472a (NCAA Green — deep forest green)
Secondary Colour: #c9a84c (NCAA Gold/Amber)
Accent: #e8f5e9 (Light Green — backgrounds)
Text Primary: #1a1a1a
Text Secondary: #5a5a5a
Text Muted: #9a9a9a
Border: #e5e7eb
Background: #ffffff
Surface: #f9fafb
Error: #dc2626
Warning: #f59e0b
Success: #16a34a
Info: #2563eb

Typography:
- Font family: Inter (Google Fonts) with system fallback
- Headings: Inter 600–700
- Body: Inter 400
- Code/FEN: JetBrains Mono
- Scale: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48px

Spacing scale (Tailwind compatible):
1 = 4px, 2 = 8px, 3 = 12px, 4 = 16px, 5 = 20px,
6 = 24px, 8 = 32px, 10 = 40px, 12 = 48px, 16 = 64px

Border radius:
- sm: 4px (inputs, small elements)
- md: 8px (buttons, cards)
- lg: 12px (large cards, modals)
- full: 9999px (badges, pills)

Shadows:
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.07)
- lg: 0 10px 15px rgba(0,0,0,0.10)
```

## 46.2 Component Library

```
Button variants:
- Primary (solid green)
- Secondary (outlined green)
- Ghost (transparent)
- Destructive (red)
- Loading state (spinner replaces text or appears beside)

Sizes:
- sm: px-3 py-1.5 text-sm
- md: px-4 py-2 text-base (default)
- lg: px-6 py-3 text-lg

Form elements:
- Input: 40px height, border-gray-300, focus ring green
- Select: styled consistently with inputs
- Checkbox: custom styled, green when checked
- Radio: custom styled
- Textarea: auto-resize where appropriate
- Date/time picker: native HTML5 with custom styling

Data display:
- Table: striped rows, sortable columns, sticky header
- Card: white bg, subtle shadow, rounded
- Badge: pill shape, semantic colours (green=active, red=expired, yellow=warning)
- Alert: coloured left border, icon, title + body
- Progress bar: animated fill, percentage label
- Skeleton loader: for async content (pulsing grey bars)

Navigation:
- Sidebar: collapsible, icon + label, active state
- Breadcrumb: chevron separated
- Tabs: underline style
- Bottom nav (mobile): icons only with labels
```

---

# 47. NAVIGATION ARCHITECTURE

## 47.1 Full Navigation Tree

```
Public Routes (no login required):
├── / (landing page)
├── /register
├── /login
├── /forgot-password
├── /reset-password/{token}
├── /verify-email/{id}/{hash}
└── /verify/{hash} (certificate verification)

Authenticated Routes:
├── /dashboard
│
├── /learn
│   ├── /learn/courses (catalog)
│   ├── /learn/courses/{slug} (course detail)
│   ├── /learn/courses/{slug}/lessons/{lessonId} (lesson viewer)
│   ├── /learn/my-courses (my learning)
│   ├── /learn/seminars (seminar list)
│   ├── /learn/seminars/{id} (seminar detail)
│   ├── /learn/webinars
│   ├── /learn/refreshers (refresher courses)
│   └── /learn/resources (resource library)
│
├── /practice
│   ├── /practice (practice dashboard)
│   ├── /practice/quick
│   ├── /practice/topic/{category}
│   ├── /practice/weak-areas
│   ├── /practice/simulation
│   ├── /practice/daily
│   └── /practice/bookmarks
│
├── /exams
│   ├── /exams (available exams)
│   ├── /exams/{id} (exam detail)
│   ├── /exams/{id}/take (exam interface)
│   ├── /exams/attempts/{uuid}/result
│   └── /exams/history
│
├── /certifications
│   ├── /certifications (my certificates)
│   ├── /certifications/{uuid} (certificate detail)
│   └── /certifications/{uuid}/download
│
├── /license
│   ├── /license (license status)
│   └── /license/renew
│
├── /cpd
│   ├── /cpd (CPD dashboard)
│   ├── /cpd/activities (log activity)
│   └── /cpd/history
│
├── /career
│   ├── /career (promotion tracker)
│   ├── /career/norms
│   └── /career/experience
│
├── /badges (badge collection)
│
├── /mentorship
│   ├── /mentorship (mentorship hub)
│   └── /mentorship/{id} (specific mentorship)
│
├── /profile
│   ├── /profile (view/edit profile)
│   ├── /profile/security
│   └── /profile/notifications
│
└── /admin (admin panel — admin role required)
    └── (all admin sub-routes as per Section 35.1)
```

---

# 48. ERROR HANDLING STRATEGY

## 48.1 Frontend Error Handling

```
API errors:
- 400 Bad Request: Show validation errors inline on form fields
- 401 Unauthorized: Redirect to login with "session expired" toast
- 403 Forbidden: Show "Access Denied" page with description and navigation link
- 404 Not Found: Show 404 page with search bar and navigation links
- 422 Unprocessable Entity: Show field-level validation errors
- 429 Too Many Requests: Show "Too many attempts — please wait X minutes"
- 500 Server Error: Show generic error with support contact and error reference ID

Exam-specific error handling:
- Network error during exam: Show "Connection issue" banner; queue answer locally
- Server error on submit: Retry 3 times with exponential backoff; show progress to user
- Timer reaches zero during network outage: Store state, submit when reconnected

Loading states:
- All async operations show loading indicators
- No "flash of empty content" — skeleton screens used
- Optimistic updates for non-critical actions (e.g. marking notification as read)
```

## 48.2 Backend Error Handling

```
Unhandled exceptions:
- Caught by Laravel exception handler
- Logged with full stack trace to Sentry
- API returns JSON error response (never HTML in production)
- Reference ID generated for user to quote to support

Database errors:
- Connection failures: Return 503 with retry-after header
- Deadlocks: Auto-retry up to 3 times

Queue failures:
- Failed jobs retried 3 times with exponential backoff
- After 3 failures: marked as failed, admin alerted
- Certificate generation failure: admin notified, user asked to try again

File upload failures:
- Return specific error (too large, wrong type, virus detected)
- Never silently fail

Payment webhook failures:
- If webhook processing fails: return 500 to payment system (triggers retry)
- Idempotency key prevents double-processing
```

---

# 49. DATA MIGRATION PLAN

## 49.1 Legacy Data Import

If NCAA has existing arbiter records in a spreadsheet or older system:

```
Data to import:
- Existing licensed arbiters (name, contact, title, license date)
- Historical seminar attendance records
- Existing certificates (manually issued)

Import process:
1. Admin downloads import template (Excel/CSV format)
2. NCAA staff populates template with existing data
3. Admin uploads template
4. System validates each row:
   - Name required
   - Email required and unique
   - Title must be valid enum
   - Dates must be valid
5. Preview: show first 20 rows, total count, error list
6. Confirm: process import
   - Creates user account (sends "Set Your Password" email)
   - Creates arbiter profile
   - Creates certificate record (type: legacy_import)
   - Creates license record
7. Import report: N successful, N failed with reasons
```

## 49.2 FIDE Registry Import

```
For arbiters with FIDE IDs:
- Import FIDE ID into user profile
- Queue FIDE API validation for each imported user
- On validation: mark fide_id as verified
- Pull additional data from FIDE if available
```

---

# 50. MAINTENANCE & SUPPORT PLAN

## 50.1 Scheduled Maintenance

```
Weekly:
- Clear expired sessions from database
- Process failed job cleanup
- Rebuild search indexes (Meilisearch)

Monthly:
- Review and resolve all Sentry errors
- Test backup restoration on staging
- Review security alerts and apply patches
- Review slow query log and optimise if needed
- Analyse CPD compliance dashboard and send reminder emails

Quarterly:
- Security audit of all user permissions
- Performance testing under load
- Review and update FIDE Laws references in question bank
- Review and update any expired course content
- E2E test suite run

Annually:
- Full security penetration test
- Accessibility audit (WCAG compliance)
- Review and update CPD point requirements
- Full data backup test and recovery drill
- Platform feature review and roadmap planning
```

## 50.2 Support Processes

```
Support channels:
- In-app: Help button → opens support ticket form
- Email: academy@ncaaweb.com.ng
- Phone (admin only): NCAA office number

Issue categories:
- Technical issues: login, exam submission, certificate download
- Content issues: incorrect question, broken video, wrong answer
- Certification issues: wrong certificate data, missing certificate
- CPD issues: points not credited, activity not approved
- License issues: wrong expiry, status incorrect

Response SLAs:
- Critical (exam in progress, cannot submit): 1 hour
- High (cannot access exam today, certificate incorrect): 4 hours
- Medium (CPD not credited, course not loading): 24 hours
- Low (general questions, feature requests): 72 hours

Escalation:
Level 1: Academy admin (most issues)
Level 2: NCAA IT team (server/infrastructure)
Level 3: Development team (code issues)
```

## 50.3 Content Maintenance

```
Question bank maintenance:
- Annual review of all questions against current FIDE Laws
- Update references and explanations after each FIDE rule change
- Retire outdated questions (soft delete, not hard delete)
- Target: add minimum 100 new questions per year
- Review difficulty ratings annually (based on analytics)

Course content maintenance:
- Review all courses annually for accuracy
- Update within 30 days of any FIDE rule change that affects content
- Video refresh if content significantly changed
- Track content versions

Resource library maintenance:
- Update FIDE documents within 2 weeks of FIDE publishing new versions
- Archive (not delete) old versions with clear date labelling
- Review links quarterly for broken URLs
```

---

# APPENDIX A: QUESTION BANK SEED DATA SPECIFICATION

## Minimum Question Bank at Launch

```
Category: Laws of Chess
  Easy: 50 questions
  Medium: 50 questions
  Hard: 30 questions
  Expert: 20 questions

Category: Pairings
  Easy: 30 questions
  Medium: 30 questions
  Hard: 20 questions
  Expert: 10 questions

Category: Anti-Cheating
  Easy: 20 questions
  Medium: 30 questions
  Hard: 20 questions

Category: Tournament Regulations
  Easy: 25 questions
  Medium: 25 questions
  Hard: 15 questions

Category: Appeals
  Easy: 15 questions
  Medium: 20 questions
  Hard: 10 questions

Category: Rapid/Blitz Rules
  Easy: 20 questions
  Medium: 20 questions

Category: Ethics
  Easy: 15 questions
  Medium: 15 questions

Total at launch: ~500+ questions minimum
```

---

# APPENDIX B: CERTIFICATE NUMBER SEQUENCES

```
NA certificates: NCA-NA-YYYY-NNNN (starting 0001 each year)
FA certificates: NCA-FA-YYYY-NNNN
IA certificates: NCA-IA-YYYY-NNNN
Course completion: NCA-CC-YYYY-NNNN
Seminar attendance: NCA-SA-YYYY-NNNN
CPD recognition: NCA-CPD-YYYY-NNNN
```

---

# APPENDIX C: ANTI-CHEATING VIOLATION THRESHOLDS

```
Configurable via admin settings, defaults:

Tab switch: each occurrence = 1 violation
Window blur: each occurrence = 1 violation (min 5 seconds out of focus)
Keyboard shortcut: each occurrence = 1 violation
Context menu: each occurrence = 0.5 violations
DevTools open: detected = 5 violations immediately
Idle timeout (2+ min): each occurrence = 2 violations

Warning thresholds:
First warning at: 3 violations
Second warning at: 7 violations
Auto-flag at: 10 violations
Auto-submit at: 25 violations (or DevTools open + 5 window switches)
```

---

# APPENDIX D: SUPPORTED BROWSERS

```
Fully supported:
- Chrome 110+
- Firefox 110+
- Safari 15+ (desktop and iOS)
- Edge 110+
- Samsung Internet 18+

Partially supported (no active exam support):
- Opera 90+
- Brave 1.50+

Not supported:
- Internet Explorer (any version)
- Chrome < 90
- Firefox < 90

Minimum mobile OS:
- iOS 14+
- Android 9+
```

---

# APPENDIX E: GLOSSARY

```
Arbiter: An official who enforces the rules of chess during a tournament.
Candidate: A person studying for their first arbiter certification.
CPD: Continuing Professional Development — ongoing education to maintain professional competency.
FA: FIDE Arbiter — an arbiter certified at the international level by FIDE.
FIDE: Fédération Internationale des Échecs — the international chess organisation.
FEN: Forsyth-Edwards Notation — a standard way to describe a chess position.
IA: International Arbiter — the highest arbiter title awarded by FIDE.
LMS: Learning Management System — a platform for delivering and tracking education.
NA: National Arbiter — an arbiter certified at the national level by NCAA.
NCAA: Nigerian Chess Association Academy — the organisation this platform serves.
Norm: A qualifying performance at a specific level of tournament required for title promotion.
PGN: Portable Game Notation — a standard for recording chess games.
PWA: Progressive Web App — a web application with app-like features including offline support.
Touch Move: The rule that a player who touches a piece must move it if a legal move exists.
WCAG: Web Content Accessibility Guidelines — international standards for web accessibility.
```

---

*End of NCAA Academy Complete Platform Specification*
*Document Version: 1.0*
*Prepared for: Nigerian Chess Association*
*Platform: academy.ncaaweb.com.ng*
*Total Sections: 50 main sections + 5 appendices*

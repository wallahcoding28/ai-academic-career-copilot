# PROJECT ROADMAP & PROGRESS: AI Academic & Career Copilot

This document tracks the staged development and verification of the **AI Academic & Career Copilot: An Intelligent Student Success Platform**.

---

## Staged Roadmap Overview

- [x] **STAGE 1: Project Foundation & Shell** *(Complete & verified)*
- [x] **STAGE 2: Dashboard Refinement & AI Resume Analyzer** *(Complete & verified)*
- [x] **STAGE 3: Skill Gap Analyzer** *(Complete & verified)*
- [x] **STAGE 4: AI Interview Question Generator** *(Complete & verified)*
- [x] **STAGE 5: AI Study Planner** *(Complete & verified)*
- [x] **WHOLE-PRODUCT INTEGRATION & PRODUCTION AUDIT** *(Complete & verified)*
- [ ] **STAGE 6: Database/History, Error Handling & Whole-Product Hardening** *(Next Milestone)*
- [ ] **STAGE 7: UI/UX Refinement, Responsive Design & Production Readiness**

---

## Detailed Checklist by Stage

### STAGE 1: Project Foundation & Shell
- [x] Create project directory structure (`frontend/`, `backend/`, `database/`).
- [x] Establish documentation suite:
  - [x] `README.md` (Project overview, setup instructions)
  - [x] `PROJECT_CONTEXT.md` (Persistent context & rules for AI agents)
  - [x] `ARCHITECTURE.md` (System diagrams, component layers, data flows)
  - [x] `TODO.md` (Multi-stage roadmap & progress checklist)
  - [x] `.env.example` & `.gitignore`
- [x] Setup SQLite database foundation:
  - [x] `database/schema.sql` defining `users`, `resumes`, `skill_evaluations`, `interview_sessions`, `study_plans`, `study_sessions`
  - [x] `database/init_db.py` script for table creation & idempotent migrations
- [x] Build Backend Foundation (Python Flask):
  - [x] Flask application factory (`create_app`) with modular Blueprints
  - [x] Configuration classes with environment variable support (`config.py`)
  - [x] Standardized API JSON response & error formatting (`utils/errors.py`)
  - [x] Health check endpoint `GET /api/health` returning system and DB status
  - [x] Centralized service layer structure (`services/`)
  - [x] Server entrypoint (`app.py`) with port and host configuration
- [x] Build Frontend Foundation (React + TypeScript + Vite + Tailwind CSS):
  - [x] Initialize Vite React TypeScript project
  - [x] Configure Tailwind CSS and modern typography
  - [x] Setup React Router v6 with clean route structure
  - [x] Implement responsive `DashboardLayout`:
    - [x] Collapsible desktop sidebar with brand identity & navigation
    - [x] Mobile navigation drawer
    - [x] Student profile badge
    - [x] Live backend connectivity status indicator (green/amber/red)
    - [x] Top header with page title and stage badge
  - [x] Build initial `Dashboard` view:
    - [x] Welcome banner and platform intro
    - [x] Core feature cards with navigation actions
    - [x] 4-step 'Student Career Preparation Pipeline' workflow section
  - [x] Build authentic module views:
    - [x] `/resume-analyzer`
    - [x] `/skill-gap`
    - [x] `/interview-generator`
    - [x] `/study-planner`
    - [x] `/history`
    - [x] `/settings` (System diagnostics & profile controls)
    - [x] 404 Not Found fallback route
- [x] Quality & Verification:
  - [x] Verify backend `/api/health` responds with 200 OK and connected SQLite database
  - [x] Verify frontend builds (`npm run build`) with zero TypeScript/Vite errors
  - [x] Verify standalone compiler check (`tsc --noEmit`) passes with zero errors

---

### STAGE 2: Dashboard Refinement & AI Resume Analyzer
- [x] Implement resume file upload (PDF/DOCX/TXT) endpoint in Flask (`POST /api/resume/analyze`).
- [x] Implement document extraction service (`pypdf`, `python-docx`, plain text decode).
- [x] Integrate AI prompt service with `gemini-3.8-flash` via `@google/genai` SDK and offline ATS heuristic engine fallback.
- [x] Implement role benchmark keyword matching against target job descriptions.
- [x] Calculate ATS compatibility score (0-100), subscores, and Google X-Y-Z bullet rewrite suggestions (no fabricated numbers; explicit bracketed placeholders).
- [x] Render interactive diagnostic feedback UI on frontend (`/resume-analyzer`) with drag-and-drop, score bars, and copy actions.
- [x] Persist analyzed resumes in SQLite database (`resumes` table) and display history dynamically in `/history`.
- [x] Update Dashboard with active Resume Analyzer launchpad.

---

### STAGE 3: Skill Gap Analyzer
- [x] Create Stitch high-fidelity UI design (Approved Screen ID: `875aac01ece34c58b6bb2e0131701b46`).
- [x] Define standardized benchmark profiles for popular tech roles (Frontend, Backend, Fullstack, AI/ML, DevOps, Data Analyst).
- [x] Implement backend comparison logic between student skills and target role requirements with 3-state classification:
  - [x] Direct Match
  - [x] Related / Adjacent (never counted as direct match)
  - [x] Missing
- [x] Calculate skill match percentage and identify high-priority missing competencies with application-defined 65% core / 35% complementary weighting.
- [x] Exclude arbitrary time estimates (hours/days) from recommendations; focus on conceptual study direction and concrete project ideas.
- [x] Build interactive frontend UI (`/skill-gap`) with resume reuse, upload flow, match visualization, and recommended learning directions.
- [x] Connect skill gap results to SQLite database (`skill_evaluations` table) for historical tracking in `/history`.
- [x] Update Dashboard with active Skill Gap Analyzer launchpad.

---

### STAGE 4: AI Interview Question Generator
- [x] Create Stitch high-fidelity UI design (Approved Screen ID: `c72caa9bcc9b47d5926a21ce0eb0c36d`).
- [x] Build backend interview generation service (`InterviewService`) with dual-engine architecture:
  - [x] Gemini 3.8 Flash prompt synthesis with strict anti-hallucination guardrails
  - [x] Deterministic offline question bank (300+ curated questions across Technical, Coding, Architecture, Behavioral)
- [x] Multi-dimensional calibration parameters:
  - [x] Target Roles (6 standard benchmark engineering roles)
  - [x] Difficulty tuning (Beginner / Junior, Intermediate / Mid-Level, Advanced / Senior)
  - [x] Question Focus: Technical Fundamentals, Coding & Algorithms, System Design & Architecture, Behavioral & Project Experience, and Mixed / Balanced
  - [x] Interleaved distribution for Mixed / Balanced focus mode
  - [x] Exact question volume selection: 5, 10, 15, or 20 questions
- [x] Profile context integration:
  - [x] Skill Gap context (`skill_gap_id`): extracts missing skills and highlights them with `(Targeted Gap)` tags
  - [x] Resume context (`resume_id`): calibrates questions to verified resume skills
  - [x] No-context mode: fallback to pure role benchmarks
  - [x] Proactive client-side context validation preventing dead-end submissions
- [x] Actionable guidance framework:
  - [x] Key points to consider and talking points (no rigid single "correct answers")
  - [x] Structured discussion frameworks
- [x] Interactive UI features (`/interview-generator`):
  - [x] Category filter tabs (All, Technical, Coding, Architecture, Behavioral)
  - [x] Expandable talking points guidance
  - [x] One-click question copy to clipboard
  - [x] Local practice list bookmarking (`localStorage` persistence)
- [x] SQLite persistence (`interview_sessions` table) and full history integration in `/history`.
- [x] Update Dashboard Launchpad and Curriculum Roadmap.

---

### STAGE 5: AI Study Planner
- [x] Create Stitch high-fidelity UI design (Approved Screen ID: `1897c9bf2a464ed497a68f5e153edb6e`).
- [x] Design normalized database schema:
  - [x] `study_plans` master plan table with versioning and foreign keys
  - [x] `study_sessions` daily execution records with activity types and completion flags
  - [x] Idempotent SQLite migrations in `init_db.py`
- [x] Paced workload & scheduling mathematics:
  - [x] Daily study commitment strictly locked between **0.5 hours (30 min) and 6.0 hours/day** across frontend and backend
  - [x] Planning horizon presets strictly locked to **1, 2, 4, and 8 weeks**
  - [x] Daily session duration calculated strictly as `int(daily_hours * 60)` minutes
  - [x] Structured activity distribution cycle: Learn, Practice, Learn & Practice, Review & Quiz, Project Work, Rest & Buffer
  - [x] Rest day modes: `weekends_off` (5 study / 2 rest), `one_day_off` (6 study / 1 rest), and `daily` (7 study)
  - [x] Workload feasibility guard: rejects requests where `topics > available study days` with clear feedback
  - [x] Rest days excluded from study hours and completion metrics to prevent artificial progress inflation
- [x] Dual-engine curriculum generation:
  - [x] Gemini 3.8 Flash prompt synthesis with mathematically locked schedule skeleton
  - [x] Deterministic offline curriculum catalog covering 25+ software engineering and computer science domains
  - [x] Resource hints safety: zero external URL fabrication (conceptual study checklists only)
  - [x] Anti-hallucination rules: AI cannot alter durations, day counts, or invent test scores
- [x] Transactional versioned regeneration:
  - [x] Regenerating creates a new version (`version = parent.version + 1`, `parent_plan_id = parent.id`, `is_active = 1`)
  - [x] Parent plan is transactionally archived (`is_active = 0`) with historical sessions preserved
  - [x] Atomic rollback on error; previous active plan remains unchanged
- [x] Cross-module context integration (`GET /api/study-planner/context`):
  - [x] Skill Gap context: imports missing skills with `core_gap` priority in early weeks
  - [x] Interview context: targets interview weaknesses and difficulty levels
  - [x] Resume context: imports verified technical skills
  - [x] Custom mode: manual topic selection and custom topic addition
  - [x] Strict 404 rejection on nonexistent record IDs
- [x] Single-session atomic completion:
  - [x] `PATCH /api/study-planner/<plan_id>/sessions/<session_id>` endpoint
  - [x] Sets `is_completed` and `completed_at` timestamp
  - [x] Automatically recalculates parent plan completion percentage
- [x] High-fidelity React UI (`/study-planner`):
  - [x] Calibration setup panel with goal selector, context cards, topic chips, daily hours slider, and horizon cards
  - [x] 4-KPI summary bar: Planned Hours, Active Study Days, Completion Percentage, Target Date
  - [x] Today's Session Spotlight Card with completion toggle
  - [x] Collapsible multi-week roadmap with week-level progress bars and concept checklists
  - [x] Saved plans modal with version switching and progress indicators
- [x] Cross-application integration:
  - [x] Enabled in `Sidebar.tsx` (`isAvailable: true`, removed "Coming Soon")
  - [x] Activated in `Dashboard.tsx` (Milestone Step 4 Active, Core Module 4 Launchpad active, Pipeline Step 04 Active)
  - [x] Integrated into `History.tsx` with dedicated Study Plans tab, progress bars, and direct deep-links.

---

### WHOLE-PRODUCT INTEGRATION & PRODUCTION AUDIT
- [x] Read-only whole-product architecture & data-flow verification:
  - [x] Cross-module data flow verified: Resume Analyzer → Skill Gap Analyzer → Interview Generator → Study Planner
  - [x] SQLite database schema consistency verified (6 tables, composite indexes, foreign keys, 0 orphan records)
  - [x] Active API table audited (15 REST endpoints across Health, Resume, Skill Gap, Interview, Study Planner, History)
  - [x] AI service dependency audit: all 4 modules use `gemini-3.8-flash` with full offline deterministic fallbacks (quota-safe)
  - [x] Security audit: environment variable configuration, zero hardcoded keys, parameterized SQL, 5MB file upload enforcement
  - [x] Product trust & tone audit: zero occurrences of "Alex Chen", "AI Lab", "viva", "college project", or guaranteed job claims
- [x] Automated test execution:
  - [x] 6 test suites executed: `test_audit.py`, `test_interview.py`, `test_qc_stage4.py`, `test_study.py`, `test_qc_stage5.py`, `test_qc_final_stage5.py`
  - [x] 67 automated assertions (41 unit/QC tests + 26 audit checks) — **100% Passed (0 failures, 0 errors)**
  - [x] TypeScript compiler check (`tsc --noEmit`) — **0 errors**
  - [x] Vite production build (`npm run build`) — **Success (Exit code 0 in 8.14s)**
- [x] Catalog of audit items identified for Stage 6 hardening:
  - [x] DEF-01 (Medium): Unbound profile inputs in `Settings.tsx`
  - [x] DEF-02 (Low): Non-existent plan regeneration returns HTTP 400 instead of 404 in `study.py`
  - [x] DEF-03 (Low): Stale API version string and unused key in `config.py`
  - [x] DEF-04 (Informational): Obsolete `placeholders.py` blueprint registered in `backend/app/__init__.py`
  - [x] DEF-05 (Informational): Breadcrumb label in `StudyPlanner.tsx` displays `MODULE 04` instead of semantic title

---

### STAGE 6: Database/History, Error Handling & Whole-Product Hardening
- [x] Implement client-side `localStorage` persistence and "Save Profile" action in `frontend/src/pages/Settings.tsx` (DEF-01).
- [x] Align `backend/app/routes/study.py` `POST /api/study-planner/<plan_id>/regenerate` to return HTTP 404 on nonexistent plan IDs (DEF-02).
- [x] Update `API_VERSION` to `1.0.0-stage5` and remove unused `OPENAI_API_KEY` in `backend/app/config.py` (DEF-03).
- [x] Decommission empty `backend/app/routes/placeholders.py` blueprint and clean up registration in `backend/app/__init__.py` (DEF-04).
- [x] Align Study Planner breadcrumb label to `CAREER WORKFLOW / STUDY & REVISION PLANNER` in `frontend/src/pages/StudyPlanner.tsx` (DEF-05).
- [x] **Database Hardening & Remediation (Complete & Verified)**:
  - [x] Created verified timestamped physical backup `database/copilot.db.backup_20261101_161252` (2,973,696 bytes).
  - [x] Enabled SQLite foreign-key enforcement (`PRAGMA foreign_keys = ON;`) on every application connection in `backend/app/models/db.py`.
  - [x] Implemented dedicated `TestingConfig` in `backend/app/config.py` targeting isolated `database/copilot_test.db`.
  - [x] Aligned `InterviewService` default `user_id = None` and anonymous history retrieval matching other services.
  - [x] Remediated 243 orphan interview rows (`user_id = NULL`) and study plan row 35 (`resume_id = NULL`, `context_source = 'custom'`).
  - [x] Verified `PRAGMA foreign_key_check;` returns **0 violations** and `PRAGMA integrity_check;` returns **ok**.
  - [x] Created `backend/test_database_hardening.py` regression suite (7 tests) verifying complete test DB isolation and zero dev DB mutations.
- [x] **Phase 3 Real-World UI, End-to-End Workflow & Product Audit (Complete & Verified)**:
  - [x] Audited all 7 application views: Dashboard, Resume Analyzer, Skill Gap Analyzer, Interview Generator, Study Planner, History, Settings.
  - [x] Corrected Study Planner header badge from "Coming Soon" to "Active" in `DashboardLayout.tsx`.
  - [x] Enhanced Interview Generator deep-linking to support `?sessionId=...` from History records.
  - [x] Verified full cross-module user pipeline (`backend/test_e2e_user_workflow.py`): Resume -> Skill Gap -> Interview -> Study Plan -> Session Completion -> Versioned Regeneration -> History.
  - [x] Confirmed zero mutations to development database (`copilot.db`) during full regression test execution.
  - [x] Verified TypeScript (`tsc`) and production build (`npm run build`) with 0 errors.
- [x] **Phase 4: Local Run Verification, Release Documentation & Readiness Review (Complete & Verified)**:
  - [x] Reconciled test counting arithmetic: exactly 54 standard `unittest` test methods + 26 standalone audit assertions in `test_audit.py` = 80 total verification checks (100% passing).
  - [x] Authoritative `LOCAL_RUN_GUIDE.md` created with verified PowerShell startup commands, prerequisites, ports, reverse proxy mapping, secrets setup, and troubleshooting.
  - [x] Enhanced `.gitignore` to prevent any accidental commits of database backups (`database/*.backup*`, `database/*.bak`).
  - [x] Cleaned `.env.example` to accurately document current configuration without stale keys.
  - [x] Updated `backend/app.py` banner to reflect platform status.
  - [x] Verified dev DB zero-mutation proof: row counts unchanged before and after all test runs.
  - [x] Completed honest release-readiness assessment distinguishing local readiness from production blockers.
- [x] **Phase 5: Interactive UI Smoke Test & Targeted Stabilization (Complete & Verified)**:
  - [x] Network boundary assessment confirmed: in-sandbox TCP binding restricted (`WinError 10013`), browser automation tools not installed in environment.
  - [x] Performed comprehensive code, JSX, routing, and state transition audit across all 8 user journeys (Dashboard, Resume, Skill Gap, Interview, Study Planner, History, Settings, NotFound).
  - [x] Stabilized `Settings.tsx` technical database table fallback count (`?? 6` matching active schema).
  - [x] Standalone TypeScript type-check (`tsc --noEmit`): 0 errors.
  - [x] Production bundle build (`npm run build`): Success (0 errors, 9.93s).
  - [x] Master test runner (`backend/verify_all_final.py`): 80/80 checks passed (54 unittests + 26 audit checks).
  - [x] Development database (`copilot.db`) verified: 0 mutations, integrity `ok`, 0 foreign-key violations, row counts unchanged.
  - [x] Formulated detailed manual browser smoke-test checklist with exact URLs and verification criteria.
- [x] **Resume Persistence & History Usability Enhancements (Complete & Verified)**:
  - [x] Root cause resolved: Replaced transient local component state with global `ResumeContext` (`frontend/src/context/ResumeContext.tsx`) maintaining active resume and completed analysis across route changes.
  - [x] Refresh persistence: Stored active resume ID in `localStorage` (`copilot_active_resume_id`), retrieving full analysis payload from backend without caching large resume text.
  - [x] Backend endpoint `GET /api/resume/<id>` added in `backend/app/routes/resume.py` and `ResumeService.get_resume_by_id`.
  - [x] Backend endpoint `GET /api/skills/evaluation-by-resume/<id>` added in `backend/app/routes/skills.py` and `SkillService.get_evaluation_by_resume`.
  - [x] `SkillGap.tsx` automatically loads prior skill gap evaluations for the selected resume without re-triggering analysis or Gemini calls.
  - [x] `History.tsx` made interactive: each evaluated resume is clickable, displaying a full dashboard snapshot of the original evaluated metrics, skills, gaps, and bullet upgrades with explicit "Not available" labels for absent fields.
  - [x] Snapshot comparison mode added in `History.tsx`: side-by-side comparison of any two saved resume snapshots with score delta and skill set evolution.
  - [x] Added `backend/test_resume_persistence.py` (6 unit tests, 100% passing).
  - [x] Verified zero mutations to `database/copilot.db`; frontend TypeScript check 0 errors; Vite production build clean (13.95s).
- [x] **Phase 7: Authentication, Account Management & Multi-User Data Isolation (Complete & Verified)**:
  - [x] Schema migration: Added `password_hash TEXT`, `degree_program TEXT`, and `preferences_json TEXT DEFAULT '{}'` to `users` table via safe idempotent migrations in `schema.sql` and `init_db.py`.
  - [x] Secure server-side authentication: Configured Flask signed cookies with `SESSION_COOKIE_HTTPONLY = True`, `SESSION_COOKIE_SAMESITE = 'Lax'`, `SESSION_COOKIE_SECURE = False` (dev-friendly), and CORS `supports_credentials=True`. Zero passwords, tokens, or session secrets stored in `localStorage`.
  - [x] Backend service layer (`AuthService` in `auth_service.py`): Registration with scrypt/pbkdf2 password hashing, login verification, duplicate email rejection (HTTP 409), profile updates, password changes, preferences management, and data/account deletion.
  - [x] Auth utility helpers (`auth.py`): `@login_required` decorator, `get_current_user_id()`, and `get_current_user()`.
  - [x] REST endpoints (`routes/auth.py`): `/signup`, `/login`, `/logout`, `/me`, `/profile`, `/password`, `/preferences`, `/data`.
  - [x] Backend data isolation: Filtered Resumes, Skill Evaluations, Interview Practice Sets, Study Plans, and History queries by `user_id`. Authenticated users only see their own records. Legacy unauthenticated records (`user_id IS NULL`) preserved without cross-account leakage.
  - [x] Frontend authentication infrastructure: `AuthContext.tsx` managing user lifecycle, `ProtectedRoute.tsx` guarding authenticated views with redirect to `/login`.
  - [x] Dedicated authentication pages: `Login.tsx` (email, password, validation, clear error alerts) and `Signup.tsx` (full name, email, password, confirm password, college, program, role).
  - [x] Header profile dropdown: Real user initials avatar, user name & email, "View Profile" (`/settings?tab=profile`), "Settings" (`/settings`), Light/Dark Theme toggle with localStorage persistence, and "Log out" action.
  - [x] Redesigned `Settings.tsx`: 5 primary functional tabs (Profile, Appearance, Preferences, Account & Security, Data & Privacy) + secondary Diagnostics tab, removing system health from primary focus.
  - [x] Automated test suite: `backend/test_auth_and_isolation.py` (11 unit tests covering signup, duplicate 409, login, protected routes, isolation, password change, data wipe, account deletion, and dev DB protection).
  - [x] Master test runner (`backend/verify_all_final.py`): 10/10 test suites passed (71 unit tests + 26 audit checks = 97 total checks, 100% passing).
  - [x] Development database (`copilot.db`): 0 mutations, integrity `ok`, 0 foreign-key violations.
  - [x] Frontend build: TypeScript `tsc` and Vite production build passed in 8.25s with 0 errors.
- [x] **Phase 8: Public AI Academic & Career Copilot Landing Page (Complete & Verified)**:
  - [x] Dynamic root route architecture (`App.tsx` & `RootRouteHandler`): Visiting `/` while logged out renders the public `LandingPage`; visiting `/` while authenticated opens the dashboard within `DashboardLayout`.
  - [x] Route protection: All internal dashboard modules (`/resume-analyzer`, `/skill-gap`, `/interview-generator`, `/study-planner`, `/history`, `/settings`) remain strictly protected via `ProtectedRoute`.
  - [x] Public SaaS navigation header: Logo, brand mark, navigation anchors (`#features`, `#how-it-works`, `#progress`, `#modules`), and top-right **Log In** (`/login`) & **Sign Up** (`/signup`) action buttons.
  - [x] Hero section: High-impact headline, student readiness subtitle, primary CTA **Get Started** (`/signup`), secondary CTA **Explore Features** (`#features`), and trust indicators (zero plaintext passwords, isolated snapshots, dual-engine fallback, 65/35 mathematical weighting).
  - [x] Dashboard preview mockup: Floating product interface card demonstrating real ATS scoring (84%), Google X-Y-Z bullet rewrites, 3-state skill gap breakdown, study roadmap sessions, and snapshot comparison deltas.
  - [x] Core capabilities grid: Honest, grounded breakdown of all 5 implemented modules (AI Resume Analyzer, Skill Gap Analyzer, Interview Question Generator, AI Study Planner, History & Resume Comparison).
  - [x] 4-step student workflow timeline: 1. Analyze Your Resume &rarr; 2. Identify Skill Gaps &rarr; 3. Practice &amp; Plan Study &rarr; 4. Track Growth &amp; Compare.
  - [x] Progress & value section: Emphasizing semester-over-semester evolution, private isolated workspaces, and the side-by-side snapshot comparison engine.
  - [x] Final call to action: Closing card inviting students to create an account or sign in to an existing account.
  - [x] Semantic accessible footer: Platform links, module shortcuts, authentication links, and security indicators.
  - [x] Structural verification: 21/21 checks passing via `frontend/verify_landing_routes.js`.
  - [x] Frontend compilation: TypeScript `tsc` and Vite production build passed in 32.49s with 0 errors.
  - [x] Backend regression check: 10/10 test suites passing (97/97 tests/checks), zero mutations to development database.
- [ ] Implement unified cross-module export/report summary (e.g., student career readiness summary report).
- [ ] Add client-side network retry handlers and toast error messaging for API connectivity interruptions.

---

### STAGE 7: UI/UX Refinement, Responsive Design & Production Readiness
- [ ] Conduct comprehensive accessibility audit (WCAG 2.1 AA compliance, keyboard navigation focus rings, ARIA landmarks).
- [ ] Polish UI micro-interactions, loading skeletons, and empty state action triggers across all views.
- [ ] Prepare production telemetry, onboarding flows, and demonstration test fixtures.
- [ ] Package final release notes and production deployment documentation.

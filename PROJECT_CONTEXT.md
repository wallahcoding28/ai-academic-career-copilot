# PROJECT CONTEXT: AI Academic & Career Copilot
> **Persistent Knowledge Base & Guidelines for Developers and AI Agents**

---

## 1. Project Purpose
The **AI Academic & Career Copilot** is a focused, academic-grade web application engineered to solve a concrete problem faced by college computer science and engineering students: bridging the transition from coursework to career placement. 

Rather than promising omniscient career magic, the platform addresses four concrete, verifiable workflows:
1. **AI Resume Analysis**: Diagnostic parsing of student resumes against industry expectations, highlighting missing keywords, quantifying achievements, and checking formatting.
2. **Skill Gap Analysis**: Objective comparison between a student's present skills and industry benchmark roles (e.g., Full Stack Engineer, ML Engineer, DevOps), generating concrete learning priorities.
3. **AI Interview Question Generation**: Generation of role-targeted technical, behavioral, and architectural viva/interview questions with clear evaluation criteria.
4. **AI Study Planning**: Practical, workload-balanced revision schedules constructed around real exam dates, difficulty levels, and student availability.

---

## 2. Target Users
- **Primary:** Undergraduate and graduate CS/IT/Engineering students preparing for campus placements, technical internships, and semester examinations.
- **Secondary:** Academic evaluators, professors, and lab examiners evaluating software engineering design, API architectures, and explainable AI pipelines during project vivas.

---

## 3. Core Modules & Boundaries
| Module | Core Purpose | Future AI Role (Stages 2-5) | Non-Goals / Exclusions |
| :--- | :--- | :--- | :--- |
| **Resume Analyzer** | Structured resume audit | LLM semantic keyword extraction & section feedback | Will NOT write fake resumes or guarantee job placement |
| **Skill Gap Analysis** | Competency comparison | Mapping student tech stack against benchmark role requirements | Will NOT provide arbitrary ratings without factual criteria |
| **Interview Generator** | Role-based interview prep | Context-aware question synthesis with rubric criteria | Will NOT conduct audio-video deepfake mock interviews |
| **Study Planner** | Timetable generation | Task prioritization and workload distribution logic | Will NOT replace genuine academic study materials |

---

## 4. Current Development Stage
- **Current Stage:** **Phase 8 Complete (Public Landing Page & Dynamic Authentication Routing)**
- **Next Milestone:** **Production Telemetry, Onboarding Polish & Deployment Preparation**
- **Operational Boundaries & Capability Statement:**
  - **Public Landing Page & Dynamic Entrypoint:** Visiting `/` while logged out serves the public SaaS landing page with module previews, workflow timelines, and clear CTAs to `/login` and `/signup`. Visiting `/` while authenticated automatically renders the student dashboard.
  - **Multi-User Server-Side Authentication:** Secure registration and login via Flask signed sessions and HTTP-only cookies (`SESSION_COOKIE_HTTPONLY = True`, `SESSION_COOKIE_SAMESITE = 'Lax'`). Zero tokens, passwords, or session secrets stored in `localStorage`.
  - **Strict User Data Isolation:** Resumes, skill evaluations, interview sessions, and study schedules are strictly scoped by `user_id`. Authenticated accounts only see their own data; legacy unauthenticated records (`user_id IS NULL`) remain preserved and accessible only in anonymous mode without data leaks.
  - **Unverified Browser UI & Physical Devices:** Automated test suites pass (97/97: 71 unit tests + 26 audit assertions), TypeScript passes with 0 errors, and Vite builds cleanly in ~30s. Live browser interactions and physical device responsive rendering remain subject to manual smoke-testing.
  - **Offline Fallback Engines:** All 4 modules include deterministic offline fallback engines when a Gemini API key is omitted.
  - **Settings & User Control:** 5 dedicated functional tabs in Settings (Profile, Appearance, Preferences, Account & Security, Data & Privacy) + secondary Diagnostics tab. Includes password change, activity wipe, and permanent account deletion.
- **Scope of Completed Work (Phases 1 through 8):**
  - Complete project architecture across `frontend/`, `backend/`, and `database/`.
  - Comprehensive documentation suite (`README.md`, `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `TODO.md`, `LOCAL_RUN_GUIDE.md`, `.env.example`, `.gitignore`).
  - Production-grade frontend application using React 18, TypeScript, Vite 6, and Tailwind CSS.
  - Full-featured **AI Resume Analyzer** (Stage 2) with ATS scoring, file extraction (PDF/DOCX/TXT), and Google X-Y-Z formula bullet rewrites.
  - Full-featured **Skill Gap Analyzer** (Stage 3) with 6 industry benchmark profiles, 3-state competency matching, and 65/35 core/complementary weighting.
  - Full-featured **AI Interview Question Generator** (Stage 4) with 300+ offline questions, Gemini prompt synthesis, difficulty tuning, focus modes, and deep-linking.
  - Full-featured **AI Study Planner** (Stage 5) with daily hour constraints [0.5, 6.0], horizons [1, 2, 4, 8 weeks], atomic session completion, and transactional versioned regeneration.
  - **Database Hardening & Test Isolation (Stage 6 / Phase 2)**:
    - Physical backup verified; foreign keys enforced (`PRAGMA foreign_keys = ON;`) on all application connections.
    - Dedicated `TestingConfig` created, isolating tests to `copilot_test.db` with zero mutations to `copilot.db`.
    - Interview service aligned to unauthenticated single-user mode (`user_id = None`).
    - Database remediation applied: 0 foreign-key violations, integrity `ok`, all history preserved.
  - **Phase 3 & 4 Real-World Audit, Workflow & Local Run Readiness**:
    - Reconciled all test counts (54 unittest cases + 26 audit assertions = 80 total checks, 100% passing).
    - Fixed Study Planner header badge from 'Coming Soon' to 'Active'.
    - Fixed Interview Generator deep-linking to support `?sessionId=...` from History.
    - Verified full cross-module pipeline: Resume -> Skill Gap -> Interview -> Study Plan -> Session Completion -> History.
    - Published authoritative `LOCAL_RUN_GUIDE.md` with verified PowerShell startup commands.
    - Verified TypeScript (`tsc`) and production build (`npm run build`) with 0 errors.
  - **Phase 5 Interactive UI Smoke Test & Targeted Stabilization**:
    - Confirmed sandbox TCP restrictions (`WinError 10013`) and absence of browser automation packages.
    - Audited JSX, router state, and event bindings across all 8 user journeys (Dashboard, Resume, Skill Gap, Interview, Study Planner, History, Settings, NotFound).
    - Fixed table count fallback in `Settings.tsx` (`?? 6`).
    - Validated zero TypeScript compilation errors (`tsc --noEmit`) and clean Vite production build (`npm run build` in 9.93s).
    - Executed all 8 test suites via master runner (`backend/verify_all_final.py`): 80/80 passed, 0 mutations to dev DB.
    - Provided rigorous manual smoke test checklist for live browser validation.
  - **Resume Persistence & History Usability Enhancements**:
    - Global `ResumeContext` (`frontend/src/context/ResumeContext.tsx`) manages active resume and completed analysis across route changes.
    - Backend endpoints `GET /api/resume/<id>` and `GET /api/skills/evaluation-by-resume/<id>` support instant client restoration.
    - `SkillGap.tsx` automatically displays prior evaluations for selected resumes without re-running Gemini or analysis engines.
    - `History.tsx` enhanced with clickable resume records opening full dashboard-style historical snapshots and a side-by-side snapshot comparison mode.
    - Verified 86/86 total checks passed across 9 test suites; zero mutations to `database/copilot.db`.
---

## 5. Technology Decisions & Rationale
1. **Frontend: React + Vite + TypeScript + Tailwind CSS**
   - *Rationale:* Vite provides instant HMR and lightweight bundle sizes. TypeScript enforces clear contracts between UI components and backend API schemas. Tailwind CSS ensures a clean, cohesive, distraction-free aesthetic without cumbersome external UI component libraries.
2. **Backend: Python 3 + Flask**
   - *Rationale:* Python is the industry standard for AI/ML integration. Flask provides a clean, unopinionated framework with minimal boilerplate, making the codebase readily explainable during an academic viva. Flask Blueprints allow modular routing per feature.
3. **Database: SQLite 3**
   - *Rationale:* Zero external daemon dependency, completely portable as a single file, and built into the Python standard library. Ideal for local lab demonstrations, grading, and testing.
4. **AI Strategy: Modular Service Layer**
   - *Rationale:* Business logic resides in `backend/app/services/`. When LLM APIs (e.g., Google Gemini or OpenAI) are integrated in subsequent stages, they can be plugged into dedicated service methods without altering routes or controllers.

---

## 6. Design Principles
- **Clean & Academic:** Focused, distraction-free interface inspired by high-utility student productivity tools (e.g., Notion, Linear, GitHub).
- **No Sci-Fi / Crypto Tropes:** Strictly avoid glowing neon buttons, unnecessary animated particles, fake neural-network animations, and dark gradient overload.
- **Honest Communication:** If a feature is planned for a later stage, clearly state so in the UI. Never present dummy mock data as if it were authentic AI output.
- **Accessibility & Responsiveness:** Clean typography hierarchy, WCAG-compliant contrast ratios, and seamless mobile drawer / desktop sidebar transitions.

---

## 7. What Has Been Implemented & Verified (Stages 1 through 6)
- [x] **Project Foundation:** Full directory skeleton (`frontend/`, `backend/`, `database/`) with clean boundaries.
- [x] **Documentation Suite:** Comprehensive `README.md`, `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `TODO.md`, `LOCAL_RUN_GUIDE.md`, `.env.example`, `.gitignore`.
- [x] **Database Hardening:** SQLite schema definitions (`database/schema.sql`), safe re-runnable initialization script (`database/init_db.py`), 6 tables (`users`, `resumes`, `skill_evaluations`, `interview_sessions`, `study_plans`, `study_sessions`), foreign-key enforcement enabled, physical backup preserved, 0 FK violations, test database completely isolated.
- [x] **Backend Foundation:** Flask application factory (`create_app`), configuration (`config.py`), global error handlers, dual-engine AI architecture across all modules (Gemini 3.8 Flash + deterministic offline algorithms).
- [x] **Frontend Architecture:** React 18, Vite 6, TypeScript, and Tailwind CSS configured and compiling with zero errors. Production build verified (`tsc --noEmit` & `npm run build`).
- [x] **Cross-Module User Journey:** Resume -> Skill Gap -> Interview -> Study Planner -> Session Completion -> History.
- [x] **Comprehensive Test Verification:** 54 standard unittests + 26 standalone audit assertions = 80 total checks (100% passing).

---

## 8. What Has NOT Been Implemented Yet (Strictly Deferred to Production Roadmap)
- [ ] **Multi-user Authentication:** Student login sessions, password hashing, and user management (platform currently operates in single-user unauthenticated mode).
- [ ] **Cloud Containerization & Production Deployment:** Dockerfiles, CI/CD pipeline, and cloud deployment.
- [ ] **Direct Cloud Storage for Resumes:** S3/GCS blob storage for resume binaries (currently stored locally/in-database).

---

## 9. Important Decisions Made During Development
- **No Mock AI Data:** The team decided against displaying simulated or fake AI analysis results on the dashboard or module pages to avoid misleading students and evaluators. All modules include deterministic offline fallback engines when an external LLM API key is absent. Note: Offline fallbacks provide rule-based baseline outputs and do not offer the dynamic natural-language synthesis or nuanced semantic evaluation of the Gemini model.
- **Status Indicator in Shell:** A real-time ping to /api/health was implemented in the application layout so developers and evaluators can immediately confirm backend status during demonstrations.
- **Strict Staged Approach:** To maintain high code quality and clear viva explainability, each stage must be fully functioning and verified before subsequent stages are initiated.
- **Test Isolation:** Automated tests must never run against or mutate `database/copilot.db`. All tests target `database/copilot_test.db`.

---

## 10. INSTRUCTIONS FOR FUTURE AI AGENTS
Future AI coding agents modifying or extending this codebase **MUST ALWAYS** obey the following directives:

1. **Read PROJECT_CONTEXT.md before making major changes.** Understand the project boundaries, current milestone, and existing design decisions.
2. **Read ARCHITECTURE.md before modifying architecture.** Adhere to the established layer boundaries (Controller -> Service -> Data Access).
3. **Read TODO.md to understand current progress.** Only implement tasks allocated to the active stage. Do not jump ahead without explicit user instructions.
4. **Inspect existing code before creating new files.** Avoid duplicate implementations, conflicting CSS frameworks, or competing state managers.
5. **Do not rewrite working modules unnecessarily.** If a module works as specified, extend or refactor incrementally rather than wiping and replacing.
6. **Do not remove existing functionality without explicit instruction.** Maintain all existing working pages, routes, tests, and endpoints.
7. **Do not invent completed features.** Never mark a stage or feature as done unless it has been written, executed, and verified.
8. **Keep the project suitable for a college-level AI/ML project.** Maintain readable, self-documenting code that a student can comfortably explain to a professor during a viva examination.
9. **Keep documentation updated after significant changes.** When completing a stage or modifying an architectural pattern, update README.md, PROJECT_CONTEXT.md, ARCHITECTURE.md, and TODO.md accordingly.

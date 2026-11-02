# Local Run Guide: AI Academic & Career Copilot

This guide provides the exact, verified instructions for running the **AI Academic & Career Copilot** locally on Windows using PowerShell.

---

## 1. Prerequisites & Verified Toolchain

Ensure the following runtimes are installed on your workstation:

| Runtime / Tool | Verified Version | Purpose |
| :--- | :--- | :--- |
| **Python** | `3.11.x` (verified with `3.11.16`) | Backend Flask API, SQLite ORM, AI service layer |
| **Node.js** | `v18.x` or higher | Frontend React, TypeScript compiler, Vite bundling |
| **npm** | `v9.x` or higher | Frontend package manager |
| **SQLite** | `3.x` (bundled with Python) | Embedded relational database engine |

Verify installations in PowerShell:
```powershell
python --version
node --version
npm --version
```

---

## 2. Directory & Architecture Overview

The application runs as two coordinated local services:

| Component | Path | Default URL / Port | Technology Stack |
| :--- | :--- | :--- | :--- |
| **Backend API** | `./backend` | `http://127.0.0.1:5000` | Python 3.11, Flask 3.0, SQLite |
| **Frontend UI** | `./frontend` | `http://localhost:5173` | React 18, Vite 6, TypeScript, Tailwind |
| **Dev Database** | `./database/copilot.db` | Local File | SQLite 3 (`PRAGMA foreign_keys = ON`) |
| **Test Database** | `./database/copilot_test.db` | Local File | Isolated test database for test suites |

> **Vite Reverse Proxy:** The frontend Vite dev server automatically proxies all `/api/*` network requests to `http://127.0.0.1:5000`, eliminating cross-origin CORS barriers during local development.

---

## 3. Step-by-Step Local Startup (PowerShell)

Open **two separate Windows PowerShell terminals** at the project repository root.

---

### Terminal 1: Backend API Service

1. **Navigate to the backend directory:**
   ```powershell
   cd backend
   ```

2. **Activate the Python virtual environment:**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   *(If script execution is blocked on Windows, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

3. **Install / verify dependencies (first-time setup only):**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Initialize database tables (idempotent, safe to rerun):**
   ```powershell
   python ..\database\init_db.py
   ```
   *Expected output:*
   ```text
   [DB Init] Target database path: ...\database\copilot.db
   [DB Init] Success! Initialized tables: interview_sessions, resumes, skill_evaluations, study_plans, study_sessions, users
   ```

5. **Start the Flask backend server:**
   ```powershell
   python app.py
   ```
   *Expected successful startup banner:*
   ```text
   ==================================================
    AI Academic & Career Copilot API
    An Intelligent Student Success Platform
    Running at: http://127.0.0.1:5000
    Health check: http://127.0.0.1:5000/api/health
   ==================================================
   * Serving Flask app 'app'
   * Debug mode: on
   * Running on http://127.0.0.1:5000
   ```

---

### Terminal 2: Frontend Client Service

1. **Navigate to the frontend directory:**
   ```powershell
   cd frontend
   ```

2. **Install / verify node modules (first-time setup only):**
   ```powershell
   npm install
   ```

3. **Start the Vite development server:**
   ```powershell
   npm run dev
   ```
   *Expected successful startup banner:*
   ```text
     VITE v6.4.3  ready in 450 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: http://<ip>:5173/
     ➜  press h + enter to show help
   ```

4. **Access the application in your browser:**
   Open: [http://localhost:5173](http://localhost:5173)

---

## 4. Health Check Verification

Once both services are running, verify communication via browser or PowerShell:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -Method Get
```

**Expected JSON Response:**
```json
{
  "success": true,
  "message": "API service is active and responsive",
  "data": {
    "status": "healthy",
    "stage": "Stage 5: AI Study Planner & Platform Integration",
    "version": "1.0.0-stage5",
    "database": {
      "connected": true,
      "tables": [
        "interview_sessions",
        "resumes",
        "skill_evaluations",
        "study_plans",
        "study_sessions",
        "users"
      ]
    },
    "modules": {
      "resume_analyzer": "active_stage_2",
      "skill_gap_analyzer": "active_stage_3",
      "interview_generator": "active_stage_4",
      "study_planner": "active_stage_5",
      "history_archive": "active_stage_5"
    }
  }
}
```

In the UI, look at the sidebar bottom status badge: it should show **"API Ready"** with a pulsing green indicator and live latency (e.g., `4ms`).

---

## 5. Stopping the Servers

To stop either service safely:
- Press `Ctrl + C` in the respective PowerShell terminal.
- SQLite connections are closed cleanly on request teardown; no database daemon needs to be shut down.

---

## 6. Running Automated Tests

All automated tests use a dedicated, isolated test database (`database/copilot_test.db`) and **never touch or mutate** the development database (`database/copilot.db`).

From the project root:
```powershell
# Run the comprehensive master verification runner (10 suites, 97 assertions)
& ".\backend\.venv\Scripts\python.exe" backend/verify_all_final.py
```

To run individual unit test suites:
```powershell
# Authentication & User Data Isolation tests
& ".\backend\.venv\Scripts\python.exe" backend/test_auth_and_isolation.py

# Database Hardening & Test Isolation regression tests
& ".\backend\.venv\Scripts\python.exe" backend/test_database_hardening.py

# End-to-End User Pipeline & cross-module integration test
& ".\backend\.venv\Scripts\python.exe" backend/test_e2e_user_workflow.py

# Resume Persistence & State Restoration tests
& ".\backend\.venv\Scripts\python.exe" backend/test_resume_persistence.py

# Standalone Stage 3 Audit checks
& ".\backend\.venv\Scripts\python.exe" backend/test_audit.py
```

To verify the frontend TypeScript types and production build:
```powershell
cd frontend
npm run build
```

---

## 7. Configuring Secrets Safely

The application is engineered with a **dual-engine architecture**:
- **Offline Deterministic Fallbacks:** All 4 modules (Resume ATS heuristic, Skill Gap matrix, Interview question bank, Study curriculum planner) include deterministic offline fallback engines when a Gemini API key is not configured. Note: Offline fallbacks provide rule-based baseline outputs and do not offer the dynamic natural-language synthesis or nuanced semantic evaluation of the Gemini model.
- **Optional Google Gemini API Key:** If you wish to enable online LLM synthesis:
  1. Copy `.env.example` to `.env` in the project root:
     ```powershell
     Copy-Item .env.example .env
     ```
  2. Open `.env` and set your key:
     ```ini
     GEMINI_API_KEY=your_actual_gemini_api_key_here
     SECRET_KEY=generate_a_secure_random_string_for_sessions
     ```
  3. `.env` is registered in `.gitignore` and is strictly ignored by version control. Never commit `.env` or paste live keys into source files.

---

## 8. Database Architecture: Dev DB vs. Test DB

| Database | File Path | Usage & Lifecycle |
| :--- | :--- | :--- |
| **Development DB** | `database/copilot.db` | Persists user activity, uploaded resumes, skill evaluations, interview sessions, and study roadmaps across server restarts. Foreign keys are enforced (`PRAGMA foreign_keys = ON;`). |
| **Isolated Test DB** | `database/copilot_test.db` | Dedicated environment automatically selected when `create_app("testing")` or `FLASK_ENV=testing` is active. Seeds baseline fixtures and isolates test runs so development history is never mutated. |
| **Physical Backups** | `database/copilot.db.backup_*` | Verified physical backups created before any schema migrations or maintenance. Ignored by `.gitignore`. |

---

## 9. Troubleshooting & Common Local Issues

| Issue / Error | Root Cause | Solution |
| :--- | :--- | :--- |
| `Cannot be loaded because running scripts is disabled on this system` | Windows PowerShell execution policy restricts `.ps1` execution | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in the terminal session before running `Activate.ps1`. |
| `Address already in use: Port 5000` | Another process is holding port 5000 | Check running processes using `Get-NetTCPConnection -LocalPort 5000` and stop the conflicting PID, or start Flask with `$env:PORT=5001; python app.py`. |
| `Vite proxy error: ECONNREFUSED 127.0.0.1:5000` | Frontend started before backend was running | Start the Flask backend in Terminal 1 first, or wait until `http://127.0.0.1:5000` responds before sending requests. |
| `ModuleNotFoundError: No module named 'app'` | Python command run without `backend` on `PYTHONPATH` | Run Python commands from inside the `backend` folder, or use `python app.py` which automatically bootstraps `sys.path`. |
| `FOREIGN KEY constraint failed` on custom insert | Foreign key enforcement is active on all connections | Ensure referenced records (e.g. `resume_id` or `skill_gap_id`) exist in their respective tables before referencing them, or pass `NULL` in unauthenticated mode. |

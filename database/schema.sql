-- ==========================================================
-- AI Academic & Career Copilot: SQLite Database Schema
-- Stage 1 Foundation
-- ==========================================================

PRAGMA foreign_keys = ON;

-- 1. Users table (Student profile & authentication)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    target_role TEXT DEFAULT 'Full Stack Developer',
    college_name TEXT,
    degree_program TEXT,
    graduation_year INTEGER,
    preferences_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resumes table (Stage 2 storage)
CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT NOT NULL,
    file_size INTEGER,
    raw_text TEXT,
    extracted_skills TEXT, -- JSON array of strings
    feedback_json TEXT,    -- JSON structure of analysis
    score REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Skill Gap Evaluations table (Stage 3 storage)
CREATE TABLE IF NOT EXISTS skill_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    resume_id INTEGER,
    source_type TEXT DEFAULT 'resume_reuse', -- 'resume_reuse' | 'resume_upload'
    target_role TEXT NOT NULL,
    current_skills TEXT NOT NULL, -- JSON array of candidate skills
    matched_skills TEXT,         -- JSON array of direct matches
    adjacent_skills TEXT,        -- JSON array of { target_skill, candidate_skill, rationale }
    missing_skills TEXT,         -- JSON array of { name, tier, priority, category, impact }
    match_percentage REAL DEFAULT 0.0,
    core_coverage REAL DEFAULT 0.0,
    complementary_coverage REAL DEFAULT 0.0,
    analysis_mode TEXT DEFAULT 'deterministic_benchmark', -- 'gemini_ai' | 'deterministic_benchmark'
    recommendations_json TEXT,   -- JSON array of action items
    detailed_results_json TEXT,  -- Complete structured analysis payload
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

-- 4. Interview Sessions table (Stage 4 storage)
CREATE TABLE IF NOT EXISTS interview_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    target_role TEXT NOT NULL,
    difficulty TEXT NOT NULL,              -- 'Beginner', 'Intermediate', 'Advanced'
    question_focus TEXT DEFAULT 'Mixed / Balanced', -- 'Technical Fundamentals', 'Coding & Algorithms', etc.
    selected_skills TEXT DEFAULT '[]',     -- JSON array of selected topics
    question_count INTEGER DEFAULT 5,      -- 5, 10, 15, 20
    context_source TEXT DEFAULT 'none',    -- 'none', 'resume', 'skill_gap'
    resume_id INTEGER,                     -- Optional FK to resumes(id)
    skill_gap_id INTEGER,                  -- Optional FK to skill_evaluations(id)
    generation_mode TEXT DEFAULT 'deterministic_engine', -- 'gemini_ai' | 'deterministic_engine'
    categories_json TEXT,                  -- JSON array of categories
    questions_json TEXT NOT NULL,          -- JSON array of generated questions & rubrics
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
    FOREIGN KEY (skill_gap_id) REFERENCES skill_evaluations(id) ON DELETE SET NULL
);

-- 5. Study Plans table (Stage 5 storage - Normalized Master Plan)
CREATE TABLE IF NOT EXISTS study_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    parent_plan_id INTEGER,               -- FK to study_plans(id) for version lineage during regeneration
    version INTEGER DEFAULT 1,            -- Plan version number (1, 2, 3...)
    title TEXT NOT NULL,
    goal TEXT NOT NULL,                   -- 'Academic Subjects', 'Skill Development', 'Interview Preparation', 'Career Preparation', 'Mixed Goals'
    topics_json TEXT NOT NULL,            -- JSON array of selected topics/skills
    subjects_json TEXT,                   -- JSON array of subjects/topics
    target_date DATE,                     -- Planned target completion date
    start_date DATE,                      -- Planned start date
    schedule_json TEXT,                   -- Complete schedule JSON
    context_source TEXT DEFAULT 'custom', -- 'skill_gap', 'interview', 'resume', 'custom'
    skill_gap_id INTEGER,                 -- FK to skill_evaluations(id) ON DELETE SET NULL
    interview_session_id INTEGER,         -- FK to interview_sessions(id) ON DELETE SET NULL
    resume_id INTEGER,                    -- FK to resumes(id) ON DELETE SET NULL
    daily_hours REAL NOT NULL,            -- Standardized range: 0.5 to 6.0 hours/day
    horizon_weeks INTEGER NOT NULL,       -- 1, 2, 4, 8 weeks
    study_preferences_json TEXT,          -- JSON object: { pacing, rest_days_mode, include_revision }
    total_sessions INTEGER DEFAULT 0,
    total_hours REAL DEFAULT 0.0,
    completed_sessions INTEGER DEFAULT 0,
    generation_mode TEXT DEFAULT 'deterministic_engine', -- 'gemini_ai' | 'deterministic_engine'
    plan_summary_json TEXT,               -- High-level overview: milestones, weekly themes
    is_active INTEGER DEFAULT 1,          -- 1 = currently active, 0 = archived/superseded by regeneration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_plan_id) REFERENCES study_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (skill_gap_id) REFERENCES skill_evaluations(id) ON DELETE SET NULL,
    FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

-- 6. Study Sessions table (Stage 5 storage - Granular Daily Execution Records)
CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,             -- Strictly bound to a specific study_plan version
    week_number INTEGER NOT NULL,         -- 1, 2, 3, ...
    day_number INTEGER NOT NULL,          -- 1 to (horizon_weeks * 7)
    sequence_order INTEGER NOT NULL,      -- 1 to total_sessions
    topic TEXT NOT NULL,
    session_objective TEXT NOT NULL,
    activity_type TEXT NOT NULL,          -- 'Learn', 'Practice', 'Learn & Practice', 'Review & Quiz', 'Project Work', 'Rest'
    duration_minutes INTEGER NOT NULL,    -- Strictly calculated as int(daily_hours * 60)
    priority TEXT DEFAULT 'standard',     -- 'core_gap', 'high', 'standard', 'revision', 'buffer'
    resource_hints_json TEXT,             -- JSON array of key concepts / exercises / documentation references
    is_completed INTEGER DEFAULT 0,       -- 0 = pending, 1 = completed
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
);

-- Indexes for efficient queries in Stage 5 & 6 (History & Analytics)
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_eval_user_id ON skill_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_active ON study_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_study_plans_parent ON study_plans(parent_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_plan_id ON study_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_completed ON study_sessions(plan_id, is_completed);

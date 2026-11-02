"""
Database Initialization Script for AI Academic & Career Copilot
Stage 1: Foundation
"""

import os
import sqlite3
import sys

# Define base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "database")
SCHEMA_PATH = os.path.join(DB_DIR, "schema.sql")
DEFAULT_DB_PATH = os.path.join(DB_DIR, "copilot.db")


def init_database(db_path: str = None) -> bool:
    """
    Initializes the SQLite database with the tables defined in schema.sql.
    Returns True on success, False otherwise.
    """
    if db_path is None:
        db_path = os.getenv("DATABASE_PATH", DEFAULT_DB_PATH)

    # Ensure absolute path
    if not os.path.isabs(db_path):
        db_path = os.path.join(BASE_DIR, db_path)

    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    print(f"[DB Init] Target database path: {db_path}")

    if not os.path.exists(SCHEMA_PATH):
        print(f"[DB Init Error] Schema file not found at: {SCHEMA_PATH}", file=sys.stderr)
        return False

    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_sql = f.read()

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.executescript(schema_sql)
        conn.commit()

        # Idempotent migration for existing database: add any missing columns in users
        cursor.execute("PRAGMA table_info(users);")
        existing_user_cols = {col[1] for col in cursor.fetchall()}

        user_column_defs = [
            ("password_hash", "TEXT"),
            ("degree_program", "TEXT"),
            ("preferences_json", "TEXT DEFAULT '{}'"),
        ]

        for col_name, col_def in user_column_defs:
            if col_name not in existing_user_cols:
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def};")
                except Exception as ex:
                    print(f"[DB Init Note] Migration for users.{col_name}: {ex}")

        # Idempotent migration for existing database: add any missing columns in skill_evaluations
        cursor.execute("PRAGMA table_info(skill_evaluations);")
        existing_cols = {col[1] for col in cursor.fetchall()}
        
        column_defs = [
            ("resume_id", "INTEGER REFERENCES resumes(id) ON DELETE SET NULL"),
            ("source_type", "TEXT DEFAULT 'resume_reuse'"),
            ("adjacent_skills", "TEXT"),
            ("core_coverage", "REAL DEFAULT 0.0"),
            ("complementary_coverage", "REAL DEFAULT 0.0"),
            ("analysis_mode", "TEXT DEFAULT 'deterministic_benchmark'"),
            ("detailed_results_json", "TEXT"),
        ]
        
        for col_name, col_def in column_defs:
            if col_name not in existing_cols:
                try:
                    cursor.execute(f"ALTER TABLE skill_evaluations ADD COLUMN {col_name} {col_def};")
                except Exception as ex:
                    print(f"[DB Init Note] Migration for {col_name}: {ex}")

        # Idempotent migration for existing database: add missing columns in interview_sessions
        cursor.execute("PRAGMA table_info(interview_sessions);")
        existing_interview_cols = {col[1] for col in cursor.fetchall()}

        interview_column_defs = [
            ("question_focus", "TEXT DEFAULT 'Mixed / Balanced'"),
            ("selected_skills", "TEXT DEFAULT '[]'"),
            ("question_count", "INTEGER DEFAULT 5"),
            ("context_source", "TEXT DEFAULT 'none'"),
            ("resume_id", "INTEGER REFERENCES resumes(id) ON DELETE SET NULL"),
            ("skill_gap_id", "INTEGER REFERENCES skill_evaluations(id) ON DELETE SET NULL"),
            ("generation_mode", "TEXT DEFAULT 'deterministic_engine'"),
        ]

        for col_name, col_def in interview_column_defs:
            if col_name not in existing_interview_cols:
                try:
                    cursor.execute(f"ALTER TABLE interview_sessions ADD COLUMN {col_name} {col_def};")
                except Exception as ex:
                    print(f"[DB Init Note] Migration for interview_sessions.{col_name}: {ex}")

        # Idempotent migration for existing database: add missing columns in study_plans
        cursor.execute("PRAGMA table_info(study_plans);")
        existing_plan_cols = {col[1] for col in cursor.fetchall()}

        plan_column_defs = [
            ("parent_plan_id", "INTEGER REFERENCES study_plans(id) ON DELETE SET NULL"),
            ("version", "INTEGER DEFAULT 1"),
            ("goal", "TEXT DEFAULT 'Mixed Goals'"),
            ("topics_json", "TEXT DEFAULT '[]'"),
            ("subjects_json", "TEXT"),
            ("target_date", "DATE"),
            ("start_date", "DATE"),
            ("schedule_json", "TEXT"),
            ("context_source", "TEXT DEFAULT 'custom'"),
            ("skill_gap_id", "INTEGER REFERENCES skill_evaluations(id) ON DELETE SET NULL"),
            ("interview_session_id", "INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL"),
            ("resume_id", "INTEGER REFERENCES resumes(id) ON DELETE SET NULL"),
            ("daily_hours", "REAL DEFAULT 1.5"),
            ("horizon_weeks", "INTEGER DEFAULT 4"),
            ("study_preferences_json", "TEXT"),
            ("total_sessions", "INTEGER DEFAULT 0"),
            ("total_hours", "REAL DEFAULT 0.0"),
            ("completed_sessions", "INTEGER DEFAULT 0"),
            ("generation_mode", "TEXT DEFAULT 'deterministic_engine'"),
            ("plan_summary_json", "TEXT"),
            ("is_active", "INTEGER DEFAULT 1"),
            ("updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ]

        for col_name, col_def in plan_column_defs:
            if col_name not in existing_plan_cols:
                try:
                    cursor.execute(f"ALTER TABLE study_plans ADD COLUMN {col_name} {col_def};")
                except Exception as ex:
                    print(f"[DB Init Note] Migration for study_plans.{col_name}: {ex}")

        # Ensure study_sessions table exists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id INTEGER NOT NULL,
            week_number INTEGER NOT NULL,
            day_number INTEGER NOT NULL,
            sequence_order INTEGER NOT NULL,
            topic TEXT NOT NULL,
            session_objective TEXT NOT NULL,
            activity_type TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            priority TEXT DEFAULT 'standard',
            resource_hints_json TEXT,
            is_completed INTEGER DEFAULT 0,
            completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
        );
        """)

        # Ensure indexes exist
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_plans_active ON study_plans(is_active);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_plans_parent ON study_plans(parent_plan_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_sessions_plan_id ON study_sessions(plan_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_study_sessions_completed ON study_sessions(plan_id, is_completed);")

        conn.commit()

        # Query created tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = [row[0] for row in cursor.fetchall() if not row[0].startswith("sqlite_")]
        conn.close()

        print(f"[DB Init] Success! Initialized tables: {', '.join(tables)}")
        return True

    except Exception as e:
        print(f"[DB Init Error] Failed to initialize database: {e}", file=sys.stderr)
        return False


def init_test_database(db_path: str = None) -> bool:
    """
    Initializes an isolated test database with application schema
    and inserts baseline test fixtures (e.g. resume fixture ID 1) if not present.
    """
    if db_path is None:
        db_path = os.getenv("TEST_DATABASE_PATH", os.path.join(DB_DIR, "copilot_test.db"))

    success = init_database(db_path)
    if not success:
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM resumes WHERE id = 1;")
        if not cursor.fetchone():
            cursor.execute(
                """
                INSERT INTO resumes (id, user_id, filename, file_size, raw_text, extracted_skills, feedback_json, score, created_at)
                VALUES (1, NULL, 'john_doe_resume.txt', 339, ?, ?, ?, 59.0, '2026-09-17 06:23:01');
                """,
                (
                    "John Doe\nComputer Science Student at State University\nSkills: Python, JavaScript, React, Node.js, SQL, HTML, CSS, Git\nProjects: Built full stack web application...",
                    '["JavaScript", "React", "Node.js", "Python", "SQL", "HTML", "CSS", "Git"]',
                    '{"score": 59, "summary": "Candidate demonstrates foundational technical competencies.", "subscores": {"formatting": 70, "skills": 60, "content_impact": 50}, "strengths": ["Strong foundational programming languages"], "improvements": ["Quantify impact on project achievements"]}'
                )
            )
            conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"[Test DB Init Error] Failed to seed test database: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)

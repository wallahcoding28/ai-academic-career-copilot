"""
Database Cleanup Remediation Script for AI Academic & Career Copilot
Safe, transactional remediation of invalid foreign keys:
1. Updates 243 interview_sessions rows with user_id = 1 to user_id = NULL
2. Updates study_plans row ID 35 with resume_id = 999999 to resume_id = NULL, context_source = 'custom'
3. Verifies PRAGMA foreign_key_check returns 0 violations
4. Verifies PRAGMA integrity_check returns 'ok'
5. Verifies all table row counts are preserved
"""

import os
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "copilot.db")

def run_remediation():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found at {DB_PATH}", file=sys.stderr)
        return False

    conn = sqlite3.connect(DB_PATH)
    conn.isolation_level = None  # Explicit transaction control
    c = conn.cursor()

    c.execute("BEGIN TRANSACTION;")
    try:
        # Pre-check row counts
        c.execute("SELECT count(*) FROM interview_sessions WHERE user_id = 1;")
        orphan_interviews = c.fetchone()[0]
        if orphan_interviews != 243:
            raise ValueError(f"Expected 243 orphan interviews, found {orphan_interviews}")

        c.execute("SELECT count(*) FROM study_plans WHERE id = 35 AND resume_id = 999999;")
        orphan_plans = c.fetchone()[0]
        if orphan_plans != 1:
            raise ValueError(f"Expected 1 orphan study plan (ID 35), found {orphan_plans}")

        # 1. Remediate interview_sessions
        c.execute("UPDATE interview_sessions SET user_id = NULL WHERE user_id = 1;")
        updated_interviews = c.rowcount
        if updated_interviews != 243:
            raise ValueError(f"Expected 243 interview updates, but got {updated_interviews}")

        # 2. Remediate study_plans ID 35
        c.execute("UPDATE study_plans SET resume_id = NULL, context_source = 'custom' WHERE id = 35 AND resume_id = 999999;")
        updated_plans = c.rowcount
        if updated_plans != 1:
            raise ValueError(f"Expected 1 study plan update, but got {updated_plans}")

        # 3. Check foreign keys
        c.execute("PRAGMA foreign_key_check;")
        violations = c.fetchall()
        if violations:
            raise ValueError(f"Foreign key violations remaining: {violations}")

        # 4. Check integrity
        c.execute("PRAGMA integrity_check;")
        integrity = c.fetchone()[0]
        if integrity != "ok":
            raise ValueError(f"Integrity check failed: {integrity}")

        # 5. Check row counts
        tables = ["users", "resumes", "skill_evaluations", "interview_sessions", "study_plans", "study_sessions"]
        counts = {}
        for table in tables:
            c.execute(f"SELECT count(*) FROM {table};")
            counts[table] = c.fetchone()[0]

        expected = {
            "users": 0,
            "resumes": 27,
            "skill_evaluations": 50,
            "interview_sessions": 243,
            "study_plans": 175,
            "study_sessions": 2401,
        }
        if counts != expected:
            raise ValueError(f"Row count mismatch: got {counts}, expected {expected}")

        c.execute("COMMIT;")
        print("REMEDIATION_SUCCESS")
        print(f"Updated interview_sessions: {updated_interviews}")
        print(f"Updated study_plans: {updated_plans}")
        print(f"Integrity check: {integrity}")
        print(f"FK violations: {len(violations)}")
        print(f"Row counts: {counts}")
        return True

    except Exception as e:
        c.execute("ROLLBACK;")
        print(f"REMEDIATION_FAILED: {e}", file=sys.stderr)
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = run_remediation()
    sys.exit(0 if success else 1)


"""
Database Hardening, Foreign-Key Enforcement, and Test Isolation Regression Suite
Verifies:
1. create_app("testing") selects TestingConfig and isolated test database
2. PRAGMA foreign_keys = 1 is active on all application connections
3. Interview generation succeeds with empty users table and records user_id = NULL
4. Interview history returns anonymous sessions correctly
5. Invalid resume and context IDs return 404 without inserting orphaned records
6. Test executions do NOT alter the development database (database/copilot.db)
7. Repeated test runs do not accumulate records in development database
8. End-to-end relational integrity (Resume -> Skill Gap -> Interview -> Study Planner)
"""

import os
import sqlite3
import sys
import unittest
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.config import BASE_DIR, DevelopmentConfig, TestingConfig
from app.models.db import get_db


class DatabaseHardeningTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dev_db_path = str(BASE_DIR / "database" / "copilot.db")
        cls.test_db_path = str(BASE_DIR / "database" / "copilot_test.db")

        # Snapshot dev database row counts
        cls.dev_row_counts_initial = cls._get_dev_db_counts()

        cls.app = create_app("testing")
        cls.client = cls.app.test_client()

        # Ensure test database starts clean for hardening assertions
        with cls.app.app_context():
            db = get_db()
            c = db.cursor()
            c.execute("DELETE FROM study_sessions;")
            c.execute("DELETE FROM study_plans;")
            c.execute("DELETE FROM interview_sessions;")
            c.execute("DELETE FROM skill_evaluations;")
            c.execute("DELETE FROM resumes;")
            c.execute("DELETE FROM users;")
            c.execute(
                """
                INSERT INTO resumes (id, user_id, filename, file_size, raw_text, extracted_skills, score, feedback_json)
                VALUES (1, NULL, 'sample_resume.pdf', 1024, 'Python React Node SQL', '["Python", "React"]', 80, '{}');
                """
            )
            db.commit()

    @classmethod
    def _get_dev_db_counts(cls):
        if not os.path.exists(cls.dev_db_path):
            return {}
        conn = sqlite3.connect(cls.dev_db_path)
        c = conn.cursor()
        tables = ["users", "resumes", "skill_evaluations", "interview_sessions", "study_plans", "study_sessions"]
        counts = {}
        for t in tables:
            c.execute(f"SELECT count(*) FROM {t};")
            counts[t] = c.fetchone()[0]
        conn.close()
        return counts

    def test_01_create_app_selects_testing_config(self):
        """create_app('testing') must load TestingConfig and use isolated test database."""
        self.assertTrue(self.app.config["TESTING"])
        self.assertEqual(
            os.path.abspath(self.app.config["DATABASE_PATH"]),
            os.path.abspath(self.test_db_path)
        )
        self.assertNotEqual(
            os.path.abspath(self.app.config["DATABASE_PATH"]),
            os.path.abspath(self.dev_db_path)
        )

    def test_02_foreign_keys_enforced_on_connection(self):
        """Every application connection must execute PRAGMA foreign_keys = ON;"""
        with self.app.app_context():
            db = get_db()
            cursor = db.cursor()
            cursor.execute("PRAGMA foreign_keys;")
            fk_status = cursor.fetchone()[0]
            self.assertEqual(fk_status, 1, "PRAGMA foreign_keys must be 1 on application connection")

            # Verify that inserting invalid user_id into interview_sessions is blocked by FK constraint
            with self.assertRaises(sqlite3.IntegrityError):
                cursor.execute(
                    """
                    INSERT INTO interview_sessions (
                        user_id, target_role, difficulty, question_focus,
                        selected_skills, question_count, context_source,
                        generation_mode, questions_json
                    ) VALUES (999999, 'Full Stack Developer', 'Beginner', 'Mixed / Balanced', '[]', 5, 'none', 'deterministic_engine', '[]');
                    """
                )

    def test_03_interview_generation_empty_users_null_user_id(self):
        """Interview generation succeeds when users is empty, saving user_id as NULL."""
        with self.app.app_context():
            db = get_db()
            c = db.cursor()
            c.execute("SELECT count(*) FROM users;")
            self.assertEqual(c.fetchone()[0], 0, "Users table in test DB should be empty")

        payload = {
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "selected_skills": ["React", "Node.js"],
            "question_count": 5,
            "context_source": "none",
        }
        res = self.client.post("/api/interview/generate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        session_id = data["data"]["id"]

        with self.app.app_context():
            db = get_db()
            c = db.cursor()
            c.execute("SELECT user_id, target_role FROM interview_sessions WHERE id = ?;", (session_id,))
            row = c.fetchone()
            self.assertIsNotNone(row)
            self.assertIsNone(row["user_id"], "New interview session must have user_id = NULL in unauthenticated mode")

    def test_04_interview_history_returns_anonymous_sessions(self):
        """get_interview_history returns anonymous sessions without requiring user_id = 1."""
        res = self.client.get("/api/interview/history")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        history = data["data"]
        self.assertTrue(len(history) >= 1)
        # Verify all retrieved sessions are valid
        for s in history:
            self.assertIn("target_role", s)
            self.assertIn("questions", s)

    def test_05_invalid_context_ids_rejected_without_inserting_records(self):
        """Nonexistent context IDs return 404 and do not insert invalid records."""
        with self.app.app_context():
            db = get_db()
            c = db.cursor()
            c.execute("SELECT count(*) FROM interview_sessions;")
            initial_interviews = c.fetchone()[0]
            c.execute("SELECT count(*) FROM study_plans;")
            initial_plans = c.fetchone()[0]

        # 1. Invalid resume_id on interview generation
        res = self.client.post("/api/interview/generate", json={
            "target_role": "Full Stack Developer",
            "context_source": "resume",
            "resume_id": 999999,
        })
        self.assertEqual(res.status_code, 404)

        # 2. Invalid skill_gap_id on interview generation
        res = self.client.post("/api/interview/generate", json={
            "target_role": "Full Stack Developer",
            "context_source": "skill_gap",
            "skill_gap_id": 999999,
        })
        self.assertEqual(res.status_code, 404)

        # 3. Invalid resume_id on study plan generation
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Interview Preparation",
            "topics": ["Python"],
            "daily_hours": 1.5,
            "horizon_weeks": 2,
            "context_source": "resume",
            "resume_id": 999999,
        })
        self.assertEqual(res.status_code, 404)

        # 4. Invalid skill_gap_id on study plan generation
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Skill Development",
            "topics": ["Python"],
            "daily_hours": 1.5,
            "horizon_weeks": 2,
            "context_source": "skill_gap",
            "skill_gap_id": 999999,
        })
        self.assertEqual(res.status_code, 404)

        # 5. Invalid interview_session_id on study plan generation
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Interview Preparation",
            "topics": ["Python"],
            "daily_hours": 1.5,
            "horizon_weeks": 2,
            "context_source": "interview",
            "interview_session_id": 999999,
        })
        self.assertEqual(res.status_code, 404)

        # Verify no records were inserted during failed attempts
        with self.app.app_context():
            db = get_db()
            c = db.cursor()
            c.execute("SELECT count(*) FROM interview_sessions;")
            self.assertEqual(c.fetchone()[0], initial_interviews)
            c.execute("SELECT count(*) FROM study_plans;")
            self.assertEqual(c.fetchone()[0], initial_plans)

            # Ensure zero FK violations
            c.execute("PRAGMA foreign_key_check;")
            self.assertEqual(len(c.fetchall()), 0)

    def test_06_e2e_relational_pipeline_integrity(self):
        """Existing valid Resume -> Skill Gap -> Interview -> Study Planner relationships link correctly."""
        # Step 1: Baseline resume ID 1 exists
        with self.app.app_context():
            db = get_db()
            c = db.cursor()
            c.execute("SELECT id FROM resumes WHERE id = 1;")
            self.assertIsNotNone(c.fetchone())

        # Step 2: Skill evaluation linked to resume 1
        eval_res = self.client.post("/api/skills/evaluate", json={
            "resume_id": 1,
            "target_role": "Full Stack Developer",
        })
        self.assertEqual(eval_res.status_code, 200)
        skill_gap_id = eval_res.get_json()["data"]["id"]

        # Step 3: Interview session linked to skill_gap_id
        interview_res = self.client.post("/api/interview/generate", json={
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "skill_gap",
            "skill_gap_id": skill_gap_id,
        })
        self.assertEqual(interview_res.status_code, 200)
        interview_id = interview_res.get_json()["data"]["id"]

        # Step 4: Study plan linked to interview_id
        study_res = self.client.post("/api/study-planner/generate", json={
            "goal": "Interview Preparation",
            "topics": ["React & State Management", "Node.js & Event Loop"],
            "daily_hours": 1.5,
            "horizon_weeks": 2,
            "context_source": "interview",
            "interview_session_id": interview_id,
        })
        self.assertIn(study_res.status_code, [200, 201])
        plan_id = study_res.get_json()["data"]["id"]

        # Step 5: Verify foreign keys and zero violations in test database
        with self.app.app_context():
            db = get_db()
            c = db.cursor()
            c.execute("SELECT resume_id FROM skill_evaluations WHERE id = ?;", (skill_gap_id,))
            self.assertEqual(c.fetchone()[0], 1)

            c.execute("SELECT skill_gap_id, user_id FROM interview_sessions WHERE id = ?;", (interview_id,))
            row = c.fetchone()
            self.assertEqual(row["skill_gap_id"], skill_gap_id)
            self.assertIsNone(row["user_id"])

            c.execute("SELECT interview_session_id, user_id FROM study_plans WHERE id = ?;", (plan_id,))
            row = c.fetchone()
            self.assertEqual(row["interview_session_id"], interview_id)
            self.assertIsNone(row["user_id"])

            c.execute("PRAGMA foreign_key_check;")
            violations = c.fetchall()
            self.assertEqual(len(violations), 0, f"FK violations in test DB: {violations}")

    def test_07_development_database_completely_unaltered_by_tests(self):
        """Running tests must never modify the development database (database/copilot.db)."""
        current_dev_counts = self._get_dev_db_counts()
        self.assertEqual(
            current_dev_counts,
            self.dev_row_counts_initial,
            f"Development database was mutated during tests! Before: {self.dev_row_counts_initial}, After: {current_dev_counts}"
        )

        # Also verify dev db has zero FK violations and ok integrity
        conn = sqlite3.connect(self.dev_db_path)
        c = conn.cursor()
        c.execute("PRAGMA foreign_key_check;")
        dev_fk = c.fetchall()
        self.assertEqual(len(dev_fk), 0, f"Development DB has FK violations: {dev_fk}")
        c.execute("PRAGMA integrity_check;")
        self.assertEqual(c.fetchone()[0], "ok")
        conn.close()


if __name__ == "__main__":
    unittest.main()

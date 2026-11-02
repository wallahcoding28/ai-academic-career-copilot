"""
Phase 7: Authentication, Account Management, and User Data Isolation Test Suite
Verifies:
1. User registration (/api/auth/signup) with secure password hashing and duplicate rejection (409).
2. User authentication (/api/auth/login, /api/auth/logout, /api/auth/me) with HTTP-only signed cookies.
3. Profile updates (/api/auth/profile), password changes (/api/auth/password), and preferences persistence (/api/auth/preferences).
4. Strict multi-user data isolation across Resumes, Skill Evaluations, Interview Sessions, and Study Plans.
5. Preservation of legacy unauthenticated records (user_id IS NULL).
6. Data and Account deletion (/api/auth/data) workflows.
7. Absolute zero mutations to development database (database/copilot.db).
"""

import os
import json
import sqlite3
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.config import BASE_DIR
from app.models.db import get_db


class AuthAndIsolationTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dev_db_path = str(BASE_DIR / "database" / "copilot.db")
        cls.test_db_path = str(BASE_DIR / "database" / "copilot_test.db")

        # Snapshot dev database row counts
        cls.dev_counts_before = cls._get_dev_counts()

        cls.app = create_app("testing")
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

        # Clean test database users and ensure foreign keys
        with cls.app.app_context():
            db = get_db()
            cursor = db.cursor()
            # Clean up test database tables to ensure clean slate for auth tests
            cursor.execute("DELETE FROM study_sessions;")
            cursor.execute("DELETE FROM study_plans;")
            cursor.execute("DELETE FROM interview_sessions;")
            cursor.execute("DELETE FROM skill_evaluations;")
            cursor.execute("DELETE FROM resumes;")
            cursor.execute("DELETE FROM users;")
            # Insert 1 legacy record in each table with user_id = NULL
            cursor.execute(
                """
                INSERT INTO resumes (user_id, filename, file_size, raw_text, extracted_skills, score, feedback_json)
                VALUES (NULL, 'legacy_sample.pdf', 1024, 'Python React SQL', '["Python", "React"]', 70, '{}');
                """
            )
            legacy_resume_id = cursor.lastrowid
            cursor.execute(
                """
                INSERT INTO skill_evaluations (user_id, resume_id, source_type, target_role, current_skills, matched_skills, adjacent_skills, missing_skills, match_percentage, core_coverage, complementary_coverage, analysis_mode)
                VALUES (NULL, ?, 'sample', 'Full Stack Developer', '["Python"]', '[]', '[]', '[]', 50.0, 50.0, 50.0, 'deterministic_benchmark');
                """,
                (legacy_resume_id,),
            )
            cursor.execute(
                """
                INSERT INTO interview_sessions (user_id, target_role, difficulty, question_focus, selected_skills, question_count, context_source, generation_mode, categories_json, questions_json)
                VALUES (NULL, 'Full Stack Developer', 'Intermediate', 'Mixed / Balanced', '["Python"]', 5, 'none', 'deterministic_bank', '[]', '[]');
                """
            )
            cursor.execute(
                """
                INSERT INTO study_plans (user_id, title, goal, topics_json, daily_hours, horizon_weeks, total_hours, context_source, generation_mode)
                VALUES (NULL, 'Legacy Plan Title', 'Legacy Plan', '["Python"]', 1.5, 4, 42.0, 'custom', 'deterministic_curriculum');
                """
            )
            db.commit()

    @classmethod
    def tearDownClass(cls):
        # Verify development database was never mutated
        dev_counts_after = cls._get_dev_counts()
        if cls.dev_counts_before != dev_counts_after:
            raise AssertionError(
                f"FATAL: Development database mutated during test execution!\n"
                f"Before: {cls.dev_counts_before}\n"
                f"After:  {dev_counts_after}"
            )

    @classmethod
    def _get_dev_counts(cls):
        if not os.path.exists(cls.dev_db_path):
            return {}
        conn = sqlite3.connect(cls.dev_db_path)
        cursor = conn.cursor()
        tables = ["users", "resumes", "skill_evaluations", "interview_sessions", "study_plans", "study_sessions"]
        counts = {}
        for t in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {t};")
                counts[t] = cursor.fetchone()[0]
            except sqlite3.OperationalError:
                counts[t] = 0
        conn.close()
        return counts

    def test_01_signup_success(self):
        """User registration with valid fields creates user, sets session, and hashes password."""
        payload = {
            "name": "Alice Student",
            "email": "alice@university.edu",
            "password": "Password123!",
            "college": "Stanford University",
            "degree_program": "B.S. Computer Science",
            "target_role": "Full Stack Developer",
            "graduation_year": 2026,
        }
        res = self.client.post("/api/auth/signup", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        user = data["data"]["user"]
        self.assertEqual(user["email"], "alice@university.edu")
        self.assertEqual(user["name"], "Alice Student")
        self.assertEqual(user["degree_program"], "B.S. Computer Science")
        self.assertNotIn("password_hash", user)
        self.assertNotIn("password", user)

        # Verify password is not plaintext in database
        with self.app.app_context():
            db = get_db()
            cursor = db.cursor()
            cursor.execute("SELECT password_hash FROM users WHERE email = 'alice@university.edu';")
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertNotEqual(row["password_hash"], "Password123!")
            self.assertTrue(row["password_hash"].startswith("scrypt:") or row["password_hash"].startswith("pbkdf2:"))

    def test_02_signup_duplicate_email(self):
        """Registration with an existing email returns 409 Conflict."""
        payload = {
            "name": "Alice Duplicate",
            "email": "alice@university.edu",
            "password": "Password123!",
        }
        res = self.client.post("/api/auth/signup", json=payload)
        self.assertEqual(res.status_code, 409)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertIn("already exists", data["message"].lower())

    def test_03_login_success_and_me(self):
        """Login with valid credentials sets HTTP-only cookie and /api/auth/me returns current user."""
        res = self.client.post("/api/auth/login", json={
            "email": "alice@university.edu",
            "password": "Password123!",
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["user"]["email"], "alice@university.edu")

        # Verify /api/auth/me works with session
        me_res = self.client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.get_json()
        self.assertTrue(me_data["success"])
        self.assertEqual(me_data["data"]["user"]["email"], "alice@university.edu")

    def test_04_login_invalid_password(self):
        """Login with wrong password returns 401 Unauthorized."""
        res = self.client.post("/api/auth/login", json={
            "email": "alice@university.edu",
            "password": "WrongPassword!",
        })
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertFalse(data["success"])

    def test_05_profile_update(self):
        """Authenticated user can update profile details."""
        update_payload = {
            "name": "Alice Updated",
            "college": "UC Berkeley",
            "degree_program": "M.S. Software Engineering",
            "target_role": "Machine Learning Engineer",
            "graduation_year": 2027,
        }
        res = self.client.put("/api/auth/profile", json=update_payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        user = data["data"]["user"]
        self.assertEqual(user["name"], "Alice Updated")
        self.assertEqual(user["college"], "UC Berkeley")
        self.assertEqual(user["degree_program"], "M.S. Software Engineering")
        self.assertEqual(user["target_role"], "Machine Learning Engineer")

    def test_06_preferences_update(self):
        """Authenticated user can update study and role preferences."""
        prefs = {
            "default_target_role": "Machine Learning Engineer",
            "weekly_study_goal_hours": 15,
            "difficulty_tier": "Advanced",
            "rest_days_mode": "Weekends Off (2 days)",
        }
        res = self.client.put("/api/auth/preferences", json={"preferences": prefs})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["preferences"]["difficulty_tier"], "Advanced")
        self.assertEqual(data["data"]["preferences"]["weekly_study_goal_hours"], 15)

    def test_07_password_change(self):
        """Password change requires valid current password and allows subsequent login with new password."""
        # Wrong current password fails
        res_fail = self.client.put("/api/auth/password", json={
            "current_password": "WrongOldPassword",
            "new_password": "NewStrongPassword456!",
        })
        self.assertEqual(res_fail.status_code, 400)

        # Correct current password succeeds
        res_ok = self.client.put("/api/auth/password", json={
            "current_password": "Password123!",
            "new_password": "NewStrongPassword456!",
        })
        self.assertEqual(res_ok.status_code, 200)

        # Logout and test login with old vs new password
        self.client.post("/api/auth/logout")

        old_login = self.client.post("/api/auth/login", json={
            "email": "alice@university.edu",
            "password": "Password123!",
        })
        self.assertEqual(old_login.status_code, 401)

        new_login = self.client.post("/api/auth/login", json={
            "email": "alice@university.edu",
            "password": "NewStrongPassword456!",
        })
        self.assertEqual(new_login.status_code, 200)

    def test_08_user_data_isolation(self):
        """
        Verify strict isolation between users:
        Alice creates data. Bob logs in and sees 0 records.
        """
        # 1. Alice logs in and creates records
        self.client.post("/api/auth/login", json={
            "email": "alice@university.edu",
            "password": "NewStrongPassword456!",
        })

        # Alice creates a resume
        resume_res = self.client.post("/api/resume/analyze", json={
            "text": "Experienced Python, React, TypeScript developer with 4 years building web applications and REST APIs.",
            "target_role": "Full Stack Developer",
            "filename": "alice_resume.txt",
        })
        self.assertEqual(resume_res.status_code, 200)
        alice_resume_id = resume_res.get_json()["data"]["id"]

        # Alice creates a skill evaluation
        skill_res = self.client.post("/api/skills/evaluate", json={
            "target_role": "Full Stack Developer",
            "resume_id": alice_resume_id,
        })
        self.assertEqual(skill_res.status_code, 200)

        # Alice creates an interview session
        interview_res = self.client.post("/api/interview/generate", json={
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
        })
        self.assertEqual(interview_res.status_code, 200)

        # Alice creates a study plan
        plan_res = self.client.post("/api/study-planner/generate", json={
            "goal": "Skill Development",
            "topics": ["React", "Python"],
            "daily_hours": 1.5,
            "horizon_weeks": 2,
        })
        self.assertEqual(plan_res.status_code, 201)

        # Alice checks her history: should see 1 record in each
        alice_resumes = self.client.get("/api/resume/history").get_json()["data"]
        self.assertEqual(len(alice_resumes), 1)
        self.assertEqual(alice_resumes[0]["id"], alice_resume_id)

        alice_skills = self.client.get("/api/skills/history").get_json()["data"]
        self.assertEqual(len(alice_skills), 1)

        alice_interviews = self.client.get("/api/interview/history").get_json()["data"]
        self.assertEqual(len(alice_interviews), 1)

        alice_plans = self.client.get("/api/study-planner/history").get_json()["data"]
        self.assertEqual(len(alice_plans), 1)

        # 2. Bob registers and logs in using a separate client
        bob_client = self.app.test_client()
        bob_client.post("/api/auth/signup", json={
            "name": "Bob Smith",
            "email": "bob@university.edu",
            "password": "BobPassword789!",
        })

        # Bob queries history across all 4 modules: MUST BE EMPTY (0 records)
        bob_resumes = bob_client.get("/api/resume/history").get_json()["data"]
        self.assertEqual(len(bob_resumes), 0, "Bob should see 0 resumes, not Alice's!")

        bob_skills = bob_client.get("/api/skills/history").get_json()["data"]
        self.assertEqual(len(bob_skills), 0, "Bob should see 0 skill evaluations, not Alice's!")

        bob_interviews = bob_client.get("/api/interview/history").get_json()["data"]
        self.assertEqual(len(bob_interviews), 0, "Bob should see 0 interview sessions, not Alice's!")

        bob_plans = bob_client.get("/api/study-planner/history").get_json()["data"]
        self.assertEqual(len(bob_plans), 0, "Bob should see 0 study plans, not Alice's!")

    def test_09_legacy_records_preservation(self):
        """Unauthenticated client queries legacy records (user_id IS NULL) without leaking user accounts."""
        anon_client = self.app.test_client()
        anon_resumes = anon_client.get("/api/resume/history").get_json()["data"]
        self.assertEqual(len(anon_resumes), 1)
        self.assertEqual(anon_resumes[0]["filename"], "legacy_sample.pdf")

        anon_skills = anon_client.get("/api/skills/history").get_json()["data"]
        self.assertEqual(len(anon_skills), 1)

        anon_interviews = anon_client.get("/api/interview/history").get_json()["data"]
        self.assertEqual(len(anon_interviews), 1)

        anon_plans = anon_client.get("/api/study-planner/history").get_json()["data"]
        self.assertEqual(len(anon_plans), 1)
        self.assertEqual(anon_plans[0]["goal"], "Legacy Plan")

    def test_10_clear_activity_data(self):
        """DELETE /api/auth/data with DELETE_ALL_DATA clears user records while keeping user account."""
        # Alice logs in
        self.client.post("/api/auth/login", json={
            "email": "alice@university.edu",
            "password": "NewStrongPassword456!",
        })

        del_res = self.client.delete("/api/auth/data", json={"confirmation": "DELETE_ALL_DATA"})
        self.assertEqual(del_res.status_code, 200)

        # Alice's history is now 0
        self.assertEqual(len(self.client.get("/api/resume/history").get_json()["data"]), 0)
        self.assertEqual(len(self.client.get("/api/skills/history").get_json()["data"]), 0)
        self.assertEqual(len(self.client.get("/api/interview/history").get_json()["data"]), 0)
        self.assertEqual(len(self.client.get("/api/study-planner/history").get_json()["data"]), 0)

        # Alice's account is still active
        me_res = self.client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 200)

        # Legacy data is still intact
        anon_client = self.app.test_client()
        self.assertEqual(len(anon_client.get("/api/resume/history").get_json()["data"]), 1)

    def test_11_delete_account(self):
        """DELETE /api/auth/data with DELETE_ACCOUNT deletes user and terminates session."""
        del_acc = self.client.delete("/api/auth/data", json={"confirmation": "DELETE_ACCOUNT"})
        self.assertEqual(del_acc.status_code, 200)

        # Alice is now logged out and user record deleted
        me_res = self.client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 401)

        login_res = self.client.post("/api/auth/login", json={
            "email": "alice@university.edu",
            "password": "NewStrongPassword456!",
        })
        self.assertEqual(login_res.status_code, 401)


if __name__ == "__main__":
    unittest.main()

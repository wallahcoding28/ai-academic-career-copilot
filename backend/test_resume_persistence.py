"""
Resume Persistence and History Detail Test Suite
Verifies:
1. GET /api/resume/<id> returns 200 with complete structured analysis snapshot for valid ID.
2. GET /api/resume/<id> returns 404 for nonexistent resume ID.
3. GET /api/skills/evaluation-by-resume/<resume_id> returns prior evaluation data.
4. GET /api/skills/evaluation-by-resume/<resume_id> returns data: null when no prior evaluation exists.
5. GET /api/skills/history includes resume_id field in records.
6. Snapshot comparison logic correctly calculates score delta and set difference of skills.
7. Zero mutations to development database (database/copilot.db).
"""

import os
import json
import sqlite3
import sys
import unittest

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.config import BASE_DIR
from app.models.db import get_db
from app.services.resume_service import ResumeService
from app.services.skill_service import SkillService


class ResumePersistenceTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dev_db_path = str(BASE_DIR / "database" / "copilot.db")
        cls.test_db_path = str(BASE_DIR / "database" / "copilot_test.db")

        # Snapshot dev database row counts before running
        cls.dev_counts_before = cls._get_dev_counts()

        cls.app = create_app("testing")
        cls.client = cls.app.test_client()

        # Seed test database with known resume and skill evaluation fixtures
        with cls.app.app_context():
            db = get_db()
            cursor = db.cursor()

            # Insert sample resume 1
            fb1 = {
                "score": 75,
                "summary": "Candidate demonstrates good full stack skills.",
                "matched_skills": ["Python", "React", "SQL", "Git"],
                "missing_skills": ["Docker", "Kubernetes", "AWS"],
                "bullet_improvements": [
                    {
                        "original": "Worked on web app",
                        "improved": "Architected web app using React [insert metric]",
                        "reason": "Replaces passive verb with technical action verb"
                    }
                ],
                "formatting_audit": {
                    "readability": "Good",
                    "ats_score": 80,
                    "formatting_flags": []
                },
                "target_role": "Full Stack Developer",
                "analysis_mode": "ats_heuristic"
            }
            cursor.execute(
                """
                INSERT INTO resumes (filename, file_size, raw_text, extracted_skills, feedback_json, score)
                VALUES (?, ?, ?, ?, ?, ?);
                """,
                (
                    "Test_Resume_Alpha.pdf",
                    12345,
                    "Experienced in Python, React, SQL, and Git.",
                    json.dumps(["Python", "React", "SQL", "Git"]),
                    json.dumps(fb1),
                    75.0,
                )
            )
            cls.resume1_id = cursor.lastrowid

            # Insert sample resume 2 for comparison testing
            fb2 = {
                "score": 88,
                "summary": "Candidate demonstrates advanced full stack competencies.",
                "matched_skills": ["Python", "React", "SQL", "Git", "Docker", "TypeScript"],
                "missing_skills": ["Kubernetes"],
                "bullet_improvements": [],
                "formatting_audit": {
                    "readability": "Excellent",
                    "ats_score": 92,
                    "formatting_flags": []
                },
                "target_role": "Full Stack Developer",
                "analysis_mode": "ats_heuristic"
            }
            cursor.execute(
                """
                INSERT INTO resumes (filename, file_size, raw_text, extracted_skills, feedback_json, score)
                VALUES (?, ?, ?, ?, ?, ?);
                """,
                (
                    "Test_Resume_Beta.docx",
                    18400,
                    "Experienced in Python, React, TypeScript, Docker, SQL, and Git.",
                    json.dumps(["Python", "React", "SQL", "Git", "Docker", "TypeScript"]),
                    json.dumps(fb2),
                    88.0,
                )
            )
            cls.resume2_id = cursor.lastrowid

            # Insert skill evaluation linked to resume 1
            det1 = {
                "metrics": {
                    "overall_coverage": 65.5,
                    "core_coverage": 70.0,
                    "complementary_coverage": 55.0,
                    "total_benchmark_skills": 15,
                    "direct_match_count": 4,
                    "adjacent_match_count": 1,
                    "missing_count": 10,
                },
                "skills": {
                    "direct_matches": [{"name": "Python", "tier": "core", "category": "Languages", "evidence": "Resume"}],
                    "adjacent_skills": [],
                    "missing_skills": [{"name": "Docker", "tier": "complementary", "priority": "High", "category": "DevOps", "impact": "High"}],
                },
                "recommendations": [{"skill": "Docker", "priority": "High", "why_it_matters": "Containers", "learning_direction": "Docker docs", "project_idea": "Containerize app"}],
                "benchmark_notice": "Standard benchmark"
            }
            cursor.execute(
                """
                INSERT INTO skill_evaluations (
                    resume_id, source_type, target_role, current_skills, matched_skills,
                    adjacent_skills, missing_skills, match_percentage, core_coverage,
                    complementary_coverage, analysis_mode, recommendations_json, detailed_results_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    cls.resume1_id,
                    "resume_reuse",
                    "Full Stack Developer",
                    json.dumps(["Python", "React", "SQL", "Git"]),
                    json.dumps([{"name": "Python", "tier": "core", "category": "Languages", "evidence": "Resume"}]),
                    json.dumps([]),
                    json.dumps([{"name": "Docker", "tier": "complementary", "priority": "High", "category": "DevOps", "impact": "High"}]),
                    65.5,
                    70.0,
                    55.0,
                    "deterministic_benchmark",
                    json.dumps(det1["recommendations"]),
                    json.dumps(det1)
                )
            )
            cls.skill_eval1_id = cursor.lastrowid
            db.commit()

    @classmethod
    def tearDownClass(cls):
        # Verify zero mutations to dev database
        dev_counts_after = cls._get_dev_counts()
        assert cls.dev_counts_before == dev_counts_after, (
            f"MUTATION DETECTED in dev database! Before: {cls.dev_counts_before}, After: {dev_counts_after}"
        )

    @classmethod
    def _get_dev_counts(cls):
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

    def test_01_get_resume_by_id_success(self):
        """GET /api/resume/<id> returns 200 with full analysis snapshot."""
        response = self.client.get(f"/api/resume/{self.resume1_id}")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        res = data["data"]
        self.assertEqual(res["id"], self.resume1_id)
        self.assertEqual(res["filename"], "Test_Resume_Alpha.pdf")
        self.assertEqual(res["score"], 75.0)
        self.assertEqual(res["target_role"], "Full Stack Developer")
        self.assertIn("Python", res["matched_skills"])
        self.assertEqual(len(res["bullet_improvements"]), 1)
        self.assertEqual(res["formatting_audit"]["readability"], "Good")

    def test_02_get_resume_by_id_not_found(self):
        """GET /api/resume/<id> returns 404 for invalid resume ID."""
        response = self.client.get("/api/resume/999999")
        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertFalse(data["success"])
        self.assertIn("not found", data["message"].lower())

    def test_03_get_skill_evaluation_by_resume_found(self):
        """GET /api/skills/evaluation-by-resume/<resume_id> returns prior evaluation."""
        response = self.client.get(f"/api/skills/evaluation-by-resume/{self.resume1_id}")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        eval_data = data["data"]
        self.assertIsNotNone(eval_data)
        self.assertEqual(eval_data["resume_id"], self.resume1_id)
        self.assertEqual(eval_data["target_role"], "Full Stack Developer")
        self.assertEqual(eval_data["metrics"]["overall_coverage"], 65.5)

    def test_04_get_skill_evaluation_by_resume_none(self):
        """GET /api/skills/evaluation-by-resume/<resume_id> returns empty object/no data when none exists."""
        response = self.client.get(f"/api/skills/evaluation-by-resume/{self.resume2_id}")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        # success_response defaults None to {}
        self.assertFalse(data["data"])
        self.assertIn("no prior evaluation", data["message"].lower())

    def test_05_skills_history_includes_resume_id(self):
        """GET /api/skills/history includes resume_id field."""
        response = self.client.get("/api/skills/history?limit=10")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        items = data["data"]
        self.assertTrue(len(items) > 0)
        first_item = items[0]
        self.assertIn("resume_id", first_item)
        self.assertEqual(first_item["resume_id"], self.resume1_id)

    def test_06_snapshot_comparison_logic(self):
        """Verify snapshot comparison arithmetic and skill difference calculations."""
        with self.app.app_context():
            res1 = ResumeService.get_resume_by_id(self.resume1_id)
            res2 = ResumeService.get_resume_by_id(self.resume2_id)

            self.assertIsNotNone(res1)
            self.assertIsNotNone(res2)

            # Score delta: 88 - 75 = +13
            delta = res2["score"] - res1["score"]
            self.assertEqual(delta, 13.0)

            # Skill diff
            skills1 = set(res1["matched_skills"])
            skills2 = set(res2["matched_skills"])

            new_skills = skills2 - skills1
            retained = skills2 & skills1
            removed = skills1 - skills2

            self.assertEqual(new_skills, {"Docker", "TypeScript"})
            self.assertEqual(retained, {"Python", "React", "SQL", "Git"})
            self.assertEqual(removed, set())


if __name__ == "__main__":
    unittest.main()

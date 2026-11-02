import json
import os
import sys
import unittest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app


class Stage4QualityControlTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["modules"]["interview_generator"], "active_stage_4")
        self.assertEqual(data["modules"]["skill_gap_analyzer"], "active_stage_3")
        self.assertEqual(data["modules"]["resume_analyzer"], "active_stage_2")

    def test_roles_endpoint(self):
        res = self.client.get("/api/interview/roles")
        self.assertEqual(res.status_code, 200)
        roles = res.get_json()["data"]["roles"]
        self.assertEqual(len(roles), 6)
        titles = [r["title"] for r in roles]
        self.assertIn("Full Stack Developer", titles)
        self.assertIn("Frontend Engineer", titles)
        self.assertIn("Backend Engineer", titles)
        self.assertIn("Machine Learning Engineer", titles)
        self.assertIn("Data Analyst / Scientist", titles)
        self.assertIn("DevOps & Cloud Engineer", titles)
        # Verify core_skills are returned
        for r in roles:
            self.assertTrue(len(r["core_skills"]) >= 4)

    def test_generate_all_counts(self):
        for count in [5, 10, 15, 20]:
            payload = {
                "target_role": "Backend Engineer",
                "difficulty": "Intermediate",
                "question_focus": "Mixed / Balanced",
                "question_count": count,
                "context_source": "none"
            }
            res = self.client.post("/api/interview/generate", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.get_json()["data"]
            self.assertEqual(len(data["questions"]), count)
            self.assertEqual(data["question_count"], count)

    def test_generate_all_focuses(self):
        focuses = [
            "Technical Fundamentals",
            "Coding & Algorithms",
            "System Design & Architecture",
            "Behavioral & Project Experience",
            "Mixed / Balanced"
        ]
        for f in focuses:
            payload = {
                "target_role": "Full Stack Developer",
                "difficulty": "Advanced",
                "question_focus": f,
                "question_count": 5,
                "context_source": "none"
            }
            res = self.client.post("/api/interview/generate", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.get_json()["data"]
            self.assertEqual(len(data["questions"]), 5)
            if f != "Mixed / Balanced":
                for q in data["questions"]:
                    self.assertEqual(q["category"], f)
            else:
                # Mixed should include multiple distinct categories
                categories = set(q["category"] for q in data["questions"])
                self.assertTrue(len(categories) >= 2)

    def test_error_handling_invalid_inputs(self):
        # 1. Invalid target role -> 400
        res = self.client.post("/api/interview/generate", json={
            "target_role": "Astronaut",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("target role", res.get_json()["message"].lower())

        # 2. Invalid count -> 400
        res = self.client.post("/api/interview/generate", json={
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 99
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("count", res.get_json()["message"].lower())

        # 3. Invalid context source -> 400
        res = self.client.post("/api/interview/generate", json={
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "magical_telepathy"
        })
        self.assertEqual(res.status_code, 400)

        # 4. Nonexistent resume_id -> 404
        res = self.client.post("/api/interview/generate", json={
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "resume",
            "resume_id": 888888
        })
        self.assertEqual(res.status_code, 404)

        # 5. Nonexistent skill_gap_id -> 404
        res = self.client.post("/api/interview/generate", json={
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "skill_gap",
            "skill_gap_id": 888888
        })
        self.assertEqual(res.status_code, 404)

        # 6. Non-JSON request -> 400
        res = self.client.post("/api/interview/generate", data="invalid plain text", content_type="text/plain")
        self.assertEqual(res.status_code, 400)

    def test_resume_and_skill_gap_regression(self):
        # Stage 2 regression
        res_resume = self.client.get("/api/resume/history")
        self.assertEqual(res_resume.status_code, 200)

        # Stage 3 regression
        res_skills = self.client.get("/api/skills/roles")
        self.assertEqual(res_skills.status_code, 200)

        res_eval_hist = self.client.get("/api/skills/history")
        self.assertEqual(res_eval_hist.status_code, 200)


if __name__ == "__main__":
    unittest.main()

import json
import os
import sys
import unittest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.interview_service import SUPPORTED_QUESTION_FOCUSES, SUPPORTED_QUESTION_COUNTS


class InterviewGeneratorTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def test_health_check_stage_4(self):
        """Verify health check reports active stage 4 interview generator."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["modules"]["interview_generator"], "active_stage_4")
        self.assertEqual(data["data"]["modules"]["resume_analyzer"], "active_stage_2")
        self.assertEqual(data["data"]["modules"]["skill_gap_analyzer"], "active_stage_3")

    def test_get_roles(self):
        """GET /api/interview/roles returns 6 benchmark roles."""
        res = self.client.get("/api/interview/roles")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        roles = data["data"]["roles"]
        self.assertEqual(len(roles), 6)
        role_titles = [r["title"] for r in roles]
        self.assertIn("Full Stack Developer", role_titles)
        self.assertIn("Machine Learning Engineer", role_titles)

    def test_generate_default_valid_configuration(self):
        """POST /api/interview/generate with standard valid configuration."""
        payload = {
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "selected_skills": ["React", "Node.js"],
            "question_count": 5,
            "context_source": "none"
        }
        res = self.client.post("/api/interview/generate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        session = data["data"]
        self.assertEqual(session["target_role"], "Full Stack Developer")
        self.assertEqual(session["difficulty"], "Intermediate")
        self.assertEqual(session["question_count"], 5)
        self.assertEqual(len(session["questions"]), 5)
        self.assertIn(session["generation_mode"], ["gemini_ai", "deterministic_engine"])
        self.assertIn(session["generation_mode_label"], ["AI-Generated", "Offline Question Engine"])
        
        # Verify structure of each question
        for idx, q in enumerate(session["questions"]):
            self.assertEqual(q["question_number"], idx + 1)
            self.assertTrue(len(q["question"]) > 10)
            self.assertIn("category", q)
            self.assertIn("difficulty", q)
            self.assertIn("skill_or_topic", q)
            self.assertIsInstance(q["guidance"], list)
            self.assertTrue(len(q["guidance"]) >= 1)

    def test_generate_all_supported_question_focuses(self):
        """Test each supported question focus category."""
        for focus in SUPPORTED_QUESTION_FOCUSES:
            payload = {
                "target_role": "Backend Engineer",
                "difficulty": "Advanced",
                "question_focus": focus,
                "selected_skills": ["Python", "PostgreSQL"],
                "question_count": 5,
                "context_source": "none"
            }
            res = self.client.post("/api/interview/generate", json=payload)
            self.assertEqual(res.status_code, 200, f"Failed for focus: {focus}")
            data = res.get_json()
            questions = data["data"]["questions"]
            self.assertEqual(len(questions), 5)
            if focus != "Mixed / Balanced":
                # Questions should match focus
                for q in questions:
                    self.assertEqual(q["category"], focus)

    def test_exact_question_counts(self):
        """Test exact question counts 5, 10, 15, 20."""
        for count in SUPPORTED_QUESTION_COUNTS:
            payload = {
                "target_role": "DevOps & Cloud Engineer",
                "difficulty": "Intermediate",
                "question_focus": "Mixed / Balanced",
                "selected_skills": ["Docker", "Kubernetes"],
                "question_count": count,
                "context_source": "none"
            }
            res = self.client.post("/api/interview/generate", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertEqual(data["data"]["question_count"], count)
            self.assertEqual(len(data["data"]["questions"]), count)

    def test_generate_invalid_role(self):
        """Invalid target role returns 400."""
        payload = {
            "target_role": "Nonexistent Wizard Role",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "none"
        }
        res = self.client.post("/api/interview/generate", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertIn("target role", data["message"].lower())

    def test_generate_valid_resume_context(self):
        """Generate questions using valid resume context from database."""
        payload = {
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "resume",
            "resume_id": 1
        }
        res = self.client.post("/api/interview/generate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["context_source"], "resume")
        self.assertEqual(data["data"]["resume_id"], 1)
        self.assertEqual(len(data["data"]["questions"]), 5)

    def test_generate_valid_skill_gap_context(self):
        """Generate questions using valid skill gap evaluation context."""
        # First ensure a skill evaluation exists
        eval_res = self.client.post(
            "/api/skills/evaluate",
            json={"resume_id": 1, "target_role": "Full Stack Developer"}
        )
        self.assertEqual(eval_res.status_code, 200)
        skill_gap_id = eval_res.get_json()["data"]["id"]

        payload = {
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "skill_gap",
            "skill_gap_id": skill_gap_id
        }
        res = self.client.post("/api/interview/generate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["context_source"], "skill_gap")
        self.assertEqual(data["data"]["skill_gap_id"], skill_gap_id)
        self.assertEqual(len(data["data"]["questions"]), 5)

    def test_generate_invalid_resume_id(self):
        """Non-existent resume_id with context_source='resume' returns 404."""
        payload = {
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "resume",
            "resume_id": 999999
        }
        res = self.client.post("/api/interview/generate", json=payload)
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertIn("not found", data["message"].lower())

    def test_generate_invalid_skill_gap_id(self):
        """Non-existent skill_gap_id with context_source='skill_gap' returns 404."""
        payload = {
            "target_role": "Full Stack Developer",
            "difficulty": "Intermediate",
            "question_focus": "Mixed / Balanced",
            "question_count": 5,
            "context_source": "skill_gap",
            "skill_gap_id": 999999
        }
        res = self.client.post("/api/interview/generate", json=payload)
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertIn("not found", data["message"].lower())

    def test_history_persistence_and_retrieval(self):
        """Generated sessions are saved to SQLite and retrievable via /history."""
        payload = {
            "target_role": "Data Analyst / Scientist",
            "difficulty": "Beginner",
            "question_focus": "Technical Fundamentals",
            "selected_skills": ["SQL", "Python"],
            "question_count": 5,
            "context_source": "none"
        }
        post_res = self.client.post("/api/interview/generate", json=payload)
        self.assertEqual(post_res.status_code, 200)
        session_id = post_res.get_json()["data"]["id"]
        self.assertIsNotNone(session_id)

        get_res = self.client.get("/api/interview/history")
        self.assertEqual(get_res.status_code, 200)
        history = get_res.get_json()["data"]
        self.assertTrue(len(history) >= 1)
        found = any(item["id"] == session_id for item in history)
        self.assertTrue(found)

    def test_regression_stage2_stage3_routes(self):
        """Ensure resume analyzer and skill gap analyzer routes remain fully intact."""
        res_resumes = self.client.get("/api/resume/history")
        self.assertEqual(res_resumes.status_code, 200)

        res_roles = self.client.get("/api/skills/roles")
        self.assertEqual(res_roles.status_code, 200)


if __name__ == "__main__":
    unittest.main()

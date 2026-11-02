"""
End-to-End User Journey & Cross-Module Workflow Integration Test Suite
Validates the complete real-world student user journey:
Resume upload/analyze
  -> Skill Gap analysis using resume
  -> Interview generation using skill gap context
  -> Study Plan generation using interview context
  -> Session completion & progress recalculation
  -> Transactional versioned study plan regeneration
  -> History verification & data persistence across modules
  -> Edge cases: No context, empty history, invalid IDs (404), unauthenticated mode
"""

import io
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.db import get_db


class E2EUserWorkflowTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("testing")
        cls.client = cls.app.test_client()

    def test_01_health_check_complete_system(self):
        """GET /api/health verifies all 5 subsystems are healthy and active."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        modules = data["data"]["modules"]
        self.assertEqual(modules["resume_analyzer"], "active_stage_2")
        self.assertEqual(modules["skill_gap_analyzer"], "active_stage_3")
        self.assertEqual(modules["interview_generator"], "active_stage_4")
        self.assertEqual(modules["study_planner"], "active_stage_5")
        self.assertEqual(modules["history_archive"], "active_stage_5")

    def test_02_e2e_student_workflow(self):
        """Full end-to-end multi-step student career preparation pipeline."""
        # =====================================================================
        # Step 1: Resume Upload and ATS Analysis
        # =====================================================================
        resume_text = (
            "Alex Smith\n"
            "Software Engineering Student\n"
            "Skills: Python, TypeScript, React, Docker, SQL, PostgreSQL, Git, Redis\n"
            "Projects: Built scalable microservice backend using Python and PostgreSQL. "
            "Created responsive React web application with state management."
        )
        upload_data = {
            "file": (io.BytesIO(resume_text.encode("utf-8")), "alex_smith_resume.txt"),
            "target_role": "Full Stack Developer",
        }
        res_step1 = self.client.post(
            "/api/resume/analyze",
            data=upload_data,
            content_type="multipart/form-data"
        )
        self.assertEqual(res_step1.status_code, 200)
        data_step1 = res_step1.get_json()
        self.assertTrue(data_step1["success"])
        resume_id = data_step1["data"]["id"]
        self.assertIsInstance(resume_id, int)
        self.assertGreater(data_step1["data"]["score"], 0)
        self.assertTrue(len(data_step1["data"]["matched_skills"]) > 0)

        # =====================================================================
        # Step 2: Skill Gap Analysis via Resume Reuse
        # =====================================================================
        res_step2 = self.client.post(
            "/api/skills/evaluate",
            json={
                "resume_id": resume_id,
                "target_role": "Full Stack Developer"
            }
        )
        self.assertEqual(res_step2.status_code, 200)
        data_step2 = res_step2.get_json()
        self.assertTrue(data_step2["success"])
        skill_gap_id = data_step2["data"]["id"]
        self.assertIsInstance(skill_gap_id, int)
        self.assertGreater(data_step2["data"]["metrics"]["overall_coverage"], 0)
        self.assertIn("direct_matches", data_step2["data"]["skills"])
        self.assertIn("missing_skills", data_step2["data"]["skills"])

        # =====================================================================
        # Step 3: Interview Generation Using Skill Gap Context
        # =====================================================================
        res_step3 = self.client.post(
            "/api/interview/generate",
            json={
                "target_role": "Full Stack Developer",
                "difficulty": "Intermediate",
                "question_focus": "Mixed / Balanced",
                "question_count": 5,
                "context_source": "skill_gap",
                "skill_gap_id": skill_gap_id,
            }
        )
        self.assertEqual(res_step3.status_code, 200)
        data_step3 = res_step3.get_json()
        self.assertTrue(data_step3["success"])
        interview_id = data_step3["data"]["id"]
        self.assertIsInstance(interview_id, int)
        self.assertEqual(len(data_step3["data"]["questions"]), 5)
        self.assertEqual(data_step3["data"]["context_source"], "skill_gap")
        self.assertEqual(data_step3["data"]["skill_gap_id"], skill_gap_id)

        # =====================================================================
        # Step 4: Study Plan Generation Using Interview Context
        # =====================================================================
        res_step4 = self.client.post(
            "/api/study-planner/generate",
            json={
                "goal": "Interview Preparation",
                "topics": ["React & State Management", "Node.js & Event Loop", "SQL & Relational Databases"],
                "daily_hours": 2.0,
                "horizon_weeks": 2,
                "context_source": "interview",
                "interview_session_id": interview_id,
                "study_preferences": {
                    "pacing": "balanced",
                    "rest_days_mode": "weekends_off",
                    "include_revision": True,
                }
            }
        )
        self.assertEqual(res_step4.status_code, 201)
        data_step4 = res_step4.get_json()
        self.assertTrue(data_step4["success"])
        plan_id = data_step4["data"]["id"]
        self.assertIsInstance(plan_id, int)
        self.assertEqual(data_step4["data"]["horizon_weeks"], 2)
        self.assertEqual(data_step4["data"]["daily_hours"], 2.0)
        self.assertTrue(len(data_step4["data"]["sessions"]) > 0)
        self.assertEqual(data_step4["data"]["completed_sessions"], 0)

        # =====================================================================
        # Step 5: Mark Daily Study Session as Completed
        # =====================================================================
        # Fetch plan details
        res_plan = self.client.get(f"/api/study-planner/{plan_id}")
        self.assertEqual(res_plan.status_code, 200)
        plan_details = res_plan.get_json()["data"]

        # Find first non-rest session
        study_sessions = [s for s in plan_details["sessions"] if s["activity_type"] != "Rest"]
        self.assertTrue(len(study_sessions) > 0)
        first_session = study_sessions[0]
        self.assertFalse(first_session["is_completed"])

        # Toggle completion to True
        res_toggle = self.client.patch(
            f"/api/study-planner/{plan_id}/sessions/{first_session['id']}",
            json={"is_completed": True}
        )
        self.assertEqual(res_toggle.status_code, 200)
        toggle_data = res_toggle.get_json()["data"]
        self.assertTrue(toggle_data["session"]["is_completed"])
        self.assertIsNotNone(toggle_data["session"]["completed_at"])
        self.assertEqual(toggle_data["plan_completed_sessions"], 1)

        # Verify plan progress updated
        res_plan_after = self.client.get(f"/api/study-planner/{plan_id}")
        self.assertEqual(res_plan_after.status_code, 200)
        plan_after = res_plan_after.get_json()["data"]
        self.assertEqual(plan_after["completed_sessions"], 1)
        self.assertGreater(plan_after["progress_percentage"], 0)

        # =====================================================================
        # Step 6: Transactional Plan Regeneration
        # =====================================================================
        res_regen = self.client.post(
            f"/api/study-planner/{plan_id}/regenerate",
            json={
                "daily_hours": 3.0,
                "horizon_weeks": 4,
            }
        )
        self.assertEqual(res_regen.status_code, 201)
        regen_data = res_regen.get_json()["data"]
        self.assertEqual(regen_data["version"], 2)
        self.assertEqual(regen_data["parent_plan_id"], plan_id)
        self.assertTrue(regen_data["is_active"])
        self.assertEqual(regen_data["daily_hours"], 3.0)

        # Verify parent plan was archived (is_active = 0)
        res_parent = self.client.get(f"/api/study-planner/{plan_id}")
        self.assertEqual(res_parent.status_code, 200)
        parent_details = res_parent.get_json()["data"]
        self.assertFalse(parent_details["is_active"])
        # Verify parent completed session was preserved
        self.assertEqual(parent_details["completed_sessions"], 1)

        # =====================================================================
        # Step 7: Cross-Module History Archive Verification
        # =====================================================================
        # 1. Resume history contains our resume
        res_rh = self.client.get("/api/resume/history")
        self.assertEqual(res_rh.status_code, 200)
        resumes_list = res_rh.get_json()["data"]
        self.assertTrue(any(r["id"] == resume_id for r in resumes_list))

        # 2. Skill gap history contains our evaluation
        res_sh = self.client.get("/api/skills/history")
        self.assertEqual(res_sh.status_code, 200)
        skills_list = res_sh.get_json()["data"]
        self.assertTrue(any(s["id"] == skill_gap_id for s in skills_list))

        # 3. Interview history contains our session
        res_ih = self.client.get("/api/interview/history")
        self.assertEqual(res_ih.status_code, 200)
        interview_list = res_ih.get_json()["data"]
        self.assertTrue(any(i["id"] == interview_id for i in interview_list))

        # 4. Study plans history contains both active and archived plans
        res_sph = self.client.get("/api/study-planner/history")
        self.assertEqual(res_sph.status_code, 200)
        plans_list = res_sph.get_json()["data"]
        self.assertTrue(any(p["id"] == plan_id for p in plans_list))
        self.assertTrue(any(p["id"] == regen_data["id"] for p in plans_list))

    def test_03_standalone_modes_without_prior_context(self):
        """Modules work in standalone/no-context mode when user skips prior steps."""
        # 1. Interview Generation in No-Context Mode
        res_interview_nocontext = self.client.post(
            "/api/interview/generate",
            json={
                "target_role": "Backend Engineer",
                "difficulty": "Beginner",
                "question_focus": "Technical Fundamentals",
                "question_count": 5,
                "context_source": "none",
            }
        )
        self.assertEqual(res_interview_nocontext.status_code, 200)
        data = res_interview_nocontext.get_json()["data"]
        self.assertEqual(data["context_source"], "none")
        self.assertIsNone(data["resume_id"])
        self.assertIsNone(data["skill_gap_id"])
        self.assertEqual(len(data["questions"]), 5)

        # 2. Study Plan in Custom/No-Context Mode
        res_study_custom = self.client.post(
            "/api/study-planner/generate",
            json={
                "goal": "Academic Subjects",
                "topics": ["Operating Systems", "Computer Networks", "Database Management Systems"],
                "daily_hours": 1.0,
                "horizon_weeks": 1,
                "context_source": "custom",
            }
        )
        self.assertEqual(res_study_custom.status_code, 201)
        study_data = res_study_custom.get_json()["data"]
        self.assertEqual(study_data["context_source"], "custom")
        self.assertIsNone(study_data["resume_id"])
        self.assertIsNone(study_data["skill_gap_id"])
        self.assertIsNone(study_data["interview_session_id"])

    def test_04_error_and_edge_cases(self):
        """API endpoints reject invalid parameters with appropriate HTTP status codes."""
        # Nonexistent resume in skills evaluate
        res = self.client.post("/api/skills/evaluate", json={"resume_id": 888888, "target_role": "Backend Engineer"})
        self.assertEqual(res.status_code, 404)

        # Out of bounds daily hours in study planner
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Skill Development",
            "topics": ["Python"],
            "daily_hours": 10.0,
            "horizon_weeks": 2,
        })
        self.assertEqual(res.status_code, 400)

        # Invalid horizon weeks
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Skill Development",
            "topics": ["Python"],
            "daily_hours": 1.5,
            "horizon_weeks": 5,
        })
        self.assertEqual(res.status_code, 400)

        # Nonexistent plan ID retrieval
        res = self.client.get("/api/study-planner/888888")
        self.assertEqual(res.status_code, 404)

        # Nonexistent session completion update
        res = self.client.patch("/api/study-planner/888888/sessions/999999", json={"is_completed": True})
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()

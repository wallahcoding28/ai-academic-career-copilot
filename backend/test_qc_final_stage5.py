"""
Comprehensive Stage 5 Final QC & Audit Suite
Tests:
- Approved Design & Scheduling Constraints (0.5 - 6.0 hr bounds, [1, 2, 4, 8] horizons)
- Workload feasibility and mathematical invariants
- Rest day modes (weekends_off, one_day_off, daily)
- Deterministic and AI fallback safety (malformed AI JSON cannot alter schedule)
- Context integrity (Skill Gap, Interview, Resume, Nonexistent IDs)
- Transactional versioned regeneration and rollback
- Session completion atomicity and progress calculation
- All 6 API endpoints
"""

import unittest
import json
import os
import sys
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.db import get_db
from app.services.study_service import (
    StudyPlannerService,
    MIN_DAILY_HOURS,
    MAX_DAILY_HOURS,
    VALID_HORIZONS,
    VALID_GOALS,
)


class TestStage5FinalQC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("testing")
        cls.client = cls.app.test_client()

    def test_01_scheduling_mathematical_invariants(self):
        """Verify daily bounds, duration calculations, and rest day math."""
        # 1. Daily hours limits
        self.assertEqual(MIN_DAILY_HOURS, 0.5)
        self.assertEqual(MAX_DAILY_HOURS, 6.0)
        self.assertEqual(VALID_HORIZONS, [1, 2, 4, 8])

        # 2. Check rejection of out-of-bound daily hours
        with self.app.app_context():
            # 0.25 hours (below 0.5)
            is_valid, err = StudyPlannerService.validate_plan_parameters(
                goal="Academic Subjects",
                topics=["Python"],
                daily_hours=0.25,
                horizon_weeks=1,
            )
            self.assertFalse(is_valid)
            self.assertIn("between 0.5", err)

            # 7.0 hours (above 6.0)
            is_valid, err = StudyPlannerService.validate_plan_parameters(
                goal="Academic Subjects",
                topics=["Python"],
                daily_hours=7.0,
                horizon_weeks=1,
            )
            self.assertFalse(is_valid)
            self.assertIn("between 0.5", err)

            # Invalid horizon (e.g. 5 weeks)
            is_valid, err = StudyPlannerService.validate_plan_parameters(
                goal="Academic Subjects",
                topics=["Python"],
                daily_hours=2.0,
                horizon_weeks=5,
            )
            self.assertFalse(is_valid)
            self.assertIn("must be one of: 1, 2, 4, 8", err)

    def test_02_rest_day_modes_and_study_hours(self):
        """Verify rest days are not counted in planned study hours or completion."""
        with self.app.app_context():
            # 1 Week, weekends off: 5 study days, 2 rest days
            plan_5 = StudyPlannerService.create_plan_transactional(
                user_id=None,
                goal="Skill Development",
                topics=["Redis", "Docker"],
                daily_hours=2.0,
                horizon_weeks=1,
                study_preferences={"rest_days_mode": "weekends_off"},
            )
            self.assertEqual(plan_5["horizon_weeks"], 1)
            self.assertEqual(len(plan_5["sessions"]), 7)
            # Planned hours must be 5 study days * 2.0 hrs = 10.0 hrs (NOT 14.0 hrs)
            self.assertEqual(plan_5["total_hours"], 10.0)
            study_sessions = [s for s in plan_5["sessions"] if s["activity_type"] != "Rest"]
            rest_sessions = [s for s in plan_5["sessions"] if s["activity_type"] == "Rest"]
            self.assertEqual(len(study_sessions), 5)
            self.assertEqual(len(rest_sessions), 2)
            self.assertEqual(rest_sessions[0]["day_number"], 6)
            self.assertEqual(rest_sessions[1]["day_number"], 7)

            # 1 Week, daily study: 7 study days, 0 rest days
            plan_7 = StudyPlannerService.create_plan_transactional(
                user_id=None,
                goal="Skill Development",
                topics=["Redis", "Docker"],
                daily_hours=2.0,
                horizon_weeks=1,
                study_preferences={"rest_days_mode": "daily"},
            )
            self.assertEqual(plan_7["total_hours"], 14.0)
            study_7 = [s for s in plan_7["sessions"] if s["activity_type"] != "Rest"]
            self.assertEqual(len(study_7), 7)

            # 1 Week, one day off: 6 study days, 1 rest day
            plan_6 = StudyPlannerService.create_plan_transactional(
                user_id=None,
                goal="Skill Development",
                topics=["Redis", "Docker"],
                daily_hours=1.5,
                horizon_weeks=1,
                study_preferences={"rest_days_mode": "one_day_off"},
            )
            self.assertEqual(plan_6["total_hours"], 9.0)
            rest_6 = [s for s in plan_6["sessions"] if s["activity_type"] == "Rest"]
            self.assertEqual(len(rest_6), 1)
            self.assertEqual(rest_6[0]["day_number"], 7)

    def test_03_workload_feasibility_validation(self):
        """Verify that requesting more topics than available study days is rejected with 400."""
        with self.app.app_context():
            # 1 week with weekends off has 5 study days. Requesting 6 topics should fail.
            is_valid, err = StudyPlannerService.validate_plan_parameters(
                goal="Skill Development",
                topics=["T1", "T2", "T3", "T4", "T5", "T6"],
                daily_hours=2.0,
                horizon_weeks=1,
                study_preferences={"rest_days_mode": "weekends_off"},
            )
            self.assertFalse(is_valid)
            self.assertIn("Cannot schedule 6 distinct topics in 5 available study days", err)

    def test_04_ai_safety_and_malformed_json_fallback(self):
        """Confirm malformed AI output cannot corrupt the schedule or alter durations/dates."""
        with self.app.app_context():
            # Mock Gemini returning completely broken non-JSON string
            with patch("app.services.ai_service.ai_service.generate_study_plan_prompt", return_value="MALFORMED {{{{"):
                sessions, mode = StudyPlannerService.generate_plan_sessions(
                    goal="Interview Preparation",
                    topics=["Data Structures & Algorithms"],
                    daily_hours=1.5,
                    horizon_weeks=1,
                    study_preferences={"rest_days_mode": "weekends_off"},
                )
                # Must cleanly fall back to deterministic engine with zero crash
                self.assertEqual(mode, "deterministic_engine")
                self.assertEqual(len(sessions), 7)
                self.assertEqual(sessions[0]["duration_minutes"], 90)
                self.assertIn("algorithmic complexity", sessions[0]["session_objective"].lower())

            # Mock Gemini returning empty list
            with patch("app.services.ai_service.ai_service.generate_study_plan_prompt", return_value="[]"):
                sessions, mode = StudyPlannerService.generate_plan_sessions(
                    goal="Interview Preparation",
                    topics=["Redis"],
                    daily_hours=1.0,
                    horizon_weeks=1,
                )
                self.assertEqual(mode, "deterministic_engine")
                self.assertEqual(len(sessions), 7)
                self.assertEqual(sessions[0]["duration_minutes"], 60)

    def test_05_resource_hints_do_not_fabricate_urls(self):
        """Verify that offline catalog resource hints contain concepts, not fake URLs."""
        from app.services.study_service import TOPIC_CATALOG
        for topic, item in TOPIC_CATALOG.items():
            for hint in item["resources"]:
                self.assertNotIn("http://", hint.lower())
                self.assertNotIn("https://", hint.lower())
                self.assertNotIn("www.", hint.lower())

    def test_06_context_integrity_and_nonexistent_ids(self):
        """Verify context comes from real DB records and nonexistent IDs return 404."""
        # Nonexistent resume_id
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Interview Preparation",
            "topics": ["Python"],
            "daily_hours": 1.0,
            "horizon_weeks": 1,
            "context_source": "resume",
            "resume_id": 999999,
        })
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertIn("Resume ID 999999 was not found", data["message"])

        # Nonexistent skill_gap_id
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Skill Development",
            "topics": ["Python"],
            "daily_hours": 1.0,
            "horizon_weeks": 1,
            "context_source": "skill_gap",
            "skill_gap_id": 999999,
        })
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertIn("Skill Gap ID 999999 was not found", data["message"])

        # Nonexistent interview_session_id
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Interview Preparation",
            "topics": ["Python"],
            "daily_hours": 1.0,
            "horizon_weeks": 1,
            "context_source": "interview",
            "interview_session_id": 999999,
        })
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertIn("Interview session ID 999999 was not found", data["message"])

    def test_07_transactional_versioning_and_rollback(self):
        """Verify regeneration creates new version, archives old, and rolls back on failure."""
        with self.app.app_context():
            # Initial generation: version 1
            plan_v1 = StudyPlannerService.create_plan_transactional(
                user_id=None,
                goal="Academic Subjects",
                topics=["Operating Systems"],
                daily_hours=2.0,
                horizon_weeks=1,
            )
            v1_id = plan_v1["id"]
            self.assertEqual(plan_v1["version"], 1)
            self.assertTrue(plan_v1["is_active"])

            # Regenerate: version 2
            plan_v2 = StudyPlannerService.regenerate_plan_transactional(
                plan_id=v1_id,
                daily_hours=3.0,
                horizon_weeks=2,
            )
            v2_id = plan_v2["id"]
            self.assertEqual(plan_v2["version"], 2)
            self.assertEqual(plan_v2["parent_plan_id"], v1_id)
            self.assertTrue(plan_v2["is_active"])

            # Verify parent plan is now archived
            refetched_v1 = StudyPlannerService.get_plan_by_id(v1_id)
            self.assertFalse(refetched_v1["is_active"])
            # Sessions for v1 must still exist
            self.assertEqual(len(refetched_v1["sessions"]), 7)

            # Test rollback: invalid daily_hours on regeneration fails and leaves v2 untouched
            with self.assertRaises(ValueError):
                StudyPlannerService.regenerate_plan_transactional(
                    plan_id=v2_id,
                    daily_hours=10.0,  # Invalid! > 6.0
                )
            refetched_v2 = StudyPlannerService.get_plan_by_id(v2_id)
            self.assertTrue(refetched_v2["is_active"])

    def test_08_atomic_session_completion_and_progress_recalculation(self):
        """Verify marking session complete recalculates plan progress without counting rest days."""
        with self.app.app_context():
            plan = StudyPlannerService.create_plan_transactional(
                user_id=None,
                goal="Skill Development",
                topics=["PostgreSQL"],
                daily_hours=1.0,
                horizon_weeks=1,
                study_preferences={"rest_days_mode": "weekends_off"},
            )
            plan_id = plan["id"]
            sessions = plan["sessions"]
            study_sessions = [s for s in sessions if s["activity_type"] != "Rest"]
            first_study_session = study_sessions[0]

            # Toggle completed = True
            res = StudyPlannerService.toggle_session_completion(
                plan_id=plan_id,
                session_id=first_study_session["id"],
                is_completed=True,
            )
            self.assertTrue(res["session"]["is_completed"])
            self.assertIsNotNone(res["session"]["completed_at"])
            self.assertEqual(res["plan_completed_sessions"], 1)

            # Check refetched plan
            refetched = StudyPlannerService.get_plan_by_id(plan_id)
            self.assertEqual(refetched["completed_sessions"], 1)
            # 1 of 5 study sessions = 20.0%
            self.assertEqual(refetched["progress_percentage"], 20.0)

            # Toggle back to False
            res_uncheck = StudyPlannerService.toggle_session_completion(
                plan_id=plan_id,
                session_id=first_study_session["id"],
                is_completed=False,
            )
            self.assertFalse(res_uncheck["session"]["is_completed"])
            refetched_uncheck = StudyPlannerService.get_plan_by_id(plan_id)
            self.assertEqual(refetched_uncheck["completed_sessions"], 0)
            self.assertEqual(refetched_uncheck["progress_percentage"], 0.0)

    def test_09_all_six_api_endpoints(self):
        """Verify all 6 REST endpoints respond with correct status codes and JSON envelopes."""
        # 1. GET /api/study-planner/context
        res = self.client.get("/api/study-planner/context")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("skill_gap", data["data"])
        self.assertIn("interview", data["data"])
        self.assertIn("resume", data["data"])

        # 2. POST /api/study-planner/generate
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Skill Development",
            "topics": ["Docker", "Kubernetes"],
            "daily_hours": 1.5,
            "horizon_weeks": 2,
            "context_source": "custom",
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        plan_id = data["data"]["id"]

        # 3. GET /api/study-planner/<plan_id>
        res = self.client.get(f"/api/study-planner/{plan_id}")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["id"], plan_id)
        session_id = data["data"]["sessions"][0]["id"]

        # 4. PATCH /api/study-planner/<plan_id>/sessions/<session_id>
        res = self.client.patch(
            f"/api/study-planner/{plan_id}/sessions/{session_id}",
            json={"is_completed": True},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertTrue(data["data"]["session"]["is_completed"])

        # 5. POST /api/study-planner/<plan_id>/regenerate
        res = self.client.post(f"/api/study-planner/{plan_id}/regenerate", json={
            "daily_hours": 2.0,
            "horizon_weeks": 4,
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["version"], 2)
        self.assertEqual(data["data"]["parent_plan_id"], plan_id)

        # 6. GET /api/study-planner/history
        res = self.client.get("/api/study-planner/history?limit=10")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["data"], list)
        self.assertGreaterEqual(len(data["data"]), 2)


if __name__ == "__main__":
    unittest.main()

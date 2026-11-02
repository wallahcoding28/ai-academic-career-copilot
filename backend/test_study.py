"""
Automated Test Suite for Stage 5: AI Study Planner
Tests scheduling algorithms, mathematical constraints, context integration,
atomic session completion, transactional versioned regeneration, and REST endpoints.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.study_service import StudyPlannerService


class StudyPlannerTestCase(unittest.TestCase):
    def setUp(self):
        os.environ["FLASK_ENV"] = "testing"
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def test_01_study_context_endpoint(self):
        """Verify GET /api/study-planner/context returns valid schema without error."""
        res = self.client.get("/api/study-planner/context")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("skill_gap", data["data"])
        self.assertIn("interview", data["data"])
        self.assertIn("resume", data["data"])

    def test_02_validation_invalid_daily_hours(self):
        """Reject hours outside [0.5, 6.0]."""
        payload_low = {
            "goal": "Skill Development",
            "topics": ["Python", "SQL"],
            "daily_hours": 0.2,
            "horizon_weeks": 2,
        }
        res = self.client.post("/api/study-planner/generate", json=payload_low)
        self.assertEqual(res.status_code, 400)

        payload_high = {
            "goal": "Skill Development",
            "topics": ["Python", "SQL"],
            "daily_hours": 7.5,
            "horizon_weeks": 2,
        }
        res = self.client.post("/api/study-planner/generate", json=payload_high)
        self.assertEqual(res.status_code, 400)

    def test_03_validation_invalid_horizon(self):
        """Reject horizon not in [1, 2, 4, 8]."""
        payload = {
            "goal": "Skill Development",
            "topics": ["Python", "SQL"],
            "daily_hours": 1.5,
            "horizon_weeks": 3,
        }
        res = self.client.post("/api/study-planner/generate", json=payload)
        self.assertEqual(res.status_code, 400)

    def test_04_validation_impossible_workload(self):
        """Reject planning if distinct topics exceed available study days."""
        # 1 week with weekends_off has 5 study days. 8 topics cannot fit.
        payload = {
            "goal": "Skill Development",
            "topics": ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"],
            "daily_hours": 1.0,
            "horizon_weeks": 1,
            "study_preferences": {"rest_days_mode": "weekends_off"},
        }
        res = self.client.post("/api/study-planner/generate", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot schedule", res.get_json()["message"])

    def test_05_successful_deterministic_generation(self):
        """Verify successful generation of a 2-week plan with offline deterministic engine."""
        payload = {
            "goal": "Interview Preparation",
            "topics": ["Data Structures & Algorithms", "System Design", "Redis", "Docker"],
            "daily_hours": 1.5,
            "horizon_weeks": 2,
            "study_preferences": {
                "pacing": "balanced",
                "rest_days_mode": "weekends_off",
                "include_revision": True,
            },
        }
        res = self.client.post("/api/study-planner/generate", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        plan = data["data"]

        # 2 weeks * 7 days = 14 total sessions (10 study, 4 rest)
        self.assertEqual(plan["horizon_weeks"], 2)
        self.assertEqual(plan["daily_hours"], 1.5)
        self.assertEqual(len(plan["sessions"]), 14)

        # Check session durations: 1.5h = 90 mins strictly
        for s in plan["sessions"]:
            self.assertEqual(s["duration_minutes"], 90)
            self.assertIn("session_objective", s)
            self.assertTrue(len(s["session_objective"]) > 0)
            self.assertIn("resource_hints", s)
            self.assertTrue(len(s["resource_hints"]) >= 2)

    def test_06_get_single_plan(self):
        """Retrieve single plan by ID and verify sorted sequence."""
        # Create a 1-week plan
        payload = {
            "goal": "Academic Subjects",
            "topics": ["Operating Systems", "Computer Networks"],
            "daily_hours": 2.0,
            "horizon_weeks": 1,
        }
        create_res = self.client.post("/api/study-planner/generate", json=payload)
        self.assertEqual(create_res.status_code, 201)
        plan_id = create_res.get_json()["data"]["id"]

        get_res = self.client.get(f"/api/study-planner/{plan_id}")
        self.assertEqual(get_res.status_code, 200)
        plan = get_res.get_json()["data"]
        self.assertEqual(plan["id"], plan_id)
        self.assertEqual(plan["version"], 1)
        self.assertTrue(plan["is_active"])

        # Check sequence order is strictly 1 to 7
        seqs = [s["sequence_order"] for s in plan["sessions"]]
        self.assertEqual(seqs, list(range(1, 8)))

    def test_07_atomic_session_completion_toggle(self):
        """Toggle session completion and verify progress updates atomically."""
        payload = {
            "goal": "Skill Development",
            "topics": ["PostgreSQL", "Python"],
            "daily_hours": 1.0,
            "horizon_weeks": 1,
        }
        create_res = self.client.post("/api/study-planner/generate", json=payload)
        plan_id = create_res.get_json()["data"]["id"]
        sessions = create_res.get_json()["data"]["sessions"]
        first_study_session = next(s for s in sessions if s["activity_type"] != "Rest")
        sess_id = first_study_session["id"]

        # Mark complete
        patch_res = self.client.patch(
            f"/api/study-planner/{plan_id}/sessions/{sess_id}",
            json={"is_completed": True},
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertTrue(patch_res.get_json()["data"]["session"]["is_completed"])
        self.assertEqual(patch_res.get_json()["data"]["plan_completed_sessions"], 1)

        # Verify through GET /plan_id
        plan_res = self.client.get(f"/api/study-planner/{plan_id}")
        plan_data = plan_res.get_json()["data"]
        self.assertEqual(plan_data["completed_sessions"], 1)
        self.assertGreater(plan_data["progress_percentage"], 0.0)

        # Toggle back to incomplete
        unpatch_res = self.client.patch(
            f"/api/study-planner/{plan_id}/sessions/{sess_id}",
            json={"is_completed": False},
        )
        self.assertEqual(unpatch_res.status_code, 200)
        self.assertFalse(unpatch_res.get_json()["data"]["session"]["is_completed"])
        self.assertEqual(unpatch_res.get_json()["data"]["plan_completed_sessions"], 0)

    def test_08_transactional_versioned_regeneration(self):
        """Verify plan regeneration creates a new version, archives parent, and preserves history."""
        payload = {
            "goal": "Career Preparation",
            "topics": ["React", "TypeScript", "CI/CD"],
            "daily_hours": 1.0,
            "horizon_weeks": 2,
        }
        res1 = self.client.post("/api/study-planner/generate", json=payload)
        self.assertEqual(res1.status_code, 201)
        plan1_id = res1.get_json()["data"]["id"]

        # Complete one session in plan 1
        s1 = next(s for s in res1.get_json()["data"]["sessions"] if s["activity_type"] != "Rest")
        self.client.patch(
            f"/api/study-planner/{plan1_id}/sessions/{s1['id']}",
            json={"is_completed": True},
        )

        # Regenerate with adjusted hours: 2.0 hrs/day
        regen_res = self.client.post(
            f"/api/study-planner/{plan1_id}/regenerate",
            json={"daily_hours": 2.0},
        )
        self.assertEqual(regen_res.status_code, 201)
        plan2 = regen_res.get_json()["data"]
        plan2_id = plan2["id"]

        # Check versioning and lineage
        self.assertNotEqual(plan1_id, plan2_id)
        self.assertEqual(plan2["parent_plan_id"], plan1_id)
        self.assertEqual(plan2["version"], 2)
        self.assertEqual(plan2["daily_hours"], 2.0)
        self.assertTrue(plan2["is_active"])

        # Check parent plan 1 is now archived
        parent_res = self.client.get(f"/api/study-planner/{plan1_id}")
        parent_plan = parent_res.get_json()["data"]
        self.assertFalse(parent_plan["is_active"])
        # Sessions in parent plan 1 remain intact
        self.assertEqual(len(parent_plan["sessions"]), 14)
        parent_completed = sum(1 for s in parent_plan["sessions"] if s["is_completed"])
        self.assertEqual(parent_completed, 1)

    def test_09_study_history_endpoint(self):
        """Verify GET /api/study-planner/history lists all plans with completion stats."""
        res = self.client.get("/api/study-planner/history")
        self.assertEqual(res.status_code, 200)
        history = res.get_json()["data"]
        self.assertTrue(isinstance(history, list))
        self.assertGreaterEqual(len(history), 1)
        latest = history[0]
        self.assertIn("total_study_sessions", latest)
        self.assertIn("completed_study_sessions", latest)
        self.assertIn("progress_percentage", latest)
        self.assertIn("is_active", latest)

    def test_10_regeneration_nonexistent_plan_returns_404(self):
        """Verify POST /api/study-planner/<plan_id>/regenerate returns 404 for nonexistent plan_id."""
        res = self.client.post("/api/study-planner/9999999/regenerate", json={"daily_hours": 2.0})
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertIn("not found", data["message"].lower())

    def test_11_regeneration_invalid_parameters_returns_400(self):
        """Verify POST /api/study-planner/<plan_id>/regenerate returns 400 for invalid parameter inputs."""
        # 1. Create a valid plan first
        res = self.client.post("/api/study-planner/generate", json={
            "goal": "Academic Subjects",
            "topics": ["Python", "Data Structures & Algorithms"],
            "daily_hours": 1.0,
            "horizon_weeks": 2,
        })
        self.assertEqual(res.status_code, 201)
        plan_id = res.get_json()["data"]["id"]

        # 2. Attempt regeneration with invalid daily hours (> 6.0)
        res_bad_hours = self.client.post(f"/api/study-planner/{plan_id}/regenerate", json={
            "daily_hours": 10.0,
        })
        self.assertEqual(res_bad_hours.status_code, 400)
        self.assertFalse(res_bad_hours.get_json()["success"])

        # 3. Attempt regeneration with non-numeric daily hours
        res_bad_type = self.client.post(f"/api/study-planner/{plan_id}/regenerate", json={
            "daily_hours": "invalid_number",
        })
        self.assertEqual(res_bad_type.status_code, 400)
        self.assertFalse(res_bad_type.get_json()["success"])


if __name__ == "__main__":
    unittest.main()

"""
Stage 5 Quality Control & Regression Test Suite
Validates AI Study Planner API, transactional versioning, scheduling limits,
and backward compatibility with Stages 1-4.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app


class Stage5QCTestCase(unittest.TestCase):
    def setUp(self):
        os.environ["FLASK_ENV"] = "testing"
        self.app = create_app("testing")
        self.client = self.app.test_client()

    def test_01_health_check_stage5_active(self):
        """Verify health check reports Stage 5 active."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertEqual(data["modules"]["study_planner"], "active_stage_5")
        self.assertEqual(data["modules"]["interview_generator"], "active_stage_4")
        self.assertEqual(data["modules"]["skill_gap_analyzer"], "active_stage_3")
        self.assertEqual(data["modules"]["resume_analyzer"], "active_stage_2")
        self.assertIn("Stage 5", data["stage"])

    def test_02_daily_hours_boundary_conditions(self):
        """Test exact boundary conditions for daily hours: 0.5 (valid), 6.0 (valid), 0.4 (invalid), 6.1 (invalid)."""
        base_payload = {
            "goal": "Skill Development",
            "topics": ["Python", "SQL"],
            "horizon_weeks": 2,
        }

        # 0.5 hours (30 min) -> Valid
        p05 = dict(base_payload, daily_hours=0.5)
        res05 = self.client.post("/api/study-planner/generate", json=p05)
        self.assertEqual(res05.status_code, 201)
        self.assertEqual(res05.get_json()["data"]["sessions"][0]["duration_minutes"], 30)

        # 6.0 hours -> Valid
        p60 = dict(base_payload, daily_hours=6.0)
        res60 = self.client.post("/api/study-planner/generate", json=p60)
        self.assertEqual(res60.status_code, 201)
        self.assertEqual(res60.get_json()["data"]["sessions"][0]["duration_minutes"], 360)

        # 0.4 hours -> Invalid
        p04 = dict(base_payload, daily_hours=0.4)
        res04 = self.client.post("/api/study-planner/generate", json=p04)
        self.assertEqual(res04.status_code, 400)

        # 6.1 hours -> Invalid
        p61 = dict(base_payload, daily_hours=6.1)
        res61 = self.client.post("/api/study-planner/generate", json=p61)
        self.assertEqual(res61.status_code, 400)

    def test_03_all_supported_horizons(self):
        """Verify generation across all 4 supported horizons: 1, 2, 4, 8 weeks."""
        for horizon in [1, 2, 4, 8]:
            payload = {
                "goal": "Mixed Goals",
                "topics": ["Data Structures & Algorithms", "System Design"],
                "daily_hours": 1.0,
                "horizon_weeks": horizon,
            }
            res = self.client.post("/api/study-planner/generate", json=payload)
            self.assertEqual(res.status_code, 201, f"Failed for horizon {horizon}")
            data = res.get_json()["data"]
            self.assertEqual(data["horizon_weeks"], horizon)
            self.assertEqual(len(data["sessions"]), horizon * 7)

    def test_04_session_rest_days_pacing(self):
        """Verify that weekends_off produces 5 study sessions and 2 rest days per week."""
        payload = {
            "goal": "Interview Preparation",
            "topics": ["Redis", "Docker", "PostgreSQL"],
            "daily_hours": 1.5,
            "horizon_weeks": 1,
            "study_preferences": {"rest_days_mode": "weekends_off"},
        }
        res = self.client.post("/api/study-planner/generate", json=payload)
        self.assertEqual(res.status_code, 201)
        sessions = res.get_json()["data"]["sessions"]
        self.assertEqual(len(sessions), 7)
        study_sessions = [s for s in sessions if s["activity_type"] != "Rest"]
        rest_sessions = [s for s in sessions if s["activity_type"] == "Rest"]
        self.assertEqual(len(study_sessions), 5)
        self.assertEqual(len(rest_sessions), 2)

    def test_05_context_integration_flow(self):
        """Verify context resolution from Skill Gap and Resume tables."""
        # 1. Fetch available context
        ctx_res = self.client.get("/api/study-planner/context")
        self.assertEqual(ctx_res.status_code, 200)
        ctx = ctx_res.get_json()["data"]

        # If a skill gap evaluation exists, verify generation with context_source = 'skill_gap'
        if ctx.get("skill_gap"):
            sg_id = ctx["skill_gap"]["id"]
            payload = {
                "goal": "Interview Preparation",
                "topics": ["Redis", "Docker", "System Design"],
                "daily_hours": 1.0,
                "horizon_weeks": 2,
                "context_source": "skill_gap",
                "skill_gap_id": sg_id,
            }
            res = self.client.post("/api/study-planner/generate", json=payload)
            self.assertEqual(res.status_code, 201)
            plan = res.get_json()["data"]
            self.assertEqual(plan["context_source"], "skill_gap")
            self.assertEqual(plan["skill_gap_id"], sg_id)


if __name__ == "__main__":
    unittest.main()

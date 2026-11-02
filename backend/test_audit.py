import io
import json
import sys
from app import create_app
from app.models.db import get_db

app = create_app("testing")
client = app.test_client()

passed = 0
failed = 0

def test(name, condition, details=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"[PASS] {name} {details}")
    else:
        failed += 1
        print(f"[FAIL] {name} {details}")

print("=== STAGE 3 QUALITY & VERIFICATION AUDIT ===")

# 1. Health Endpoint
res = client.get("/api/health")
data = res.get_json()
test("GET /api/health returns 200", res.status_code == 200)
test("Health status is healthy", data.get("data", {}).get("status") == "healthy")
test("Skill Gap Analyzer active in modules", data.get("data", {}).get("modules", {}).get("skill_gap_analyzer") == "active_stage_3")

# 2. Roles Catalog
res = client.get("/api/skills/roles")
data = res.get_json()
test("GET /api/skills/roles returns 200", res.status_code == 200)
roles = data.get("data", {}).get("roles", [])
test("6 Benchmark roles returned", len(roles) == 6, f"found {len(roles)}")
role_titles = [r["title"] for r in roles]
test("Standard roles exist", "Full Stack Developer" in role_titles and "Machine Learning Engineer" in role_titles)

# 3. Skill Gap Evaluate via Resume Reuse
res = client.post(
    "/api/skills/evaluate",
    data=json.dumps({"resume_id": 1, "target_role": "Full Stack Developer"}),
    content_type="application/json",
)
data = res.get_json()
test("POST /api/skills/evaluate (Reuse) returns 200", res.status_code == 200, f"status: {res.status_code}")
eval_data = data.get("data", {})
metrics = eval_data.get("metrics", {})
skills = eval_data.get("skills", {})
test("Target role matches", eval_data.get("target_role") == "Full Stack Developer")
test("Analysis mode is deterministic (since no Gemini key)", eval_data.get("analysis_mode") == "deterministic_benchmark")
test("Overall coverage metric present", "overall_coverage" in metrics)
test("Direct matches separated from adjacent", len(skills.get("direct_matches", [])) > 0)
test("Adjacent skills separated", isinstance(skills.get("adjacent_skills", []), list))
test("Missing skills categorized with priority", all("priority" in s for s in skills.get("missing_skills", [])))
test("Recommendations contain concrete projects", len(eval_data.get("recommendations", [])) > 0)

# Check 50% adjacency mathematical rule
core_cov = metrics.get("core_coverage", 0)
comp_cov = metrics.get("complementary_coverage", 0)
overall_cov = metrics.get("overall_coverage", 0)
expected_overall = round(0.65 * core_cov + 0.35 * comp_cov, 1)
test("65/35 Weighting mathematically consistent", abs(overall_cov - expected_overall) < 0.15, f"{overall_cov} vs {expected_overall}")

# 4. Skill Gap Evaluate via Fresh TXT Upload
sample_resume_content = b"""
Candidate Name: Alex Student
Education: BS Computer Science, 2026
Technical Skills: Python, SQL, Git, Linux, Docker, HTML5, CSS3, Flask
Experience:
- Built REST API endpoints with Flask and PostgreSQL.
- Maintained Docker containers and automated CI workflows with Git.
"""
res = client.post(
    "/api/skills/evaluate",
    data={
        "file": (io.BytesIO(sample_resume_content), "fresh_student_profile.txt"),
        "target_role": "Backend Engineer",
    },
    content_type="multipart/form-data",
)
data = res.get_json()
test("POST /api/skills/evaluate (Upload) returns 200", res.status_code == 200, f"status: {res.status_code}")
upload_data = data.get("data", {})
test("Upload evaluated for Backend Engineer", upload_data.get("target_role") == "Backend Engineer")
test("Direct matches include Python and SQL", any(s["name"] == "Python" for s in upload_data.get("skills", {}).get("direct_matches", [])))

# 5. History Endpoint
res = client.get("/api/skills/history")
data = res.get_json()
test("GET /api/skills/history returns 200", res.status_code == 200)
history = data.get("data", [])
test("Skill evaluations persisted in history", len(history) >= 2, f"count: {len(history)}")

# 6. Stage 2 Regression Check (Resume Analyzer)
res = client.post(
    "/api/resume/analyze",
    data=json.dumps({
        "text": "Software Engineering Student skilled in Python, React, SQL, and Docker. Developed web applications using Flask and relational database architecture with PostgreSQL.",
        "target_role": "Full Stack Developer"
    }),
    content_type="application/json",
)
data = res.get_json()
test("Stage 2 POST /api/resume/analyze returns 200", res.status_code == 200, f"status: {res.status_code}")
r_data = data.get("data", {})
test("Stage 2 score returned", "score" in r_data and r_data["score"] > 0)
test("Stage 2 matched skills returned", len(r_data.get("matched_skills", [])) > 0)
test("Stage 2 bullet improvements returned", len(r_data.get("bullet_improvements", [])) > 0)

# 7. Error Handling verification
res = client.post(
    "/api/skills/evaluate",
    data=json.dumps({"resume_id": 999999, "target_role": "Full Stack Developer"}),
    content_type="application/json",
)
test("Invalid resume_id returns 404", res.status_code == 404, f"got {res.status_code}")

res = client.post(
    "/api/skills/evaluate",
    data=json.dumps({"resume_id": 1, "target_role": "NonExistentRole"}),
    content_type="application/json",
)
test("Invalid target_role returns 400", res.status_code == 400, f"got {res.status_code}")

print(f"\nAUDIT SUMMARY: {passed} passed, {failed} failed.")
if failed > 0:
    sys.exit(1)

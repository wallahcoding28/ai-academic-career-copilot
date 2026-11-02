"""
Final Verification Script
Runs all 8 backend test suites against isolated test database,
checks dev DB counts, FKs, and integrity before and after.
"""

import os
import sqlite3
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV_DB = os.path.join(BASE_DIR, "database", "copilot.db")

def get_dev_status():
    conn = sqlite3.connect(DEV_DB)
    c = conn.cursor()
    c.execute("PRAGMA integrity_check;")
    integrity = c.fetchone()[0]
    c.execute("PRAGMA foreign_key_check;")
    fk = c.fetchall()
    tables = ["users", "resumes", "skill_evaluations", "interview_sessions", "study_plans", "study_sessions"]
    counts = {}
    for t in tables:
        c.execute(f"SELECT count(*) FROM {t};")
        counts[t] = c.fetchone()[0]
    conn.close()
    return {"integrity": integrity, "fk_violations": len(fk), "counts": counts}

if __name__ == "__main__":
    status_before = get_dev_status()
    print("=== FINAL DEV DB STATUS BEFORE TESTS ===")
    print("Integrity:", status_before["integrity"])
    print("FK violations:", status_before["fk_violations"])
    print("Counts:", status_before["counts"])

    suites = [
        ("test_database_hardening.py", [sys.executable, os.path.join(BASE_DIR, "backend", "test_database_hardening.py")]),
        ("test_e2e_user_workflow.py", [sys.executable, os.path.join(BASE_DIR, "backend", "test_e2e_user_workflow.py")]),
        ("test_audit.py", [sys.executable, os.path.join(BASE_DIR, "backend", "test_audit.py")]),
        ("test_interview.py", [sys.executable, "-m", "unittest", os.path.join(BASE_DIR, "backend", "test_interview.py")]),
        ("test_qc_stage4.py", [sys.executable, "-m", "unittest", os.path.join(BASE_DIR, "backend", "test_qc_stage4.py")]),
        ("test_study.py", [sys.executable, "-m", "unittest", os.path.join(BASE_DIR, "backend", "test_study.py")]),
        ("test_qc_stage5.py", [sys.executable, "-m", "unittest", os.path.join(BASE_DIR, "backend", "test_qc_stage5.py")]),
        ("test_qc_final_stage5.py", [sys.executable, "-m", "unittest", os.path.join(BASE_DIR, "backend", "test_qc_final_stage5.py")]),
        ("test_resume_persistence.py", [sys.executable, os.path.join(BASE_DIR, "backend", "test_resume_persistence.py")]),
        ("test_auth_and_isolation.py", [sys.executable, os.path.join(BASE_DIR, "backend", "test_auth_and_isolation.py")]),
    ]

    all_passed = True
    for name, cmd in suites:
        res = subprocess.run(cmd, capture_output=True, text=True)
        out = (res.stdout + "\n" + res.stderr).strip()
        summary_lines = [l.strip() for l in out.splitlines() if "Ran " in l or "AUDIT SUMMARY" in l or "OK" in l or "FAILED" in l]
        print(f"[{'PASS' if res.returncode == 0 else 'FAIL'}] {name} (exit {res.returncode}): {' | '.join(summary_lines)}")
        if res.returncode != 0:
            all_passed = False
            print("  Error output:", out)

    status_after = get_dev_status()
    print("\n=== FINAL DEV DB STATUS AFTER TESTS ===")
    print("Integrity:", status_after["integrity"])
    print("FK violations:", status_after["fk_violations"])
    print("Counts:", status_after["counts"])

    assert status_before == status_after, "Development database was modified during tests!"
    assert all_passed, "One or more test suites failed!"
    print("\nFINAL BACKEND VERIFICATION RESULT: 100% PASSED, 0 MUTATIONS TO DEV DB")


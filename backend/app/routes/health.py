import os
import sqlite3
import time
from flask import Blueprint, current_app
from app.utils.errors import success_response, error_response

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint for frontend connectivity and system readiness.
    Verifies API server status and SQLite database connection.
    """
    db_path = current_app.config.get("DATABASE_PATH")
    db_status = "unreachable"
    db_details = {}

    try:
        if db_path and os.path.exists(db_path):
            conn = sqlite3.connect(db_path, timeout=3)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall() if not row[0].startswith("sqlite_")]
            conn.close()
            db_status = "connected"
            db_details = {
                "tables_count": len(tables),
                "tables": tables
            }
        else:
            db_status = "database_file_not_found"
    except Exception as e:
        db_status = f"error: {str(e)}"

    payload = {
        "status": "healthy",
        "service": "AI Academic & Career Copilot API",
        "stage": "Stage 5 (AI Study Planner Active)",
        "version": current_app.config.get("API_VERSION", "1.0.0-stage5"),
        "timestamp": int(time.time()),
        "database": {
            "status": db_status,
            "path": os.path.basename(db_path) if db_path else None,
            "details": db_details
        },
        "modules": {
            "resume_analyzer": "active_stage_2",
            "skill_gap_analyzer": "active_stage_3",
            "interview_generator": "active_stage_4",
            "study_planner": "active_stage_5",
            "history_archive": "active_stage_5"
        }
    }

    return success_response(data=payload, message="API service is active and responsive")

"""
Interview Blueprint Routes
Stage 4: Endpoints for role benchmarks, question generation, and historical practice sets.
"""

from flask import Blueprint, request
from app.services.interview_service import InterviewService
from app.utils.errors import success_response, error_response
from app.utils.auth import get_current_user_id

interview_bp = Blueprint("interview", __name__, url_prefix="/api/interview")


@interview_bp.route("/roles", methods=["GET"])
def get_interview_roles():
    """Returns available target roles for interview calibration."""
    roles = InterviewService.get_available_roles()
    return success_response(
        data={"roles": roles},
        message=f"Retrieved {len(roles)} interview benchmark roles",
        status_code=200,
    )


@interview_bp.route("/generate", methods=["POST"])
def generate_interview_questions():
    """
    Synthesizes role-calibrated interview practice questions.
    Accepts JSON payload:
    {
        "target_role": "Full Stack Developer",
        "difficulty": "Intermediate",
        "question_focus": "Mixed / Balanced",
        "selected_skills": ["React", "Python"],
        "question_count": 5,
        "context_source": "none" | "resume" | "skill_gap",
        "resume_id": 1,
        "skill_gap_id": 2
    }
    """
    if not request.is_json:
        return error_response(
            message="Request payload must be application/json.",
            status_code=400,
        )

    payload = request.get_json() or {}

    target_role = payload.get("target_role", "Full Stack Developer")
    if not isinstance(target_role, str) or not target_role.strip():
        return error_response(message="Invalid or missing target_role.", status_code=400)
    target_role = target_role.strip()

    difficulty = payload.get("difficulty", "Intermediate")
    if not isinstance(difficulty, str) or not difficulty.strip():
        return error_response(message="Invalid or missing difficulty.", status_code=400)
    difficulty = difficulty.strip()

    question_focus = payload.get("question_focus", "Mixed / Balanced")
    if not isinstance(question_focus, str) or not question_focus.strip():
        return error_response(message="Invalid or missing question_focus.", status_code=400)
    question_focus = question_focus.strip()

    selected_skills = payload.get("selected_skills", [])
    if not isinstance(selected_skills, list):
        return error_response(message="selected_skills must be an array of strings.", status_code=400)

    try:
        question_count = int(payload.get("question_count", 5))
    except (ValueError, TypeError):
        return error_response(message="question_count must be an integer.", status_code=400)

    context_source = payload.get("context_source", "none")
    if not isinstance(context_source, str) or not context_source.strip():
        context_source = "none"
    context_source = context_source.strip()

    resume_id = payload.get("resume_id")
    if resume_id is not None:
        try:
            resume_id = int(resume_id)
        except (ValueError, TypeError):
            return error_response(message="Invalid resume_id format.", status_code=400)

    skill_gap_id = payload.get("skill_gap_id")
    if skill_gap_id is not None:
        try:
            skill_gap_id = int(skill_gap_id)
        except (ValueError, TypeError):
            return error_response(message="Invalid skill_gap_id format.", status_code=400)

    try:
        user_id = get_current_user_id()
        session = InterviewService.generate_interview_session(
            target_role=target_role,
            difficulty=difficulty,
            question_focus=question_focus,
            selected_skills=selected_skills,
            question_count=question_count,
            context_source=context_source,
            resume_id=resume_id,
            skill_gap_id=skill_gap_id,
            user_id=user_id,
        )
        return success_response(
            data=session,
            message="Interview questions successfully generated and calibrated.",
            status_code=200,
        )
    except ValueError as ve:
        err_msg = str(ve)
        status_code = 404 if "not found" in err_msg.lower() else 400
        return error_response(message=err_msg, status_code=status_code)
    except Exception as e:
        return error_response(
            message=f"Interview generation engine error: {str(e)}",
            status_code=500,
        )


@interview_bp.route("/history", methods=["GET"])
def get_interview_history():
    """Retrieves recent interview practice sessions from SQLite."""
    try:
        limit = int(request.args.get("limit", 10))
        user_id = get_current_user_id()
        history = InterviewService.get_interview_history(limit=min(limit, 50), user_id=user_id)
        return success_response(
            data=history,
            message=f"Retrieved {len(history)} interview sessions",
            status_code=200,
        )
    except Exception as e:
        return error_response(
            message=f"Failed to fetch interview history: {str(e)}",
            status_code=500,
        )

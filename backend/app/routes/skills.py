"""
Skill Gap Blueprint Routes
Stage 3: Endpoints for benchmark catalog, skill gap evaluation, and historical retrieval.
"""

from flask import Blueprint, request
from app.services.skill_service import SkillService
from app.utils.errors import success_response, error_response
from app.utils.auth import get_current_user_id

skills_bp = Blueprint("skills", __name__, url_prefix="/api/skills")

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


@skills_bp.route("/roles", methods=["GET"])
def get_roles():
    """Returns available target role benchmarks and competency profiles."""
    try:
        roles = SkillService.get_available_roles()
        return success_response(
            data={"roles": roles},
            message="Role benchmarks retrieved.",
            status_code=200,
        )
    except Exception as e:
        return error_response(
            message=f"Failed to fetch role benchmarks: {str(e)}",
            status_code=500,
        )


@skills_bp.route("/evaluate", methods=["POST"])
def evaluate_skill_gap():
    """
    Evaluates candidate profile against selected target role benchmark.
    Supports:
    1. Reuse mode (JSON): {"target_role": "Full Stack Developer", "resume_id": 1}
    2. Upload mode (multipart/form-data): file + target_role
    """
    target_role = "Full Stack Developer"
    resume_id = None
    file_bytes = None
    filename = None

    if request.is_json:
        payload = request.get_json() or {}
        target_role = payload.get("target_role", "Full Stack Developer").strip() or "Full Stack Developer"
        resume_id_raw = payload.get("resume_id")
        if resume_id_raw is not None:
            try:
                resume_id = int(resume_id_raw)
            except (ValueError, TypeError):
                return error_response(message="Invalid resume_id provided.", status_code=400)
        else:
            return error_response(
                message="Please select an analyzed resume or upload a new resume file.",
                status_code=400,
            )

    elif "file" in request.files:
        uploaded_file = request.files["file"]
        target_role = request.form.get("target_role", "Full Stack Developer").strip() or "Full Stack Developer"

        if not uploaded_file.filename:
            return error_response(message="No file selected for upload.", status_code=400)

        filename = uploaded_file.filename
        file_bytes = uploaded_file.read()
        file_size = len(file_bytes)

        if file_size > MAX_FILE_SIZE_BYTES:
            return error_response(
                message=f"File size ({file_size // 1024} KB) exceeds the 5MB maximum limit.",
                status_code=400,
            )

    else:
        return error_response(
            message="Please provide a JSON payload with 'resume_id' or upload a resume file.",
            status_code=400,
        )

    try:
        user_id = get_current_user_id()
        result = SkillService.evaluate_skill_gap(
            target_role=target_role,
            resume_id=resume_id,
            file_bytes=file_bytes,
            filename=filename,
            user_id=user_id,
        )
        return success_response(
            data=result,
            message="Skill gap evaluation complete.",
            status_code=200,
        )
    except ValueError as ve:
        err_msg = str(ve)
        status = 404 if "not found" in err_msg.lower() else 400
        return error_response(message=err_msg, status_code=status)
    except Exception as e:
        return error_response(
            message=f"Evaluation engine error: {str(e)}",
            status_code=500,
        )


@skills_bp.route("/history", methods=["GET"])
def skill_history():
    """Retrieves recent skill gap evaluations from SQLite."""
    try:
        limit = int(request.args.get("limit", 10))
        user_id = get_current_user_id()
        history = SkillService.get_skill_history(limit=min(limit, 50), user_id=user_id)
        return success_response(
            data=history,
            message="Skill gap evaluation history retrieved.",
            status_code=200,
        )
    except Exception as e:
        return error_response(
            message=f"Failed to fetch skill history: {str(e)}",
            status_code=500,
        )


@skills_bp.route("/evaluation-by-resume/<int:resume_id>", methods=["GET"])
def get_evaluation_by_resume(resume_id: int):
    """Retrieves the latest skill gap evaluation for a specific resume_id."""
    try:
        user_id = get_current_user_id()
        evaluation = SkillService.get_evaluation_by_resume(resume_id, user_id=user_id)
        return success_response(
            data=evaluation,
            message="Prior skill evaluation retrieved." if evaluation else "No prior evaluation found for this resume.",
            status_code=200,
        )
    except Exception as e:
        return error_response(
            message=f"Failed to fetch evaluation for resume {resume_id}: {str(e)}",
            status_code=500,
        )

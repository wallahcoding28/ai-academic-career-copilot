"""
Resume Blueprint Routes
Stage 2: Endpoints for document upload, text parsing, AI analysis, and historical retrieval.
"""

from flask import Blueprint, request
from app.services.resume_service import ResumeService
from app.utils.auth import get_current_user_id
from app.utils.errors import success_response, error_response

resume_bp = Blueprint("resume", __name__, url_prefix="/api/resume")

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


@resume_bp.route("/analyze", methods=["POST"])
def analyze_resume():
    """
    Accepts a resume document upload (PDF, DOCX, or TXT) along with target_role.
    Parses content, computes diagnostic feedback, persists to SQLite, and returns structured audit.
    """
    target_role = request.form.get("target_role", "Full Stack Developer").strip()
    if not target_role:
        target_role = "Full Stack Developer"

    # Support file upload or direct text payload
    if "file" in request.files:
        uploaded_file = request.files["file"]
        if not uploaded_file.filename:
            return error_response(message="No file selected for upload.", status_code=400)

        filename = uploaded_file.filename
        file_bytes = uploaded_file.read()
        file_size = len(file_bytes)

        if file_size > MAX_FILE_SIZE_BYTES:
            return error_response(
                message=f"File size ({file_size // 1024} KB) exceeds the 5MB maximum limit.",
                status_code=400
            )

        try:
            resume_text = ResumeService.parse_document(file_bytes, filename)
        except ValueError as ve:
            return error_response(message=str(ve), status_code=400)
        except Exception as e:
            return error_response(message=f"Error reading document: {str(e)}", status_code=500)

    elif request.is_json and request.json.get("text"):
        resume_text = request.json["text"].strip()
        filename = request.json.get("filename", "manual_input.txt")
        file_size = len(resume_text.encode("utf-8"))
        if len(resume_text) < 50:
            return error_response(message="Resume text too short for analysis.", status_code=400)
    else:
        return error_response(
            message="Please provide a resume file (multipart/form-data) or JSON text payload.",
            status_code=400
        )

    user_id = get_current_user_id()
    try:
        result = ResumeService.analyze_resume(
            resume_text=resume_text,
            filename=filename,
            file_size=file_size,
            target_role=target_role,
            user_id=user_id,
        )
        return success_response(
            data=result,
            message="Resume analyzed successfully.",
            status_code=200
        )
    except Exception as e:
        return error_response(
            message=f"Analysis engine error: {str(e)}",
            status_code=500
        )


@resume_bp.route("/history", methods=["GET"])
def resume_history():
    """Retrieves recent resume evaluations from SQLite."""
    try:
        limit = int(request.args.get("limit", 10))
        user_id = get_current_user_id()
        history = ResumeService.get_resume_history(limit=min(limit, 50), user_id=user_id)
        return success_response(
            data=history,
            message="Resume analysis history retrieved.",
            status_code=200
        )
    except Exception as e:
        return error_response(
            message=f"Failed to fetch history: {str(e)}",
            status_code=500
        )


@resume_bp.route("/<int:resume_id>", methods=["GET"])
def get_resume_by_id(resume_id: int):
    """Retrieves a single evaluated resume record by ID."""
    try:
        user_id = get_current_user_id()
        resume = ResumeService.get_resume_by_id(resume_id, user_id=user_id)
        if not resume:
            return error_response(
                message=f"Resume with ID {resume_id} not found.",
                status_code=404,
            )
        return success_response(
            data=resume,
            message="Resume record retrieved.",
            status_code=200,
        )
    except Exception as e:
        return error_response(
            message=f"Failed to fetch resume {resume_id}: {str(e)}",
            status_code=500,
        )

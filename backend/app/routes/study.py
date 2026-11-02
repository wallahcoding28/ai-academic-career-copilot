"""
Study Planner REST API Blueprint
Stage 5: Dual-engine study planning, scheduling, atomic session toggling, and versioned regeneration.
"""

import logging
from flask import Blueprint, request
from app.services.study_service import StudyPlannerService
from app.utils.errors import success_response, error_response
from app.utils.auth import get_current_user_id

logger = logging.getLogger(__name__)

study_bp = Blueprint("study", __name__, url_prefix="/api/study-planner")


@study_bp.route("/context", methods=["GET"])
def get_study_context():
    """
    Returns available verified context from Skill Gap Analyzer,
    Interview Generator, and Resume Analyzer for 1-click calibration.
    """
    try:
        user_id = get_current_user_id()
        context_data = StudyPlannerService.get_context_summary(user_id=user_id)
        return success_response(
            data=context_data,
            message="Study planner cross-module context retrieved successfully",
        )
    except Exception as e:
        logger.error(f"Error fetching study context: {e}")
        return error_response(
            message="Failed to retrieve study planner context.",
            status_code=500,
            details={"error": str(e)},
        )


@study_bp.route("/generate", methods=["POST"])
def generate_study_plan():
    """
    Generates a structured, mathematically balanced study roadmap
    calibrated to the user's available daily hours and target horizon.
    """
    try:
        body = request.get_json() or {}

        goal = body.get("goal", "").strip()
        topics = body.get("topics", [])
        daily_hours = body.get("daily_hours", 1.5)
        horizon_weeks = body.get("horizon_weeks", 4)
        study_preferences = body.get("study_preferences", {})
        context_source = body.get("context_source", "custom")
        skill_gap_id = body.get("skill_gap_id")
        interview_session_id = body.get("interview_session_id")
        resume_id = body.get("resume_id")
        user_id = get_current_user_id() or body.get("user_id")

        try:
            daily_hours = float(daily_hours)
        except (ValueError, TypeError):
            return error_response(
                message="Invalid daily_hours. Must be a numeric value.",
                status_code=400,
            )

        try:
            horizon_weeks = int(horizon_weeks)
        except (ValueError, TypeError):
            return error_response(
                message="Invalid horizon_weeks. Must be an integer (1, 2, 4, 8).",
                status_code=400,
            )

        # Validate inputs
        is_valid, validation_err = StudyPlannerService.validate_plan_parameters(
            goal=goal,
            topics=topics,
            daily_hours=daily_hours,
            horizon_weeks=horizon_weeks,
            study_preferences=study_preferences,
        )
        if not is_valid:
            return error_response(
                message=validation_err or "Invalid study plan parameters.",
                status_code=400,
            )

        # Generate and transactionally persist plan
        plan = StudyPlannerService.create_plan_transactional(
            user_id=user_id,
            goal=goal,
            topics=topics,
            daily_hours=daily_hours,
            horizon_weeks=horizon_weeks,
            study_preferences=study_preferences,
            context_source=context_source,
            skill_gap_id=skill_gap_id,
            interview_session_id=interview_session_id,
            resume_id=resume_id,
        )

        return success_response(
            data=plan,
            message="Study plan generated and scheduled successfully",
            status_code=201,
        )

    except ValueError as ve:
        err_msg = str(ve)
        status_code = 404 if "not found" in err_msg.lower() else 400
        return error_response(message=err_msg, status_code=status_code)
    except Exception as e:
        logger.error(f"Error in study plan generation: {e}")
        return error_response(
            message="An error occurred while generating the study plan.",
            status_code=500,
            details={"error": str(e)},
        )


@study_bp.route("/history", methods=["GET"])
def get_study_history():
    """
    Returns the list of previously generated study plans with progress metrics.
    """
    try:
        limit = request.args.get("limit", default=20, type=int)
        user_id = get_current_user_id()
        history = StudyPlannerService.get_plan_history(limit=limit, user_id=user_id)
        return success_response(
            data=history,
            message="Study plan history retrieved successfully",
        )
    except Exception as e:
        logger.error(f"Error fetching study history: {e}")
        return error_response(
            message="Failed to retrieve study plan history.",
            status_code=500,
            details={"error": str(e)},
        )


@study_bp.route("/<int:plan_id>", methods=["GET"])
def get_single_plan(plan_id: int):
    """
    Retrieves full details for a specific study plan and its sessions.
    """
    try:
        user_id = get_current_user_id()
        plan = StudyPlannerService.get_plan_by_id(plan_id, user_id=user_id)
        if not plan:
            return error_response(
                message=f"Study plan with id {plan_id} was not found.",
                status_code=404,
            )
        return success_response(
            data=plan,
            message="Study plan retrieved successfully",
        )
    except Exception as e:
        logger.error(f"Error fetching study plan {plan_id}: {e}")
        return error_response(
            message="Failed to retrieve study plan.",
            status_code=500,
            details={"error": str(e)},
        )


@study_bp.route("/<int:plan_id>/sessions/<int:session_id>", methods=["PATCH"])
def toggle_session(plan_id: int, session_id: int):
    """
    Atomically updates a study session's completion status.
    Payload: { "is_completed": true | false }
    """
    try:
        body = request.get_json() or {}
        if "is_completed" not in body:
            return error_response(
                message="Missing 'is_completed' boolean field in request body.",
                status_code=400,
            )

        is_completed = bool(body["is_completed"])
        result = StudyPlannerService.toggle_session_completion(
            plan_id=plan_id,
            session_id=session_id,
            is_completed=is_completed,
        )
        return success_response(
            data=result,
            message="Session status updated successfully",
        )
    except ValueError as ve:
        return error_response(message=str(ve), status_code=404)
    except Exception as e:
        logger.error(f"Error updating session {session_id} in plan {plan_id}: {e}")
        return error_response(
            message="Failed to update session completion status.",
            status_code=500,
            details={"error": str(e)},
        )


@study_bp.route("/<int:plan_id>/regenerate", methods=["POST"])
def regenerate_plan(plan_id: int):
    """
    Transactionally creates a new version of an existing study plan,
    archiving the parent plan (is_active = 0) while preserving its history.
    """
    try:
        body = request.get_json() or {}
        daily_hours = body.get("daily_hours")
        horizon_weeks = body.get("horizon_weeks")
        topics = body.get("topics")
        study_preferences = body.get("study_preferences")

        if daily_hours is not None:
            try:
                daily_hours = float(daily_hours)
            except (ValueError, TypeError):
                return error_response(message="Invalid daily_hours.", status_code=400)

        if horizon_weeks is not None:
            try:
                horizon_weeks = int(horizon_weeks)
            except (ValueError, TypeError):
                return error_response(message="Invalid horizon_weeks.", status_code=400)

        new_plan = StudyPlannerService.regenerate_plan_transactional(
            plan_id=plan_id,
            daily_hours=daily_hours,
            horizon_weeks=horizon_weeks,
            topics=topics,
            study_preferences=study_preferences,
        )

        return success_response(
            data=new_plan,
            message=f"Study plan regenerated successfully as version {new_plan.get('version', 2)}",
            status_code=201,
        )
    except ValueError as ve:
        err_msg = str(ve)
        status_code = 404 if "not found" in err_msg.lower() else 400
        return error_response(message=err_msg, status_code=status_code)
    except Exception as e:
        logger.error(f"Error regenerating plan {plan_id}: {e}")
        return error_response(
            message="Failed to regenerate study plan.",
            status_code=500,
            details={"error": str(e)},
        )

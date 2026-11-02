"""
Authentication & Profile Routes
Stage 7: Signup, Login, Session Check, Logout, Profile Updates, Preferences, and Data Management.
"""

from flask import Blueprint, request, session

from app.services.auth_service import AuthService
from app.utils.auth import get_current_user_id, login_required
from app.utils.errors import error_response, success_response

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Registers a new user and establishes a server session."""
    payload = request.get_json() or {}
    full_name = payload.get("full_name") or payload.get("name")
    email = payload.get("email")
    password = payload.get("password")
    confirm_password = payload.get("confirm_password") or payload.get("confirmPassword")
    college_name = payload.get("college_name") or payload.get("college")
    graduation_year = payload.get("graduation_year")
    degree_program = payload.get("degree_program")

    if not full_name or not email or not password:
        return error_response(message="Full name, email, and password are required.", status_code=400)

    if confirm_password is not None and password != confirm_password:
        return error_response(message="Passwords do not match.", status_code=400)

    user, err = AuthService.signup(
        full_name=full_name,
        email=email,
        password=password,
        college_name=college_name,
        graduation_year=graduation_year,
        degree_program=degree_program,
    )
    if err or not user:
        status_code = 409 if "already exists" in (err or "").lower() else 400
        return error_response(message=err or "Registration failed.", status_code=status_code)

    # Establish server-side session
    session["user_id"] = user["id"]
    session.permanent = True

    return success_response(
        data={"user": user},
        message="Account created successfully.",
        status_code=201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticates credentials and establishes a server session."""
    payload = request.get_json() or {}
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        return error_response(message="Email and password are required.", status_code=400)

    user, err = AuthService.login(email=email, password=password)
    if err or not user:
        return error_response(message=err or "Invalid email or password.", status_code=401)

    # Establish server-side session
    session["user_id"] = user["id"]
    session.permanent = True

    return success_response(
        data={"user": user},
        message="Signed in successfully.",
        status_code=200,
    )


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clears the server-side session."""
    session.clear()
    return success_response(
        data=None,
        message="Logged out successfully.",
        status_code=200,
    )


@auth_bp.route("/me", methods=["GET"])
def get_current_session_user():
    """Returns profile for currently authenticated user."""
    user_id = get_current_user_id()
    if not user_id:
        return error_response(
            message="Not authenticated.",
            status_code=401,
            details={"code": "UNAUTHENTICATED"},
        )

    user = AuthService.get_user_by_id(user_id)
    if not user:
        session.clear()
        return error_response(message="User account no longer exists.", status_code=401)

    return success_response(
        data={"user": user},
        message="Session active.",
        status_code=200,
    )


@auth_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    """Updates profile attributes for the logged-in user."""
    user_id = get_current_user_id()
    payload = request.get_json() or {}

    full_name = payload.get("full_name") or payload.get("name")
    college_name = payload.get("college_name") or payload.get("college")
    degree_program = payload.get("degree_program")
    graduation_year = payload.get("graduation_year")
    target_role = payload.get("target_role")

    user, err = AuthService.update_profile(
        user_id=user_id,
        full_name=full_name,
        college_name=college_name,
        degree_program=degree_program,
        graduation_year=graduation_year,
        target_role=target_role,
    )
    if err or not user:
        return error_response(message=err or "Profile update failed.", status_code=400)

    return success_response(
        data={"user": user},
        message="Profile updated successfully.",
        status_code=200,
    )


@auth_bp.route("/password", methods=["PUT"])
@login_required
def change_password():
    """Updates user password after verifying current password."""
    user_id = get_current_user_id()
    payload = request.get_json() or {}
    current_password = payload.get("current_password")
    new_password = payload.get("new_password")
    confirm_new_password = payload.get("confirm_new_password")

    if not current_password or not new_password:
        return error_response(message="Current and new password are required.", status_code=400)

    if confirm_new_password is not None and new_password != confirm_new_password:
        return error_response(message="New passwords do not match.", status_code=400)

    success, err = AuthService.change_password(
        user_id=user_id,
        current_password=current_password,
        new_password=new_password,
    )
    if not success or err:
        return error_response(message=err or "Password change failed.", status_code=400)

    return success_response(
        data=None,
        message="Password updated successfully.",
        status_code=200,
    )


@auth_bp.route("/preferences", methods=["PUT"])
@login_required
def update_preferences():
    """Updates personalized user preferences (theme, study goal, difficulty, etc.)."""
    user_id = get_current_user_id()
    payload = request.get_json() or {}
    new_prefs = payload.get("preferences") if isinstance(payload.get("preferences"), dict) else payload

    prefs, err = AuthService.update_preferences(user_id=user_id, new_prefs=new_prefs)
    if err or prefs is None:
        return error_response(message=err or "Preferences update failed.", status_code=400)

    return success_response(
        data={"preferences": prefs},
        message="Preferences saved successfully.",
        status_code=200,
    )


@auth_bp.route("/data", methods=["DELETE"])
@login_required
def delete_user_data():
    """
    Deletes user data or the entire account.
    Supports either {"confirmation": "DELETE_ALL_DATA" | "DELETE_ACCOUNT"}
    or {"confirm": true, "scope": "history" | "account"}.
    """
    user_id = get_current_user_id()
    payload = request.get_json() or {}

    confirmation = payload.get("confirmation")
    confirm = payload.get("confirm")
    scope = payload.get("scope")

    if confirmation == "DELETE_ACCOUNT" or (confirm and scope == "account"):
        delete_account = True
        scope_name = "account"
    elif confirmation in ("DELETE_ALL_DATA", "DELETE_HISTORY") or (confirm and scope in ("history", "all")):
        delete_account = False
        scope_name = "history"
    else:
        return error_response(message="Confirmation required to delete data.", status_code=400)

    success, err = AuthService.delete_user_data(user_id=user_id, delete_account=delete_account)
    if not success or err:
        return error_response(message=err or "Data deletion failed.", status_code=500)

    if delete_account:
        session.clear()

    return success_response(
        data={"scope": scope_name, "account_deleted": delete_account},
        message="Account deleted successfully." if delete_account else "Activity history cleared successfully.",
        status_code=200,
    )

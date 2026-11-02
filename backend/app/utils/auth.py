"""
Authentication Decorators and Session Helpers
"""

from functools import wraps
from typing import Any, Dict, Optional
from flask import session

from app.services.auth_service import AuthService
from app.utils.errors import error_response


def get_current_user_id() -> Optional[int]:
    """Returns the authenticated user ID from the server session, if present."""
    return session.get("user_id")


def get_current_user() -> Optional[Dict[str, Any]]:
    """Retrieves full profile for current session user."""
    user_id = get_current_user_id()
    if not user_id:
        return None
    return AuthService.get_user_by_id(user_id)


def login_required(f):
    """Decorator ensuring request has an active, authenticated session."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_current_user_id()
        if not user_id:
            return error_response(
                message="Authentication required. Please log in to access this resource.",
                status_code=401,
                details={"code": "UNAUTHENTICATED"},
            )
        return f(*args, **kwargs)
    return decorated_function


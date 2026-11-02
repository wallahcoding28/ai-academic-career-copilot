"""
Authentication & User Management Service
Handles registration, secure password hashing, credential validation,
profile updates, and user data management.
"""

import json
import logging
import re
from typing import Any, Dict, Optional, Tuple
from werkzeug.security import check_password_hash, generate_password_hash

from app.models.db import get_db

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[\w\.\-]+\.[a-zA-Z]{2,}$")


class AuthService:
    """Service layer for authentication, student profile, and preferences."""

    @staticmethod
    def _format_user(row: Any) -> Dict[str, Any]:
        """Formats a database user row into a safe JSON-serializable dictionary."""
        prefs = {}
        if row["preferences_json"]:
            try:
                prefs = json.loads(row["preferences_json"])
            except Exception:
                prefs = {}

        return {
            "id": row["id"],
            "full_name": row["full_name"],
            "name": row["full_name"],
            "email": row["email"],
            "target_role": row["target_role"] or "Full Stack Developer",
            "college_name": row["college_name"] or "",
            "college": row["college_name"] or "",
            "degree_program": row["degree_program"] or "",
            "graduation_year": row["graduation_year"] or None,
            "preferences": prefs,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    @classmethod
    def signup(
        cls,
        full_name: str,
        email: str,
        password: str,
        college_name: Optional[str] = None,
        graduation_year: Optional[int] = None,
        degree_program: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Registers a new user with securely hashed password."""
        full_name = (full_name or "").strip()
        email = (email or "").strip().lower()

        if len(full_name) < 2:
            return None, "Full name must be at least 2 characters long."

        if not EMAIL_REGEX.match(email):
            return None, "Please provide a valid email address."

        if not password or len(password) < 6:
            return None, "Password must be at least 6 characters long."

        db = get_db()
        cursor = db.cursor()

        # Check for duplicate email
        cursor.execute("SELECT id FROM users WHERE lower(email) = ?;", (email,))
        if cursor.fetchone():
            return None, "An account with this email address already exists."

        password_hash = generate_password_hash(password, method="pbkdf2:sha256")
        default_prefs = json.dumps({
            "theme": "light",
            "study_goal_hours": 10,
            "difficulty_preference": "Intermediate",
            "rest_days_mode": "weekends_off",
        })

        try:
            cursor.execute(
                """
                INSERT INTO users (full_name, email, password_hash, college_name, degree_program, graduation_year, preferences_json)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (full_name, email, password_hash, college_name, degree_program, graduation_year, default_prefs),
            )
            db.commit()
            user_id = cursor.lastrowid

            cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
            new_user = cursor.fetchone()
            return cls._format_user(new_user), None
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return None, f"Database error during registration: {str(e)}"

    @classmethod
    def login(cls, email: str, password: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Validates credentials and returns user profile if correct."""
        email = (email or "").strip().lower()
        if not email or not password:
            return None, "Email and password are required."

        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM users WHERE lower(email) = ?;", (email,))
        user = cursor.fetchone()

        if not user or not user["password_hash"]:
            return None, "Invalid email or password."

        if not check_password_hash(user["password_hash"], password):
            return None, "Invalid email or password."

        return cls._format_user(user), None

    @classmethod
    def get_user_by_id(cls, user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves user profile by ID."""
        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
            user = cursor.fetchone()
            return cls._format_user(user) if user else None
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {e}")
            return None

    @classmethod
    def update_profile(
        cls,
        user_id: int,
        full_name: str,
        college_name: Optional[str] = None,
        degree_program: Optional[str] = None,
        graduation_year: Optional[int] = None,
        target_role: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Updates user profile information."""
        full_name = (full_name or "").strip()
        if len(full_name) < 2:
            return None, "Full name must be at least 2 characters long."

        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                """
                UPDATE users
                SET full_name = ?, college_name = ?, degree_program = ?, graduation_year = ?, target_role = COALESCE(?, target_role), updated_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """,
                (full_name, college_name, degree_program, graduation_year, target_role, user_id),
            )
            db.commit()

            cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
            updated_user = cursor.fetchone()
            return cls._format_user(updated_user) if updated_user else None, None
        except Exception as e:
            logger.error(f"Failed to update user profile {user_id}: {e}")
            return None, f"Database error updating profile: {str(e)}"

    @classmethod
    def change_password(cls, user_id: int, current_password: str, new_password: str) -> Tuple[bool, Optional[str]]:
        """Changes user password after validating current password."""
        if not new_password or len(new_password) < 6:
            return False, "New password must be at least 6 characters long."

        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?;", (user_id,))
        user = cursor.fetchone()
        if not user or not user["password_hash"]:
            return False, "User account not found."

        if not check_password_hash(user["password_hash"], current_password):
            return False, "Current password is incorrect."

        new_hash = generate_password_hash(new_password, method="pbkdf2:sha256")
        try:
            cursor.execute(
                "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                (new_hash, user_id),
            )
            db.commit()
            return True, None
        except Exception as e:
            logger.error(f"Failed to update password for user {user_id}: {e}")
            return False, f"Database error updating password: {str(e)}"

    @classmethod
    def update_preferences(cls, user_id: int, new_prefs: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Merges and updates user preferences (theme, goals, difficulty, rest days)."""
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT preferences_json FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        if not row:
            return None, "User not found."

        current_prefs = {}
        if row["preferences_json"]:
            try:
                current_prefs = json.loads(row["preferences_json"])
            except Exception:
                current_prefs = {}

        # Whitelist and merge supported preference fields
        allowed_keys = {
            "theme",
            "study_goal_hours",
            "weekly_study_goal_hours",
            "difficulty_preference",
            "difficulty_tier",
            "rest_days_mode",
            "default_target_role",
            "email_notifications",
        }
        for k, v in new_prefs.items():
            if k in allowed_keys:
                current_prefs[k] = v
                if k == "weekly_study_goal_hours":
                    current_prefs["study_goal_hours"] = v
                elif k == "study_goal_hours":
                    current_prefs["weekly_study_goal_hours"] = v
                elif k == "difficulty_tier":
                    current_prefs["difficulty_preference"] = v
                elif k == "difficulty_preference":
                    current_prefs["difficulty_tier"] = v

        try:
            cursor.execute(
                "UPDATE users SET preferences_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                (json.dumps(current_prefs), user_id),
            )
            db.commit()
            return current_prefs, None
        except Exception as e:
            logger.error(f"Failed to update preferences for user {user_id}: {e}")
            return None, f"Database error updating preferences: {str(e)}"

    @classmethod
    def delete_user_data(cls, user_id: int, delete_account: bool = False) -> Tuple[bool, Optional[str]]:
        """
        Safely clears user data.
        If delete_account is True: removes all user data and the user account itself.
        If delete_account is False: removes only the user's activity records (resumes, evaluations, practice sets, study plans).
        """
        db = get_db()
        cursor = db.cursor()
        try:
            # 1. Delete study sessions linked to user's plans
            cursor.execute(
                """
                DELETE FROM study_sessions 
                WHERE plan_id IN (SELECT id FROM study_plans WHERE user_id = ?);
                """,
                (user_id,),
            )
            # 2. Delete study plans
            cursor.execute("DELETE FROM study_plans WHERE user_id = ?;", (user_id,))
            # 3. Delete interview sessions
            cursor.execute("DELETE FROM interview_sessions WHERE user_id = ?;", (user_id,))
            # 4. Delete skill evaluations
            cursor.execute("DELETE FROM skill_evaluations WHERE user_id = ?;", (user_id,))
            # 5. Delete resumes
            cursor.execute("DELETE FROM resumes WHERE user_id = ?;", (user_id,))

            if delete_account:
                cursor.execute("DELETE FROM users WHERE id = ?;", (user_id,))

            db.commit()
            return True, None
        except Exception as e:
            logger.error(f"Failed to delete user data for {user_id}: {e}")
            return False, f"Database error during deletion: {str(e)}"

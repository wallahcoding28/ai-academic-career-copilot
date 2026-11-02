"""
Standardized JSON Response and Error Handling Utilities
"""

from flask import jsonify


def success_response(data=None, message="Success", status_code=200):
    """Formats a successful JSON response."""
    response = {
        "success": True,
        "data": data if data is not None else {},
        "message": message,
        "error": None
    }
    return jsonify(response), status_code


def error_response(message="An error occurred", status_code=400, details=None):
    """Formats a standardized error JSON response."""
    response = {
        "success": False,
        "data": None,
        "message": message,
        "error": details or {"code": status_code, "message": message}
    }
    return jsonify(response), status_code

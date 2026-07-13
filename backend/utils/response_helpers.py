"""
ReConnect – Standardized API Response Helpers
=============================================
All API responses follow a consistent envelope:

Success:
    {
        "success": true,
        "message": "...",
        "data": { ... }   | [ ... ],
        "meta": { ... }   (optional, for paginated lists)
    }

Error:
    {
        "success": false,
        "message": "...",
        "errors": [ ... ] (optional, for validation errors)
    }
"""

from flask import jsonify
from typing import Any


# ──────────────────────────────────────────────────────────────
#  Success responses
# ──────────────────────────────────────────────────────────────

def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    meta: dict = None,
):
    """Return a standard success JSON response.

    Args:
        data:        Response payload (dict, list, or None).
        message:     Human-readable success message.
        status_code: HTTP status code (default 200).
        meta:        Optional pagination / metadata object.

    Returns:
        Flask JSON response tuple (response, status_code).
    """
    payload = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta is not None:
        payload["meta"] = meta

    return jsonify(payload), status_code


def created_response(data: Any = None, message: str = "Created successfully"):
    """Shortcut for 201 Created responses."""
    return success_response(data=data, message=message, status_code=201)


def no_content_response(message: str = "Deleted successfully"):
    """Shortcut for 204-like responses (returns 200 with message for JS compatibility)."""
    return success_response(data=None, message=message, status_code=200)


# ──────────────────────────────────────────────────────────────
#  Error responses
# ──────────────────────────────────────────────────────────────

def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    errors: list = None,
):
    """Return a standard error JSON response.

    Args:
        message:     Human-readable error message.
        status_code: HTTP status code (default 400).
        errors:      Optional list of field-level validation errors.

    Returns:
        Flask JSON response tuple (response, status_code).
    """
    payload = {
        "success": False,
        "message": message,
    }
    if errors:
        payload["errors"] = errors

    return jsonify(payload), status_code


def not_found_response(resource: str = "Item"):
    """Shortcut for 404 Not Found."""
    return error_response(f"{resource} not found", 404)


def validation_error_response(errors: list):
    """Shortcut for 422 Unprocessable Entity with field errors."""
    return error_response(
        message="Validation failed. Please check the highlighted fields.",
        status_code=422,
        errors=errors,
    )


def server_error_response(detail: str = ""):
    """Shortcut for 500 Internal Server Error."""
    msg = "An internal server error occurred."
    if detail:
        msg += f" Detail: {detail}"
    return error_response(msg, 500)

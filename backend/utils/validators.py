"""
ReConnect – Input Validation Helpers
======================================
Validates request data for lost/found item forms.
Returns a list of field-level error dicts that can be passed
directly to validation_error_response().

Error dict format:
    {
        "field": "item_name",
        "message": "Item name is required."
    }
"""

import re
from datetime import datetime, date, timezone
from typing import Dict, List, Any

from flask import current_app


# ──────────────────────────────────────────────────────────────
#  Constants
# ──────────────────────────────────────────────────────────────

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
PHONE_REGEX = re.compile(r"^\+?[\d\s\-().]{7,20}$")

MAX_ITEM_NAME_LEN = 100
MAX_DESCRIPTION_LEN = 2000
MAX_LOCATION_LEN = 200
MAX_BRAND_LEN = 100
MAX_COLOR_LEN = 50
MAX_CONTACT_NAME_LEN = 100


# ──────────────────────────────────────────────────────────────
#  Core validation functions
# ──────────────────────────────────────────────────────────────

def validate_item_data(data: Dict[str, Any], require_all: bool = True) -> List[dict]:
    """Validate the payload for creating or updating a lost/found item.

    Args:
        data:        Dictionary of field values from the request.
        require_all: If True, enforce required fields (used for POST).
                     If False, only validate fields that are present (used for PUT).

    Returns:
        List of error dicts. Empty list means validation passed.
    """
    errors: List[dict] = []

    # ── item_name ──────────────────────────────────────────────
    item_name = _get(data, "item_name")
    if require_all and not item_name:
        errors.append(_err("item_name", "Item name is required."))
    elif item_name and len(item_name.strip()) < 2:
        errors.append(_err("item_name", "Item name must be at least 2 characters."))
    elif item_name and len(item_name) > MAX_ITEM_NAME_LEN:
        errors.append(_err("item_name", f"Item name must not exceed {MAX_ITEM_NAME_LEN} characters."))

    # ── category ──────────────────────────────────────────────
    category = _get(data, "category")
    if require_all and not category:
        errors.append(_err("category", "Category is required."))
    elif category and category not in current_app.config["ITEM_CATEGORIES"]:
        errors.append(_err(
            "category",
            f"Invalid category. Choose from: {', '.join(current_app.config['ITEM_CATEGORIES'])}."
        ))

    # ── color ─────────────────────────────────────────────────
    color = _get(data, "color")
    if require_all and not color:
        errors.append(_err("color", "Color is required."))
    elif color and len(color.strip()) < 2:
        errors.append(_err("color", "Color must be at least 2 characters."))
    elif color and len(color) > MAX_COLOR_LEN:
        errors.append(_err("color", f"Color must not exceed {MAX_COLOR_LEN} characters."))

    # ── brand (optional) ──────────────────────────────────────
    brand = _get(data, "brand")
    if brand and len(brand) > MAX_BRAND_LEN:
        errors.append(_err("brand", f"Brand must not exceed {MAX_BRAND_LEN} characters."))

    # ── description ───────────────────────────────────────────
    description = _get(data, "description")
    if require_all and not description:
        errors.append(_err("description", "Description is required."))
    elif description and len(description.strip()) < 10:
        errors.append(_err("description", "Description must be at least 10 characters."))
    elif description and len(description) > MAX_DESCRIPTION_LEN:
        errors.append(_err("description", f"Description must not exceed {MAX_DESCRIPTION_LEN} characters."))

    # ── location ──────────────────────────────────────────────
    location = _get(data, "location")
    if require_all and not location:
        errors.append(_err("location", "Location is required."))
    elif location and len(location.strip()) < 3:
        errors.append(_err("location", "Location must be at least 3 characters."))
    elif location and len(location) > MAX_LOCATION_LEN:
        errors.append(_err("location", f"Location must not exceed {MAX_LOCATION_LEN} characters."))

    # ── date ──────────────────────────────────────────────────
    date_str = _get(data, "date")
    if require_all and not date_str:
        errors.append(_err("date", "Date is required."))
    elif date_str:
        date_error = _validate_date(date_str)
        if date_error:
            errors.append(_err("date", date_error))

    # ── contact_name ──────────────────────────────────────────
    contact_name = _get(data, "contact_name")
    if require_all and not contact_name:
        errors.append(_err("contact_name", "Contact name is required."))
    elif contact_name and len(contact_name.strip()) < 2:
        errors.append(_err("contact_name", "Contact name must be at least 2 characters."))
    elif contact_name and len(contact_name) > MAX_CONTACT_NAME_LEN:
        errors.append(_err("contact_name", f"Contact name must not exceed {MAX_CONTACT_NAME_LEN} characters."))

    # ── contact_email ─────────────────────────────────────────
    contact_email = _get(data, "contact_email")
    if require_all and not contact_email:
        errors.append(_err("contact_email", "Contact email is required."))
    elif contact_email and not EMAIL_REGEX.match(contact_email):
        errors.append(_err("contact_email", "Please enter a valid email address."))

    # ── contact_phone (optional) ──────────────────────────────
    contact_phone = _get(data, "contact_phone")
    if contact_phone and not PHONE_REGEX.match(contact_phone):
        errors.append(_err("contact_phone", "Please enter a valid phone number."))

    # ── status (optional, only for updates) ───────────────────
    status = _get(data, "status")
    if status and status not in current_app.config["ITEM_STATUSES"]:
        errors.append(_err("status", f"Invalid status. Choose from: {', '.join(current_app.config['ITEM_STATUSES'])}."))

    return errors


# ──────────────────────────────────────────────────────────────
#  Private helpers
# ──────────────────────────────────────────────────────────────

def _get(data: dict, key: str) -> str:
    """Safely retrieve a string value from the data dict."""
    value = data.get(key)
    if value is None:
        return None
    return str(value).strip() if value != "" else ""


def _err(field: str, message: str) -> dict:
    """Build a field-level error dict."""
    return {"field": field, "message": message}


def _validate_date(date_str: str) -> str:
    """Validate an ISO date string (YYYY-MM-DD).

    Returns:
        An error message string, or empty string if valid.
    """
    try:
        parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return "Date must be in YYYY-MM-DD format (e.g., 2026-07-10)."

    today = date.today()
    if parsed_date > today:
        return "Date cannot be in the future."

    # Reject dates older than 2 years
    two_years_ago = date(today.year - 2, today.month, today.day)
    if parsed_date < two_years_ago:
        return "Date seems too far in the past (maximum 2 years)."

    return ""


def sanitize_string(value: str, max_length: int = 500) -> str:
    """Strip leading/trailing whitespace and truncate a string."""
    if not value:
        return ""
    return str(value).strip()[:max_length]

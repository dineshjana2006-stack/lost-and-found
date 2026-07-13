"""
ReConnect – Found Items Routes
================================
Endpoints:
    GET    /api/found          → List all found items (filter, sort, paginate)
    POST   /api/found          → Report a new found item (with optional images)
    GET    /api/found/<id>     → Get a single found item
    PUT    /api/found/<id>     → Update a found item
    DELETE /api/found/<id>     → Delete a found item

Mirrors the lost_routes structure exactly — only the item_type differs.
"""

import logging
from flask import Blueprint, request

import services.data_service as data_svc
from services.image_service import process_multiple_images
from utils.response_helpers import (
    success_response,
    created_response,
    no_content_response,
    error_response,
    not_found_response,
    validation_error_response,
)
from utils.validators import validate_item_data
from utils.pagination import paginate, parse_pagination_params

logger = logging.getLogger(__name__)

found_bp = Blueprint("found", __name__)

ITEM_TYPE = "found"


# ──────────────────────────────────────────────────────────────
#  GET /api/found
# ──────────────────────────────────────────────────────────────
@found_bp.get("/")
def list_found_items():
    """Return a paginated, filtered, sorted list of found items.

    Query Parameters: identical to /api/lost (see lost_routes.py).
    """
    args = request.args
    items = data_svc.get_all_items(ITEM_TYPE)

    # ── Filtering ──────────────────────────────────────────────
    q = args.get("q", "").strip().lower()
    if q:
        items = [
            i for i in items
            if q in i.get("item_name", "").lower()
            or q in i.get("description", "").lower()
            or q in i.get("location", "").lower()
            or q in i.get("brand", "").lower()
        ]

    category = args.get("category", "").strip()
    if category:
        items = [i for i in items if i.get("category", "").lower() == category.lower()]

    color = args.get("color", "").strip().lower()
    if color:
        items = [i for i in items if color in i.get("color", "").lower()]

    brand = args.get("brand", "").strip().lower()
    if brand:
        items = [i for i in items if brand in i.get("brand", "").lower()]

    location = args.get("location", "").strip().lower()
    if location:
        items = [i for i in items if location in i.get("location", "").lower()]

    status = args.get("status", "").strip().lower()
    if status:
        items = [i for i in items if i.get("status", "active") == status]

    # ── Sorting ────────────────────────────────────────────────
    sort = args.get("sort", "newest").strip().lower()
    if sort == "oldest":
        items.sort(key=lambda x: x.get("created_at", ""))
    elif sort == "name":
        items.sort(key=lambda x: x.get("item_name", "").lower())

    # ── Pagination ─────────────────────────────────────────────
    page, page_size = parse_pagination_params(args)
    page_items, meta = paginate(items, page=page, page_size=page_size)

    return success_response(data=page_items, meta=meta)


# ──────────────────────────────────────────────────────────────
#  POST /api/found
# ──────────────────────────────────────────────────────────────
@found_bp.post("/")
def create_found_item():
    """Report a new found item.

    Accepts multipart/form-data with optional image files,
    or application/json (without images).
    """
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
        files = request.files.getlist("images")
    else:
        data = request.get_json(silent=True) or {}
        files = []

    errors = validate_item_data(data, require_all=True)
    if errors:
        return validation_error_response(errors)

    saved_images, img_errors = [], []
    if files:
        saved_images, img_errors = process_multiple_images(files, ITEM_TYPE)

    data["images"] = saved_images
    new_item = data_svc.create_item(ITEM_TYPE, data)

    response_data = {
        "item": new_item,
        "image_warnings": img_errors if img_errors else None,
    }
    return created_response(
        data=response_data,
        message="Found item reported successfully.",
    )


# ──────────────────────────────────────────────────────────────
#  GET /api/found/<item_id>
# ──────────────────────────────────────────────────────────────
@found_bp.get("/<string:item_id>")
def get_found_item(item_id: str):
    """Return a single found item by ID."""
    item = data_svc.get_item_by_id(ITEM_TYPE, item_id)
    if not item:
        return not_found_response("Found item")
    return success_response(data=item)


# ──────────────────────────────────────────────────────────────
#  PUT /api/found/<item_id>
# ──────────────────────────────────────────────────────────────
@found_bp.put("/<string:item_id>")
def update_found_item(item_id: str):
    """Partially update a found item."""
    item = data_svc.get_item_by_id(ITEM_TYPE, item_id)
    if not item:
        return not_found_response("Found item")

    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
        files = request.files.getlist("images")
    else:
        data = request.get_json(silent=True) or {}
        files = []

    errors = validate_item_data(data, require_all=False)
    if errors:
        return validation_error_response(errors)

    if files:
        existing_img_count = len(item.get("images", []))
        saved_images, _ = process_multiple_images(files, ITEM_TYPE, existing_count=existing_img_count)
        if saved_images:
            data_svc.append_images_to_item(ITEM_TYPE, item_id, saved_images)

    updated_item = data_svc.update_item(ITEM_TYPE, item_id, data)
    return success_response(data=updated_item, message="Found item updated successfully.")


# ──────────────────────────────────────────────────────────────
#  DELETE /api/found/<item_id>
# ──────────────────────────────────────────────────────────────
@found_bp.delete("/<string:item_id>")
def delete_found_item(item_id: str):
    """Permanently delete a found item."""
    item = data_svc.get_item_by_id(ITEM_TYPE, item_id)
    if not item:
        return not_found_response("Found item")

    deleted = data_svc.delete_item(ITEM_TYPE, item_id)
    if not deleted:
        return error_response("Failed to delete item. Please try again.", 500)

    return no_content_response("Found item deleted successfully.")

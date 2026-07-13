"""
ReConnect – Lost Items Routes
==============================
Endpoints:
    GET    /api/lost          → List all lost items (filter, sort, paginate)
    POST   /api/lost          → Report a new lost item (with optional images)
    GET    /api/lost/<id>     → Get a single lost item
    PUT    /api/lost/<id>     → Update a lost item
    DELETE /api/lost/<id>     → Delete a lost item

All responses follow the standard envelope defined in utils/response_helpers.py.
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

lost_bp = Blueprint("lost", __name__)

ITEM_TYPE = "lost"


# ──────────────────────────────────────────────────────────────
#  GET /api/lost
# ──────────────────────────────────────────────────────────────
@lost_bp.get("/")
def list_lost_items():
    """Return a paginated, filtered, sorted list of lost items.

    Query Parameters:
        q          (str)  – keyword search across name, description, location
        category   (str)  – filter by category
        color      (str)  – filter by color (case-insensitive contains)
        brand      (str)  – filter by brand (case-insensitive contains)
        location   (str)  – filter by location keyword
        status     (str)  – filter by status (active | resolved | archived)
        sort       (str)  – sort field: newest (default) | oldest | name
        page       (int)  – page number (default 1)
        page_size  (int)  – items per page (default 12, max 50)
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
    else:  # newest (default — already sorted by data_svc)
        pass

    # ── Pagination ─────────────────────────────────────────────
    page, page_size = parse_pagination_params(args)
    page_items, meta = paginate(items, page=page, page_size=page_size)

    return success_response(data=page_items, meta=meta)


# ──────────────────────────────────────────────────────────────
#  POST /api/lost
# ──────────────────────────────────────────────────────────────
@lost_bp.post("/")
def create_lost_item():
    """Report a new lost item.

    Accepts multipart/form-data with optional image files.
    Text fields can also be sent as JSON body (application/json).
    """
    # Support both multipart/form-data and JSON payloads
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
        files = request.files.getlist("images")
    else:
        data = request.get_json(silent=True) or {}
        files = []

    # ── Validate ───────────────────────────────────────────────
    errors = validate_item_data(data, require_all=True)
    if errors:
        return validation_error_response(errors)

    # ── Handle images ──────────────────────────────────────────
    saved_images, img_errors = [], []
    if files:
        saved_images, img_errors = process_multiple_images(files, ITEM_TYPE)

    # ── Persist ────────────────────────────────────────────────
    data["images"] = saved_images
    new_item = data_svc.create_item(ITEM_TYPE, data)

    response_data = {
        "item": new_item,
        "image_warnings": img_errors if img_errors else None,
    }
    return created_response(
        data=response_data,
        message="Lost item reported successfully.",
    )


# ──────────────────────────────────────────────────────────────
#  GET /api/lost/<item_id>
# ──────────────────────────────────────────────────────────────
@lost_bp.get("/<string:item_id>")
def get_lost_item(item_id: str):
    """Return a single lost item by ID."""
    item = data_svc.get_item_by_id(ITEM_TYPE, item_id)
    if not item:
        return not_found_response("Lost item")
    return success_response(data=item)


# ──────────────────────────────────────────────────────────────
#  PUT /api/lost/<item_id>
# ──────────────────────────────────────────────────────────────
@lost_bp.put("/<string:item_id>")
def update_lost_item(item_id: str):
    """Update specific fields of an existing lost item.

    Accepts JSON body or multipart/form-data.
    Only provided fields are updated (partial update).
    """
    item = data_svc.get_item_by_id(ITEM_TYPE, item_id)
    if not item:
        return not_found_response("Lost item")

    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
        files = request.files.getlist("images")
    else:
        data = request.get_json(silent=True) or {}
        files = []

    # Validate only present fields (partial update)
    errors = validate_item_data(data, require_all=False)
    if errors:
        return validation_error_response(errors)

    # Process new images if provided
    if files:
        existing_img_count = len(item.get("images", []))
        saved_images, img_errors = process_multiple_images(files, ITEM_TYPE, existing_count=existing_img_count)
        # Append to existing images list
        if saved_images:
            data_svc.append_images_to_item(ITEM_TYPE, item_id, saved_images)

    updated_item = data_svc.update_item(ITEM_TYPE, item_id, data)
    return success_response(data=updated_item, message="Lost item updated successfully.")


# ──────────────────────────────────────────────────────────────
#  DELETE /api/lost/<item_id>
# ──────────────────────────────────────────────────────────────
@lost_bp.delete("/<string:item_id>")
def delete_lost_item(item_id: str):
    """Permanently delete a lost item."""
    item = data_svc.get_item_by_id(ITEM_TYPE, item_id)
    if not item:
        return not_found_response("Lost item")

    deleted = data_svc.delete_item(ITEM_TYPE, item_id)
    if not deleted:
        return error_response("Failed to delete item. Please try again.", 500)

    return no_content_response("Lost item deleted successfully.")

"""
ReConnect – Data Service (JSON Flat-File Persistence)
======================================================
Provides thread-safe read/write operations on the JSON storage files.

All public functions return plain Python dicts/lists so that the
route layer stays free of I/O concerns.

Locking strategy:
    A module-level threading.Lock is used for each file to serialise
    concurrent writes. Reads are lock-free because Python's GIL and
    atomic file-read makes them safe for this demo scale.
"""

import json
import os
import threading
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from flask import current_app

logger = logging.getLogger(__name__)


def _cfg(key: str):
    """Look up a config value from the active Flask app at call time.

    Using current_app (rather than importing Config directly) ensures
    that TestingConfig's overridden paths are respected during tests.
    """
    return current_app.config[key]

# ──────────────────────────────────────────────────────────────
#  File locks – one per storage file
# ──────────────────────────────────────────────────────────────
_lost_lock = threading.Lock()
_found_lock = threading.Lock()


# ──────────────────────────────────────────────────────────────
#  Low-level JSON I/O
# ──────────────────────────────────────────────────────────────

def _read_json(filepath: str) -> List[dict]:
    """Read and parse a JSON file, returning an empty list on any error."""
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to read %s: %s", filepath, exc)
        return []


def _write_json(filepath: str, data: List[dict]) -> None:
    """Atomically write a list of dicts to a JSON file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    tmp_path = filepath + ".tmp"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        os.replace(tmp_path, filepath)   # atomic on POSIX; best-effort on Windows
    except OSError as exc:
        logger.error("Failed to write %s: %s", filepath, exc)
        raise


def _get_file_and_lock(item_type: str):
    """Return (filepath, lock) for the given item type.

    File paths are read from the active Flask app's config at call time
    so that TestingConfig overrides are respected during tests.
    """
    if item_type == "lost":
        return _cfg("LOST_ITEMS_FILE"), _lost_lock
    elif item_type == "found":
        return _cfg("FOUND_ITEMS_FILE"), _found_lock
    else:
        raise ValueError(f"Unknown item_type: {item_type!r}")


# ──────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────

def get_all_items(item_type: str) -> List[dict]:
    """Return all items of the given type.

    Args:
        item_type: "lost" or "found"

    Returns:
        List of item dicts, newest first.
    """
    filepath, _ = _get_file_and_lock(item_type)
    items = _read_json(filepath)
    # Sort newest first by created_at
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return items


def get_item_by_id(item_type: str, item_id: str) -> Optional[dict]:
    """Return a single item by its ID, or None if not found.

    Args:
        item_type: "lost" or "found"
        item_id:   The UUID string of the item.

    Returns:
        Item dict or None.
    """
    items = get_all_items(item_type)
    for item in items:
        if item.get("id") == item_id:
            return item
    return None


def create_item(item_type: str, data: Dict[str, Any]) -> dict:
    """Create and persist a new item.

    Args:
        item_type: "lost" or "found"
        data:      Validated field dict from the request.

    Returns:
        The newly created item dict (with generated id, timestamps).
    """
    filepath, lock = _get_file_and_lock(item_type)
    now = _utcnow()

    new_item = {
        "id": f"{item_type}-{uuid.uuid4().hex[:8]}",
        "type": item_type,
        "item_name": _clean(data.get("item_name")),
        "category": _clean(data.get("category")),
        "color": _clean(data.get("color")),
        "brand": _clean(data.get("brand", "")),
        "description": _clean(data.get("description")),
        "location": _clean(data.get("location")),
        "date": _clean(data.get("date")),
        "contact_name": _clean(data.get("contact_name")),
        "contact_email": _clean(data.get("contact_email", "")).lower(),
        "contact_phone": _clean(data.get("contact_phone", "")),
        "images": data.get("images", []),
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    with lock:
        items = _read_json(filepath)
        items.append(new_item)
        _write_json(filepath, items)

    logger.info("Created %s item: %s", item_type, new_item["id"])
    return new_item


def update_item(item_type: str, item_id: str, data: Dict[str, Any]) -> Optional[dict]:
    """Update specific fields of an existing item.

    Args:
        item_type: "lost" or "found"
        item_id:   Item UUID string.
        data:      Partial field dict with updated values.

    Returns:
        Updated item dict, or None if item was not found.
    """
    filepath, lock = _get_file_and_lock(item_type)
    updatable_fields = {
        "item_name", "category", "color", "brand",
        "description", "location", "date",
        "contact_name", "contact_email", "contact_phone",
        "images", "status",
    }

    with lock:
        items = _read_json(filepath)
        updated = None
        for i, item in enumerate(items):
            if item.get("id") == item_id:
                for field in updatable_fields:
                    if field in data:
                        items[i][field] = data[field]
                items[i]["updated_at"] = _utcnow()
                updated = items[i]
                break

        if updated:
            _write_json(filepath, items)
            logger.info("Updated %s item: %s", item_type, item_id)

    return updated


def delete_item(item_type: str, item_id: str) -> bool:
    """Delete an item by ID.

    Args:
        item_type: "lost" or "found"
        item_id:   Item UUID string.

    Returns:
        True if the item was found and deleted, False otherwise.
    """
    filepath, lock = _get_file_and_lock(item_type)

    with lock:
        items = _read_json(filepath)
        original_count = len(items)
        items = [item for item in items if item.get("id") != item_id]

        if len(items) == original_count:
            return False  # Nothing was removed

        _write_json(filepath, items)

    logger.info("Deleted %s item: %s", item_type, item_id)
    return True


def append_images_to_item(item_type: str, item_id: str, filenames: List[str]) -> Optional[dict]:
    """Add image filenames to an existing item.

    Args:
        item_type:  "lost" or "found"
        item_id:    Item UUID string.
        filenames:  List of stored filenames to append.

    Returns:
        Updated item dict, or None if item was not found.
    """
    filepath, lock = _get_file_and_lock(item_type)

    with lock:
        items = _read_json(filepath)
        updated = None
        for i, item in enumerate(items):
            if item.get("id") == item_id:
                existing = items[i].get("images", [])
                combined = existing + filenames
                # Enforce per-item image limit
                items[i]["images"] = combined[: _cfg("MAX_IMAGES_PER_ITEM")]
                items[i]["updated_at"] = _utcnow()
                updated = items[i]
                break

        if updated:
            _write_json(filepath, items)

    return updated


def get_all_items_combined() -> List[dict]:
    """Return all lost AND found items merged into one list."""
    return get_all_items("lost") + get_all_items("found")


def get_statistics() -> dict:
    """Compute platform statistics from storage.

    Returns:
        Dict with counts and category breakdowns.
    """
    lost_items = get_all_items("lost")
    found_items = get_all_items("found")

    def category_counts(items: List[dict]) -> dict:
        counts = {}
        for item in items:
            cat = item.get("category", "Other")
            counts[cat] = counts.get(cat, 0) + 1
        return counts

    def status_counts(items: List[dict]) -> dict:
        counts = {}
        for item in items:
            s = item.get("status", "active")
            counts[s] = counts.get(s, 0) + 1
        return counts

    total_lost = len(lost_items)
    total_found = len(found_items)

    resolved_lost = sum(1 for i in lost_items if i.get("status") == "resolved")
    resolved_found = sum(1 for i in found_items if i.get("status") == "resolved")

    return {
        "total_lost": total_lost,
        "total_found": total_found,
        "total_items": total_lost + total_found,
        "total_resolved": resolved_lost + resolved_found,
        "active_lost": total_lost - resolved_lost,
        "active_found": total_found - resolved_found,
        "lost_by_category": category_counts(lost_items),
        "found_by_category": category_counts(found_items),
        "lost_by_status": status_counts(lost_items),
        "found_by_status": status_counts(found_items),
    }


# ──────────────────────────────────────────────────────────────
#  Private helpers
# ──────────────────────────────────────────────────────────────

def _utcnow() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _clean(value: Any) -> str:
    """Strip and stringify a value."""
    if value is None:
        return ""
    return str(value).strip()

"""
ReConnect – Match Routes
==========================
Exposes the smart matching engine via REST endpoints.

Endpoints:
    GET /api/match/lost/<lost_id>      → Matches for a lost item (vs all found)
    GET /api/match/found/<found_id>    → Matches for a found item (vs all lost)
    GET /api/match/preview/<lost_id>   → Top-3 preview matches (for item detail cards)

Each match result shape:
    {
        "item": { ...found/lost item dict... },
        "score": 87.5,
        "score_breakdown": {
            "category": 30.0,
            "name": 22.5,
            "color": 9.0,
            "location": 8.0,
            "brand": 8.0,
            "date": 4.0,
            "description": 4.0
        },
        "matched_fields": ["category", "color", "item_name", "location"]
    }
"""

import logging
from flask import Blueprint, request

import services.data_service as data_svc
from services.matching_engine import find_matches_for_lost, find_matches_for_found
from utils.response_helpers import success_response, not_found_response

logger = logging.getLogger(__name__)

match_bp = Blueprint("match", __name__)


# ──────────────────────────────────────────────────────────────
#  GET /api/match/lost/<lost_id>
# ──────────────────────────────────────────────────────────────
@match_bp.get("/lost/<string:lost_id>")
def match_for_lost_item(lost_id: str):
    """Find all found items that potentially match a given lost item.

    Path Parameters:
        lost_id: ID of the lost item.

    Query Parameters:
        min_score (float): Override minimum confidence threshold (default from config).

    Returns:
        Sorted list of match results (highest confidence first).
    """
    lost_item = data_svc.get_item_by_id("lost", lost_id)
    if not lost_item:
        return not_found_response("Lost item")

    found_items = data_svc.get_all_items("found")

    # Allow caller to override min score
    from config import Config
    try:
        min_score = float(request.args.get("min_score", Config.MATCH_MIN_SCORE))
    except (ValueError, TypeError):
        min_score = Config.MATCH_MIN_SCORE

    matches = find_matches_for_lost(lost_item, found_items)

    # Apply per-request min_score override (engine already applies config default)
    matches = [m for m in matches if m["score"] >= min_score]

    return success_response(
        data={
            "query_item": lost_item,
            "matches": matches,
            "total_matches": len(matches),
        },
        message=f"Found {len(matches)} potential match(es) for this lost item.",
    )


# ──────────────────────────────────────────────────────────────
#  GET /api/match/found/<found_id>
# ──────────────────────────────────────────────────────────────
@match_bp.get("/found/<string:found_id>")
def match_for_found_item(found_id: str):
    """Find all lost items that potentially match a given found item.

    Path Parameters:
        found_id: ID of the found item.

    Query Parameters:
        min_score (float): Override minimum confidence threshold.

    Returns:
        Sorted list of match results (highest confidence first).
    """
    found_item = data_svc.get_item_by_id("found", found_id)
    if not found_item:
        return not_found_response("Found item")

    lost_items = data_svc.get_all_items("lost")

    from config import Config
    try:
        min_score = float(request.args.get("min_score", Config.MATCH_MIN_SCORE))
    except (ValueError, TypeError):
        min_score = Config.MATCH_MIN_SCORE

    matches = find_matches_for_found(found_item, lost_items)
    matches = [m for m in matches if m["score"] >= min_score]

    return success_response(
        data={
            "query_item": found_item,
            "matches": matches,
            "total_matches": len(matches),
        },
        message=f"Found {len(matches)} potential match(es) for this found item.",
    )


# ──────────────────────────────────────────────────────────────
#  GET /api/match/preview/<lost_id>
# ──────────────────────────────────────────────────────────────
@match_bp.get("/preview/<string:lost_id>")
def match_preview(lost_id: str):
    """Return top-3 quick match previews for a lost item detail card.

    Lighter response payload — only score, item_name, category, and id.
    Used by the frontend to show match teasers on item detail pages.
    """
    lost_item = data_svc.get_item_by_id("lost", lost_id)
    if not lost_item:
        return not_found_response("Lost item")

    found_items = data_svc.get_all_items("found")
    matches = find_matches_for_lost(lost_item, found_items)

    previews = [
        {
            "id": m["item"]["id"],
            "item_name": m["item"]["item_name"],
            "category": m["item"]["category"],
            "location": m["item"]["location"],
            "date": m["item"]["date"],
            "score": m["score"],
            "matched_fields": m["matched_fields"],
        }
        for m in matches[:3]
    ]

    return success_response(
        data={
            "lost_item_id": lost_id,
            "top_matches": previews,
        },
        message=f"Top {len(previews)} match preview(s).",
    )

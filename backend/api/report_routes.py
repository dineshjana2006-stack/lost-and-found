"""
ReConnect – Report Routes
==========================
Exposes the Match Analysis Report feature via REST endpoints.

Endpoints:
    GET  /api/report/<lost_id>/<found_id>         → Full match analysis report
    PATCH /api/report/<lost_id>/<found_id>/resolve → Mark both items resolved
    GET  /api/report/recent                        → List recent reports
"""

import logging
from flask import Blueprint, request

import services.data_service as data_svc
import services.report_service as report_svc
from services.matching_engine import _compute_score
from utils.response_helpers import success_response, not_found_response, error_response

logger = logging.getLogger(__name__)

report_bp = Blueprint("report", __name__)


# ──────────────────────────────────────────────────────────────
#  GET /api/report/<lost_id>/<found_id>
# ──────────────────────────────────────────────────────────────
@report_bp.get("/<string:lost_id>/<string:found_id>")
def get_match_report(lost_id: str, found_id: str):
    """Fetch or generate a full Match Analysis Report for a lost+found pair.

    If the report was previously computed and cached, it is returned
    instantly from storage. Otherwise the matching engine is called,
    the report is generated and persisted, then returned.

    Path Parameters:
        lost_id:  ID of the lost item (e.g. "lost-a1b2c3d4")
        found_id: ID of the found item (e.g. "found-e5f6g7h8")

    Returns:
        Full report dict including both item objects, score, breakdown,
        matched_fields, conclusion, and timeline.
    """
    # Fetch both items
    lost_item = data_svc.get_item_by_id("lost", lost_id)
    if not lost_item:
        return not_found_response(f"Lost item '{lost_id}'")

    found_item = data_svc.get_item_by_id("found", found_id)
    if not found_item:
        return not_found_response(f"Found item '{found_id}'")

    # Check for a cached report first
    cached = report_svc.get_report_by_ids(lost_id, found_id)
    if cached:
        # Always refresh the live item data in case they were updated
        cached["lost_item"]  = lost_item
        cached["found_item"] = found_item
        return success_response(
            data={"report": cached},
            message="Match analysis report retrieved from cache.",
        )

    # Run scoring
    score, breakdown, matched_fields = _compute_score(lost_item, found_item)
    score = round(score, 1)

    # Create and persist the report
    report = report_svc.get_or_create_report(
        lost_item=lost_item,
        found_item=found_item,
        score=score,
        score_breakdown=breakdown,
        matched_fields=matched_fields,
    )

    return success_response(
        data={"report": report},
        message="Match analysis report generated successfully.",
    )


# ──────────────────────────────────────────────────────────────
#  PATCH /api/report/<lost_id>/<found_id>/resolve
# ──────────────────────────────────────────────────────────────
@report_bp.patch("/<string:lost_id>/<string:found_id>/resolve")
def resolve_match(lost_id: str, found_id: str):
    """Mark both items and the match report as resolved.

    This signals that the lost item has been successfully returned
    to its owner via this match.
    """
    # Verify both items exist
    lost_item = data_svc.get_item_by_id("lost", lost_id)
    if not lost_item:
        return not_found_response(f"Lost item '{lost_id}'")

    found_item = data_svc.get_item_by_id("found", found_id)
    if not found_item:
        return not_found_response(f"Found item '{found_id}'")

    # Update both items to resolved
    data_svc.update_item("lost",  lost_id,  {"status": "resolved"})
    data_svc.update_item("found", found_id, {"status": "resolved"})

    # Update report status
    report_svc.update_report_status(lost_id, found_id, "resolved")

    logger.info("Match resolved: %s ↔ %s", lost_id, found_id)
    return success_response(
        data={
            "lost_id":  lost_id,
            "found_id": found_id,
            "status":   "resolved",
        },
        message="Both items have been marked as resolved. Case closed! 🎉",
    )


# ──────────────────────────────────────────────────────────────
#  GET /api/report/recent
# ──────────────────────────────────────────────────────────────
@report_bp.get("/recent")
def get_recent_reports():
    """Return a list of recently generated/accessed match reports.

    Query Parameters:
        limit (int): Max reports to return (default 20, max 50).
    """
    try:
        limit = min(int(request.args.get("limit", 20)), 50)
    except (ValueError, TypeError):
        limit = 20

    reports = report_svc.get_recent_reports(limit=limit)

    # Strip full item blobs for the listing (just IDs + summary)
    summaries = [
        {
            "report_id":    r.get("report_id"),
            "lost_id":      r.get("lost_id"),
            "found_id":     r.get("found_id"),
            "score":        r.get("score"),
            "status":       r.get("status"),
            "computed_at":  r.get("computed_at"),
            "last_accessed": r.get("last_accessed"),
            "lost_name":    r.get("lost_item", {}).get("item_name", ""),
            "found_name":   r.get("found_item", {}).get("item_name", ""),
        }
        for r in reports
    ]

    return success_response(
        data={"reports": summaries, "total": len(summaries)},
        message=f"Retrieved {len(summaries)} recent report(s).",
    )

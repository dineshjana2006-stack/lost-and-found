"""
ReConnect – Statistics Routes
================================
Endpoints:
    GET /api/stats          → Full platform statistics
    GET /api/stats/summary  → Compact stats summary for hero/dashboard widgets
"""

import logging
from flask import Blueprint

import services.data_service as data_svc
from services.matching_engine import find_matches_for_lost
from utils.response_helpers import success_response

logger = logging.getLogger(__name__)

stats_bp = Blueprint("stats", __name__)


# ──────────────────────────────────────────────────────────────
#  GET /api/stats
# ──────────────────────────────────────────────────────────────
@stats_bp.get("/")
def get_statistics():
    """Return comprehensive platform statistics.

    Returns:
        {
            total_lost:        8,
            total_found:       10,
            total_items:       18,
            total_resolved:    4,
            active_lost:       7,
            active_found:      9,
            lost_by_category:  { "Electronics": 3, ... },
            found_by_category: { "Electronics": 2, ... },
            lost_by_status:    { "active": 7, "resolved": 1 },
            found_by_status:   { "active": 9, "resolved": 1 },
            match_rate_pct:    22.2,
        }
    """
    stats = data_svc.get_statistics()

    # Compute approximate match rate
    total = stats["total_items"]
    resolved = stats["total_resolved"]
    stats["match_rate_pct"] = round((resolved / total * 100) if total > 0 else 0, 1)

    return success_response(data=stats, message="Statistics loaded successfully.")


# ──────────────────────────────────────────────────────────────
#  GET /api/stats/summary
# ──────────────────────────────────────────────────────────────
@stats_bp.get("/summary")
def get_summary():
    """Return a minimal stats object for hero section counters.

    Designed for lightweight frontend widgets — only the numbers
    users see on the landing page.

    Returns:
        {
            total_reports: 18,
            items_reunited: 4,
            active_searches: 16,
            cities_covered: 3
        }
    """
    stats = data_svc.get_statistics()

    # Count distinct locations (cities) as a proxy metric
    all_items = data_svc.get_all_items_combined()
    locations = set()
    for item in all_items:
        loc = item.get("location", "")
        # Heuristic: take the last part after the last comma as the city
        if "," in loc:
            city = loc.rsplit(",", 1)[-1].strip()
        else:
            city = loc.strip()
        if city:
            locations.add(city.lower())

    summary = {
        "total_reports": stats["total_items"],
        "items_reunited": stats["total_resolved"],
        "active_searches": stats["active_lost"] + stats["active_found"],
        "cities_covered": len(locations),
    }

    return success_response(data=summary, message="Summary loaded.")

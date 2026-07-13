"""
ReConnect – Report Service
===========================
Manages persistent Match Analysis Reports stored in match_reports.json.

Each report captures a full scored comparison between one lost item and one
found item, so the analysis page can be loaded instantly without re-running
the matching engine on every visit.

Public API:
    get_or_create_report(lost_item, found_item, score_data) → dict
    get_report_by_ids(lost_id, found_id)                    → Optional[dict]
    update_report_status(lost_id, found_id, status)         → Optional[dict]
    get_recent_reports(limit)                               → List[dict]
    delete_report(lost_id, found_id)                        → bool
"""

import json
import os
import uuid
import logging
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from flask import current_app

logger = logging.getLogger(__name__)

_report_lock = threading.Lock()


# ──────────────────────────────────────────────────────────────
#  Low-level I/O  (mirrors data_service pattern)
# ──────────────────────────────────────────────────────────────

def _reports_file() -> str:
    return current_app.config["MATCH_REPORTS_FILE"]


def _read_reports() -> List[dict]:
    filepath = _reports_file()
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to read match_reports: %s", exc)
        return []


def _write_reports(data: List[dict]) -> None:
    filepath = _reports_file()
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    tmp = filepath + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        os.replace(tmp, filepath)
    except OSError as exc:
        logger.error("Failed to write match_reports: %s", exc)
        raise


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_report_id(lost_id: str, found_id: str) -> str:
    """Deterministic composite report ID from both item IDs."""
    return f"rpt-{uuid.uuid5(uuid.NAMESPACE_DNS, f'{lost_id}:{found_id}').hex[:12]}"


# ──────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────

def get_or_create_report(
    lost_item: dict,
    found_item: dict,
    score: float,
    score_breakdown: dict,
    matched_fields: List[str],
) -> dict:
    """Retrieve an existing match report or create and persist a new one.

    Args:
        lost_item:       Full lost item dict.
        found_item:      Full found item dict.
        score:           Overall match confidence (0–100).
        score_breakdown: Per-field weighted scores.
        matched_fields:  List of field names that matched.

    Returns:
        The persisted match report dict.
    """
    lost_id  = lost_item["id"]
    found_id = found_item["id"]

    with _report_lock:
        reports = _read_reports()

        # Check for existing report
        for r in reports:
            if r.get("lost_id") == lost_id and r.get("found_id") == found_id:
                # Refresh last_accessed timestamp
                r["last_accessed"] = _utcnow()
                _write_reports(reports)
                return r

        # Build AI conclusion text
        conclusion = _generate_conclusion(
            lost_item, found_item, score, score_breakdown, matched_fields
        )

        # Build new report
        now = _utcnow()
        report = {
            "report_id":      _make_report_id(lost_id, found_id),
            "lost_id":        lost_id,
            "found_id":       found_id,
            "lost_item":      lost_item,
            "found_item":     found_item,
            "score":          round(score, 1),
            "score_breakdown": score_breakdown,
            "matched_fields": matched_fields,
            "conclusion":     conclusion,
            "status":         "active",
            "computed_at":    now,
            "last_accessed":  now,
        }

        reports.append(report)
        _write_reports(reports)
        logger.info("Created match report: %s", report["report_id"])
        return report


def get_report_by_ids(lost_id: str, found_id: str) -> Optional[dict]:
    """Fetch a stored match report by its constituent item IDs."""
    reports = _read_reports()
    for r in reports:
        if r.get("lost_id") == lost_id and r.get("found_id") == found_id:
            return r
    return None


def update_report_status(lost_id: str, found_id: str, status: str) -> Optional[dict]:
    """Update the status of a match report (e.g. active → resolved)."""
    with _report_lock:
        reports = _read_reports()
        updated = None
        for r in reports:
            if r.get("lost_id") == lost_id and r.get("found_id") == found_id:
                r["status"] = status
                r["last_accessed"] = _utcnow()
                updated = r
                break
        if updated:
            _write_reports(reports)
        return updated


def get_recent_reports(limit: int = 20) -> List[dict]:
    """Return the most recently accessed/created reports."""
    reports = _read_reports()
    reports.sort(key=lambda r: r.get("last_accessed", ""), reverse=True)
    return reports[:limit]


def delete_report(lost_id: str, found_id: str) -> bool:
    """Delete a match report by its item IDs."""
    with _report_lock:
        reports = _read_reports()
        original = len(reports)
        reports = [
            r for r in reports
            if not (r.get("lost_id") == lost_id and r.get("found_id") == found_id)
        ]
        if len(reports) == original:
            return False
        _write_reports(reports)
        return True


# ──────────────────────────────────────────────────────────────
#  AI Conclusion Generator
# ──────────────────────────────────────────────────────────────

def _generate_conclusion(
    lost: dict,
    found: dict,
    score: float,
    breakdown: dict,
    matched_fields: List[str],
) -> dict:
    """Generate a structured AI-style analysis conclusion.

    Returns a dict with:
        summary       – one-paragraph overall summary
        matching      – list of matching attribute sentences
        non_matching  – list of differing attribute sentences
        confidence_label – "High" | "Medium" | "Low"
        recommendation   – recommended next action string
    """
    matching = []
    non_matching = []

    # Category
    lcat = (lost.get("category") or "").strip()
    fcat = (found.get("category") or "").strip()
    if lcat and fcat:
        if lcat.lower() == fcat.lower():
            matching.append(f"Both items belong to the same category: **{lcat}**.")
        else:
            non_matching.append(
                f"Category mismatch — lost item is **{lcat}**, found item is **{fcat}**."
            )

    # Item name
    lname = (lost.get("item_name") or "").strip()
    fname = (found.get("item_name") or "").strip()
    name_score = breakdown.get("name", 0)
    if lname and fname:
        if name_score >= 15:
            matching.append(
                f'Item names are highly similar: "**{lname}**" vs "**{fname}**".'
            )
        elif name_score >= 5:
            matching.append(
                f'Item names share common keywords: "**{lname}**" vs "**{fname}**".'
            )
        else:
            non_matching.append(
                f'Item names differ: "**{lname}**" vs "**{fname}**".'
            )

    # Color
    lcolor = (lost.get("color") or "").strip()
    fcolor = (found.get("color") or "").strip()
    color_score = breakdown.get("color", 0)
    if lcolor and fcolor:
        if color_score >= 12:
            matching.append(f"Colors match exactly: both described as **{lcolor}**.")
        elif color_score >= 6:
            matching.append(
                f"Colors are in the same family: **{lcolor}** (lost) vs **{fcolor}** (found)."
            )
        else:
            non_matching.append(
                f"Color mismatch: **{lcolor}** (lost) vs **{fcolor}** (found)."
            )

    # Brand
    lbrand = (lost.get("brand") or "").strip()
    fbrand = (found.get("brand") or "").strip()
    brand_score = breakdown.get("brand", 0)
    if lbrand and fbrand:
        if brand_score >= 8:
            matching.append(f"Brand matches: both are **{lbrand}**.")
        else:
            non_matching.append(
                f"Brand mismatch: **{lbrand}** (lost) vs **{fbrand}** (found)."
            )
    elif not lbrand and not fbrand:
        matching.append("Neither report specifies a brand — this field is neutral.")

    # Location
    lloc = (lost.get("location") or "").strip()
    floc = (found.get("location") or "").strip()
    loc_score = breakdown.get("location", 0)
    if lloc and floc:
        if loc_score >= 6:
            matching.append(
                f"Locations overlap significantly: **{lloc}** and **{floc}**."
            )
        elif loc_score >= 2:
            matching.append(
                f"Locations share some keywords: **{lloc}** vs **{floc}**."
            )
        else:
            non_matching.append(
                f"Locations differ: lost in **{lloc}**, found in **{floc}**."
            )

    # Date
    ldate = (lost.get("date") or "").strip()
    fdate = (found.get("date") or "").strip()
    date_score = breakdown.get("date", 0)
    if ldate and fdate:
        if date_score >= 4:
            matching.append(
                f"Dates are very close — lost on **{ldate}**, found on **{fdate}**."
            )
        elif date_score >= 2:
            matching.append(
                f"Dates are within a reasonable window: **{ldate}** (lost) vs **{fdate}** (found)."
            )
        else:
            non_matching.append(
                f"Significant time gap between dates: **{ldate}** (lost) vs **{fdate}** (found)."
            )

    # Description
    desc_score = breakdown.get("description", 0)
    if desc_score >= 3:
        matching.append("Descriptions share several distinctive keywords.")
    elif desc_score >= 1:
        matching.append("Descriptions have minor keyword overlap.")

    # Confidence label
    if score >= 70:
        confidence_label = "High"
        recommendation = (
            "This is a strong match. We strongly recommend reaching out to the "
            "other party immediately to verify and arrange collection."
        )
        summary = (
            f"This pair has a **{score}% overall confidence score**, indicating a "
            f"**high-probability match**. The analysis of {len(matched_fields)} "
            f"matching field(s) — including "
            f"{', '.join(matched_fields[:3]) if matched_fields else 'several attributes'} "
            f"— strongly suggests these two reports refer to the same item. "
            f"Immediate contact is recommended."
        )
    elif score >= 40:
        confidence_label = "Medium"
        recommendation = (
            "This is a plausible match. Contact the other reporter to verify "
            "additional details such as serial numbers, photos, or identifying marks."
        )
        summary = (
            f"This pair has a **{score}% overall confidence score**, indicating a "
            f"**moderate-probability match**. While some key attributes align, "
            f"there are also differences worth investigating. Verifying additional "
            f"details directly with the other party is recommended."
        )
    else:
        confidence_label = "Low"
        recommendation = (
            "This appears to be a weak match. Review the non-matching attributes "
            "carefully before contacting the other reporter."
        )
        summary = (
            f"This pair has a **{score}% overall confidence score**, indicating a "
            f"**low-probability match**. Only a few attributes align between the "
            f"two reports. This may be a coincidental similarity rather than the "
            f"same item. Proceed with caution."
        )

    return {
        "summary":            summary,
        "matching":           matching,
        "non_matching":       non_matching,
        "confidence_label":   confidence_label,
        "recommendation":     recommendation,
    }

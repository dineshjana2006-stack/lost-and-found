"""
ReConnect – Search Routes
===========================
Endpoints:
    GET /api/search            → Global search across both lost & found items

Query Parameters:
    q         (str)  – keyword (searches name, description, location, brand)
    type      (str)  – "lost" | "found" | "all" (default: "all")
    category  (str)  – filter by category
    color     (str)  – filter by color
    brand     (str)  – filter by brand
    location  (str)  – filter by location keyword
    status    (str)  – filter by status
    sort      (str)  – "newest" | "oldest" | "name" (default: newest)
    page      (int)  – page number
    page_size (int)  – items per page

Also provides:
    GET /api/search/suggestions?q=<term>  → Live search suggestions
    GET /api/search/categories            → List all categories + counts
"""

import logging
from flask import Blueprint, request, current_app

import services.data_service as data_svc
from utils.response_helpers import success_response
from utils.pagination import paginate, parse_pagination_params

logger = logging.getLogger(__name__)

search_bp = Blueprint("search", __name__)


# ──────────────────────────────────────────────────────────────
#  GET /api/search
# ──────────────────────────────────────────────────────────────
@search_bp.get("/")
def global_search():
    """Search across lost and/or found items with multiple filters."""
    args = request.args
    item_type = args.get("type", "all").strip().lower()

    # Gather items based on type filter
    if item_type == "lost":
        items = data_svc.get_all_items("lost")
    elif item_type == "found":
        items = data_svc.get_all_items("found")
    else:
        # Merge both, maintain newest-first order
        lost = data_svc.get_all_items("lost")
        found = data_svc.get_all_items("found")
        items = sorted(
            lost + found,
            key=lambda x: x.get("created_at", ""),
            reverse=True,
        )

    # ── Keyword search ─────────────────────────────────────────
    q = args.get("q", "").strip().lower()
    if q:
        def _matches(item: dict) -> bool:
            searchable = " ".join([
                item.get("item_name", ""),
                item.get("description", ""),
                item.get("location", ""),
                item.get("brand", ""),
                item.get("color", ""),
                item.get("category", ""),
            ]).lower()
            return q in searchable

        items = [i for i in items if _matches(i)]

    # ── Field filters ──────────────────────────────────────────
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

    # Attach summary counts to meta
    meta["query"] = q
    meta["filters"] = {
        "type": item_type,
        "category": category or None,
        "color": color or None,
        "brand": brand or None,
        "location": location or None,
        "status": status or None,
    }

    return success_response(data=page_items, meta=meta)


# ──────────────────────────────────────────────────────────────
#  GET /api/search/suggestions
# ──────────────────────────────────────────────────────────────
@search_bp.get("/suggestions")
def search_suggestions():
    """Return live search suggestions based on a query prefix.

    Query Parameters:
        q     (str)  – search prefix (min 2 characters)
        limit (int)  – max number of suggestions (default 8)

    Returns:
        List of suggestion strings (item names + locations).
    """
    q = request.args.get("q", "").strip().lower()
    if len(q) < 2:
        return success_response(data=[], message="Query too short.")

    limit = min(int(request.args.get("limit", 8)), 20)

    all_items = data_svc.get_all_items_combined()
    suggestions = set()

    for item in all_items:
        name = item.get("item_name", "")
        location = item.get("location", "")
        brand = item.get("brand", "")

        if q in name.lower():
            suggestions.add(name)
        if q in location.lower():
            suggestions.add(location)
        if brand and q in brand.lower():
            suggestions.add(brand)

        if len(suggestions) >= limit * 3:
            break

    # Sort and limit results
    sorted_suggestions = sorted(suggestions, key=lambda s: s.lower())[:limit]

    return success_response(
        data=sorted_suggestions,
        message=f"Found {len(sorted_suggestions)} suggestions.",
    )


# ──────────────────────────────────────────────────────────────
#  GET /api/search/categories
# ──────────────────────────────────────────────────────────────
@search_bp.get("/categories")
def list_categories():
    """Return all categories with item counts for filter UI.

    Returns:
        List of { "category": str, "lost_count": int, "found_count": int, "total": int }
    """
    lost_items = data_svc.get_all_items("lost")
    found_items = data_svc.get_all_items("found")

    def count_by_category(items):
        counts = {}
        for item in items:
            cat = item.get("category", "Other")
            counts[cat] = counts.get(cat, 0) + 1
        return counts

    lost_counts = count_by_category(lost_items)
    found_counts = count_by_category(found_items)

    result = []
    all_categories = set(current_app.config["ITEM_CATEGORIES"]) | set(lost_counts) | set(found_counts)

    for cat in current_app.config["ITEM_CATEGORIES"]:  # Show canonical categories first
        if cat in all_categories:
            l_count = lost_counts.get(cat, 0)
            f_count = found_counts.get(cat, 0)
            result.append({
                "category": cat,
                "lost_count": l_count,
                "found_count": f_count,
                "total": l_count + f_count,
            })
            all_categories.discard(cat)

    # Append any non-standard categories found in the data
    for cat in sorted(all_categories):
        l_count = lost_counts.get(cat, 0)
        f_count = found_counts.get(cat, 0)
        result.append({
            "category": cat,
            "lost_count": l_count,
            "found_count": f_count,
            "total": l_count + f_count,
        })

    return success_response(data=result)

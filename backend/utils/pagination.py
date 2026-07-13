"""
ReConnect – Pagination Helper
==============================
Provides a single utility function that slices a list and returns
both the paginated data and the associated metadata object.

Usage:
    from utils.pagination import paginate

    items, meta = paginate(all_items, page=1, page_size=12)
    return success_response(data=items, meta=meta)
"""

import math
from typing import Any, List, Tuple

from flask import current_app


def paginate(
    items: List[Any],
    page: int = 1,
    page_size: int = None,
) -> Tuple[List[Any], dict]:
    """Slice a list and return (page_items, meta).

    Args:
        items:     Full list of items to paginate.
        page:      1-indexed current page number.
        page_size: Number of items per page (defaults to Config.DEFAULT_PAGE_SIZE).

    Returns:
        A tuple of (sliced list, metadata dict).

    Raises:
        ValueError: If page or page_size are non-positive integers.
    """
    # Apply defaults and clamps
    if page_size is None:
        page_size = current_app.config["DEFAULT_PAGE_SIZE"]

    page_size = min(max(int(page_size), 1), current_app.config["MAX_PAGE_SIZE"])
    page = max(int(page), 1)

    total_items = len(items)
    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1

    # Clamp page to valid range
    page = min(page, total_pages)

    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    meta = {
        "page": page,
        "page_size": page_size,
        "total_items": total_items,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }

    return page_items, meta


def parse_pagination_params(request_args: dict) -> Tuple[int, int]:
    """Parse and validate page / page_size from Flask request.args.

    Args:
        request_args: Flask request.args (ImmutableMultiDict).

    Returns:
        Tuple of (page, page_size) integers.
    """
    try:
        page = int(request_args.get("page", 1))
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = int(request_args.get("page_size", current_app.config["DEFAULT_PAGE_SIZE"]))
    except (ValueError, TypeError):
        page_size = current_app.config["DEFAULT_PAGE_SIZE"]

    page = max(page, 1)
    page_size = min(max(page_size, 1), current_app.config["MAX_PAGE_SIZE"])

    return page, page_size

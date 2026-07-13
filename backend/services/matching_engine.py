"""
ReConnect – Smart Matching Engine
===================================
Computes a weighted confidence score (0–100) between a lost item
and a found item, then returns matches sorted highest → lowest.

Scoring Weights (configured in config.py):
┌─────────────────────┬────────┐
│ Field               │ Weight │
├─────────────────────┼────────┤
│ Category            │  30 %  │
│ Item Name (fuzzy)   │  25 %  │
│ Color               │  15 %  │
│ Location (fuzzy)    │  10 %  │
│ Brand (fuzzy)       │  10 %  │
│ Date proximity      │   5 %  │
│ Description keyword │   5 %  │
└─────────────────────┴────────┘

Algorithms used:
  - Exact match for category
  - Case-insensitive token overlap ratio for name, brand, location, description
  - Colour family grouping for partial colour matches
  - Exponential decay on date distance (days between lost and found dates)

Usage:
    from services.matching_engine import find_matches_for_lost, find_matches_for_found

    matches = find_matches_for_lost(lost_item, all_found_items)
    # → [{"item": {...}, "score": 87.5, "matched_fields": [...]}, ...]
"""

import re
import logging
import math
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple

from flask import current_app

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
#  Colour family groups for partial colour matching
# ──────────────────────────────────────────────────────────────
COLOUR_FAMILIES: List[List[str]] = [
    ["black", "charcoal", "graphite", "dark", "ebony", "noir"],
    ["white", "cream", "ivory", "off-white", "beige", "snow"],
    ["grey", "gray", "silver", "slate", "ash"],
    ["red", "crimson", "scarlet", "maroon", "burgundy", "rose"],
    ["blue", "navy", "cobalt", "royal", "sky", "teal", "cyan", "turquoise"],
    ["green", "olive", "lime", "emerald", "sage", "mint", "forest"],
    ["yellow", "gold", "amber", "mustard", "lemon"],
    ["orange", "peach", "coral", "tangerine"],
    ["pink", "magenta", "fuchsia", "lavender"],
    ["purple", "violet", "indigo", "plum"],
    ["brown", "tan", "khaki", "caramel", "chocolate", "coffee"],
    ["multicolor", "multi-color", "multicolour", "mixed", "pattern"],
]

# Build a fast lookup: colour_word → family_index
_COLOUR_FAMILY_MAP: Dict[str, int] = {}
for _idx, _family in enumerate(COLOUR_FAMILIES):
    for _word in _family:
        _COLOUR_FAMILY_MAP[_word] = _idx


# ──────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────

def find_matches_for_lost(
    lost_item: dict,
    found_items: List[dict],
) -> List[dict]:
    """Find found items that potentially match a lost item.

    Args:
        lost_item:   A single lost item dict from storage.
        found_items: All found items from storage.

    Returns:
        List of match result dicts, sorted by score descending.
        Each result:
        {
            "item":           <found item dict>,
            "score":          87.5,           # 0–100 confidence
            "matched_fields": ["category", "color", "location"],
            "score_breakdown": {
                "category": 30.0,
                "name": 18.5,
                ...
            }
        }
    """
    results = []

    for found_item in found_items:
        if found_item.get("status") == "resolved":
            continue  # Skip already-resolved found items

        score, breakdown, matched_fields = _compute_score(lost_item, found_item)

        if score >= current_app.config["MATCH_MIN_SCORE"]:
            results.append({
                "item": found_item,
                "score": round(score, 1),
                "score_breakdown": breakdown,
                "matched_fields": matched_fields,
            })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[: current_app.config["MATCH_MAX_RESULTS"]]


def find_matches_for_found(
    found_item: dict,
    lost_items: List[dict],
) -> List[dict]:
    """Find lost items that potentially match a found item.

    Args:
        found_item: A single found item dict from storage.
        lost_items: All lost items from storage.

    Returns:
        Same structure as find_matches_for_lost, but each result's
        'item' key contains a lost item dict.
    """
    results = []

    for lost_item in lost_items:
        if lost_item.get("status") == "resolved":
            continue

        score, breakdown, matched_fields = _compute_score(lost_item, found_item)

        if score >= current_app.config["MATCH_MIN_SCORE"]:
            results.append({
                "item": lost_item,
                "score": round(score, 1),
                "score_breakdown": breakdown,
                "matched_fields": matched_fields,
            })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[: current_app.config["MATCH_MAX_RESULTS"]]


# ──────────────────────────────────────────────────────────────
#  Core scoring function
# ──────────────────────────────────────────────────────────────

def _compute_score(
    lost: dict, found: dict
) -> Tuple[float, Dict[str, float], List[str]]:
    """Compute the weighted similarity score between a lost and found item.

    Returns:
        Tuple of (total_score, score_breakdown_dict, matched_field_names).
    """
    breakdown: Dict[str, float] = {}
    matched_fields: List[str] = []

    # 1. Category (30%) ─────────────────────────────────────────
    cat_score = _score_category(
        lost.get("category", ""),
        found.get("category", ""),
    )
    breakdown["category"] = round(cat_score * current_app.config["MATCH_WEIGHT_CATEGORY"], 2)
    if cat_score > 0:
        matched_fields.append("category")

    # 2. Item name (25%) ────────────────────────────────────────
    name_score = _token_overlap(
        lost.get("item_name", ""),
        found.get("item_name", ""),
    )
    breakdown["name"] = round(name_score * current_app.config["MATCH_WEIGHT_NAME"], 2)
    if name_score >= 0.3:
        matched_fields.append("item_name")

    # 3. Color (15%) ────────────────────────────────────────────
    color_score = _score_color(
        lost.get("color", ""),
        found.get("color", ""),
    )
    breakdown["color"] = round(color_score * current_app.config["MATCH_WEIGHT_COLOR"], 2)
    if color_score > 0:
        matched_fields.append("color")

    # 4. Location (10%) ─────────────────────────────────────────
    loc_score = _token_overlap(
        lost.get("location", ""),
        found.get("location", ""),
    )
    breakdown["location"] = round(loc_score * current_app.config["MATCH_WEIGHT_LOCATION"], 2)
    if loc_score >= 0.2:
        matched_fields.append("location")

    # 5. Brand (10%) ────────────────────────────────────────────
    brand_score = _score_brand(
        lost.get("brand", ""),
        found.get("brand", ""),
    )
    breakdown["brand"] = round(brand_score * current_app.config["MATCH_WEIGHT_BRAND"], 2)
    if brand_score >= 0.5:
        matched_fields.append("brand")

    # 6. Date proximity (5%) ────────────────────────────────────
    date_score = _score_date_proximity(
        lost.get("date", ""),
        found.get("date", ""),
    )
    breakdown["date"] = round(date_score * current_app.config["MATCH_WEIGHT_DATE"], 2)
    if date_score >= 0.5:
        matched_fields.append("date")

    # 7. Description keyword overlap (5%) ───────────────────────
    desc_score = _keyword_overlap(
        lost.get("description", ""),
        found.get("description", ""),
    )
    breakdown["description"] = round(desc_score * current_app.config["MATCH_WEIGHT_DESCRIPTION"], 2)
    if desc_score >= 0.3:
        matched_fields.append("description")

    total = sum(breakdown.values())
    return total, breakdown, matched_fields


# ──────────────────────────────────────────────────────────────
#  Individual scoring functions
# ──────────────────────────────────────────────────────────────

def _score_category(cat_a: str, cat_b: str) -> float:
    """Return 1.0 for exact category match, 0.0 otherwise."""
    if not cat_a or not cat_b:
        return 0.0
    return 1.0 if cat_a.strip().lower() == cat_b.strip().lower() else 0.0


def _score_color(color_a: str, color_b: str) -> float:
    """Score colour similarity.

    Returns:
        1.0  – exact word match
        0.6  – both colours are in the same colour family
        0.0  – no match or missing values
    """
    if not color_a or not color_b:
        return 0.0

    tokens_a = _tokenise(color_a)
    tokens_b = _tokenise(color_b)

    if not tokens_a or not tokens_b:
        return 0.0

    # Exact token overlap
    common = tokens_a & tokens_b
    if common:
        return 1.0

    # Colour family matching
    families_a = {_COLOUR_FAMILY_MAP[t] for t in tokens_a if t in _COLOUR_FAMILY_MAP}
    families_b = {_COLOUR_FAMILY_MAP[t] for t in tokens_b if t in _COLOUR_FAMILY_MAP}

    if families_a & families_b:
        return 0.6

    return 0.0


def _score_brand(brand_a: str, brand_b: str) -> float:
    """Score brand similarity.

    Returns:
        1.0  – exact match
        0.8  – one contains the other
        token overlap ratio otherwise
    """
    if not brand_a or not brand_b:
        # Both empty → neutral (not a match, not a mismatch)
        return 0.3 if (not brand_a and not brand_b) else 0.0

    a = brand_a.strip().lower()
    b = brand_b.strip().lower()

    if a == b:
        return 1.0
    if a in b or b in a:
        return 0.8

    return _token_overlap(brand_a, brand_b)


def _score_date_proximity(date_a: str, date_b: str) -> float:
    """Score date proximity using exponential decay.

    Logic: found dates close to the lost date score higher.
    A 0-day gap → 1.0; 7-day gap → ~0.5; 30-day gap → ~0.1; >60 days → ~0.0

    Args:
        date_a: Lost item date (YYYY-MM-DD).
        date_b: Found item date (YYYY-MM-DD).

    Returns:
        Score in [0, 1].
    """
    if not date_a or not date_b:
        return 0.0

    try:
        d_a = datetime.strptime(date_a, "%Y-%m-%d").date()
        d_b = datetime.strptime(date_b, "%Y-%m-%d").date()
    except ValueError:
        return 0.0

    days_diff = abs((d_b - d_a).days)

    # Found date should not be before lost date (but we allow same day)
    if d_b < d_a:
        # Found before lost → unlikely but score partially
        days_diff += 3  # penalty

    # Exponential decay: half-life ≈ 7 days
    import math
    score = math.exp(-0.1 * days_diff)
    return min(max(score, 0.0), 1.0)


def _token_overlap(text_a: str, text_b: str) -> float:
    """Compute the Jaccard-like token overlap ratio between two strings.

    Steps:
        1. Tokenise both strings into lowercase alphanumeric words.
        2. Remove common stopwords.
        3. Compute |intersection| / |union|.

    Returns:
        Float in [0, 1].
    """
    if not text_a or not text_b:
        return 0.0

    tokens_a = _tokenise(text_a)
    tokens_b = _tokenise(text_b)

    # Remove stopwords
    tokens_a -= _STOPWORDS
    tokens_b -= _STOPWORDS

    if not tokens_a and not tokens_b:
        return 0.0
    if not tokens_a or not tokens_b:
        return 0.0

    intersection = len(tokens_a & tokens_b)
    union = len(tokens_a | tokens_b)

    if union == 0:
        return 0.0

    return intersection / union


def _keyword_overlap(desc_a: str, desc_b: str) -> float:
    """Compute meaningful keyword overlap between two descriptions.

    Uses token overlap, but also gives a bonus for shared bigrams
    (consecutive word pairs) which can catch distinctive phrases.

    Returns:
        Float in [0, 1].
    """
    base = _token_overlap(desc_a, desc_b)

    # Bigram bonus
    bigrams_a = _bigrams(desc_a)
    bigrams_b = _bigrams(desc_b)

    if bigrams_a and bigrams_b:
        shared_bigrams = bigrams_a & bigrams_b
        bonus = min(len(shared_bigrams) * 0.05, 0.2)
        return min(base + bonus, 1.0)

    return base


# ──────────────────────────────────────────────────────────────
#  Tokenisation helpers
# ──────────────────────────────────────────────────────────────

_TOKEN_REGEX = re.compile(r"[a-z0-9]+")

_STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "of", "to",
    "for", "with", "my", "it", "is", "was", "its", "this", "that",
    "i", "we", "has", "have", "had", "been", "near", "from",
}


def _tokenise(text: str) -> set:
    """Lower-case and tokenise a string into a set of words."""
    return set(_TOKEN_REGEX.findall(text.lower()))


def _bigrams(text: str) -> set:
    """Extract a set of word bigrams (pairs) from a string."""
    words = _TOKEN_REGEX.findall(text.lower())
    words = [w for w in words if w not in _STOPWORDS and len(w) > 2]
    return {(words[i], words[i + 1]) for i in range(len(words) - 1)}

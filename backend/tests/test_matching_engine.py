"""
ReConnect – Tests for Smart Matching Engine
=============================================
Directly tests the matching engine service functions.
"""

import pytest
from services.matching_engine import (
    find_matches_for_lost,
    find_matches_for_found,
    _score_category,
    _score_color,
    _score_brand,
    _score_date_proximity,
    _token_overlap,
)


# ──────────────────────────────────────────────────────────────
#  Fixtures
# ──────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def push_context(app):
    with app.app_context():
        yield


# ──────────────────────────────────────────────────────────────
#  Sample items for matching tests
# ──────────────────────────────────────────────────────────────

LOST_WALLET = {
    "id": "lost-t01",
    "type": "lost",
    "item_name": "Black Leather Wallet",
    "category": "Accessories",
    "color": "Black",
    "brand": "Fossil",
    "description": "Men's bifold black leather wallet with ID cards inside.",
    "location": "Central Park near the fountain",
    "date": "2026-07-10",
    "status": "active",
}

FOUND_WALLET_HIGH_MATCH = {
    "id": "found-t01",
    "type": "found",
    "item_name": "Black Leather Wallet",
    "category": "Accessories",
    "color": "Black",
    "brand": "Fossil",
    "description": "Found a black bifold wallet near the fountain with cards.",
    "location": "Central Park fountain area",
    "date": "2026-07-10",
    "status": "active",
}

FOUND_PHONE_LOW_MATCH = {
    "id": "found-t02",
    "type": "found",
    "item_name": "iPhone 15 Pro",
    "category": "Electronics",
    "color": "Titanium",
    "brand": "Apple",
    "description": "Found an Apple iPhone near the bus stop.",
    "location": "Bus Terminal, Downtown",
    "date": "2026-07-01",
    "status": "active",
}

FOUND_RESOLVED = {
    "id": "found-t03",
    "type": "found",
    "item_name": "Black Wallet",
    "category": "Accessories",
    "color": "Black",
    "brand": "Fossil",
    "description": "Black wallet already claimed.",
    "location": "Central Park",
    "date": "2026-07-10",
    "status": "resolved",   # Should NOT appear in results
}


# ──────────────────────────────────────────────────────────────
#  find_matches_for_lost
# ──────────────────────────────────────────────────────────────

class TestFindMatchesForLost:
    def test_high_match_scores_first(self):
        matches = find_matches_for_lost(
            LOST_WALLET,
            [FOUND_PHONE_LOW_MATCH, FOUND_WALLET_HIGH_MATCH],
        )
        assert len(matches) >= 1
        assert matches[0]["item"]["id"] == FOUND_WALLET_HIGH_MATCH["id"]

    def test_high_score_above_50_for_near_identical(self):
        matches = find_matches_for_lost(LOST_WALLET, [FOUND_WALLET_HIGH_MATCH])
        assert matches[0]["score"] > 50

    def test_resolved_items_excluded(self):
        matches = find_matches_for_lost(LOST_WALLET, [FOUND_RESOLVED])
        # Resolved found items should be skipped
        assert all(m["item"]["id"] != FOUND_RESOLVED["id"] for m in matches)

    def test_returns_empty_for_no_found_items(self):
        matches = find_matches_for_lost(LOST_WALLET, [])
        assert matches == []

    def test_results_sorted_descending(self):
        matches = find_matches_for_lost(
            LOST_WALLET,
            [FOUND_PHONE_LOW_MATCH, FOUND_WALLET_HIGH_MATCH],
        )
        scores = [m["score"] for m in matches]
        assert scores == sorted(scores, reverse=True)

    def test_score_breakdown_present(self):
        matches = find_matches_for_lost(LOST_WALLET, [FOUND_WALLET_HIGH_MATCH])
        breakdown = matches[0]["score_breakdown"]
        for key in ("category", "name", "color", "location", "brand", "date", "description"):
            assert key in breakdown

    def test_matched_fields_listed(self):
        matches = find_matches_for_lost(LOST_WALLET, [FOUND_WALLET_HIGH_MATCH])
        assert "category" in matches[0]["matched_fields"]
        assert "color" in matches[0]["matched_fields"]


# ──────────────────────────────────────────────────────────────
#  find_matches_for_found
# ──────────────────────────────────────────────────────────────

class TestFindMatchesForFound:
    def test_matches_correctly_against_lost(self):
        matches = find_matches_for_found(FOUND_WALLET_HIGH_MATCH, [LOST_WALLET])
        assert len(matches) >= 1
        assert matches[0]["item"]["id"] == LOST_WALLET["id"]

    def test_resolved_lost_items_excluded(self):
        resolved_lost = {**LOST_WALLET, "id": "lost-resolved", "status": "resolved"}
        matches = find_matches_for_found(FOUND_WALLET_HIGH_MATCH, [resolved_lost])
        assert all(m["item"]["id"] != "lost-resolved" for m in matches)


# ──────────────────────────────────────────────────────────────
#  Unit tests for individual scoring functions
# ──────────────────────────────────────────────────────────────

class TestScoreCategory:
    def test_exact_match(self):
        assert _score_category("Electronics", "Electronics") == 1.0

    def test_case_insensitive(self):
        assert _score_category("electronics", "Electronics") == 1.0

    def test_mismatch(self):
        assert _score_category("Electronics", "Clothing") == 0.0

    def test_empty_returns_zero(self):
        assert _score_category("", "Electronics") == 0.0
        assert _score_category("Electronics", "") == 0.0


class TestScoreColor:
    def test_exact_match(self):
        from services.matching_engine import _score_color
        assert _score_color("Black", "Black") == 1.0

    def test_family_match(self):
        from services.matching_engine import _score_color
        score = _score_color("Charcoal", "Black")  # same family
        assert score == 0.6

    def test_no_match(self):
        from services.matching_engine import _score_color
        score = _score_color("Red", "Blue")
        assert score == 0.0

    def test_empty_returns_zero(self):
        from services.matching_engine import _score_color
        assert _score_color("", "Black") == 0.0


class TestScoreBrand:
    def test_exact_match(self):
        assert _score_brand("Apple", "Apple") == 1.0

    def test_contains_match(self):
        score = _score_brand("Apple Inc", "Apple")
        assert score >= 0.7

    def test_both_empty_returns_neutral(self):
        score = _score_brand("", "")
        assert score == 0.3

    def test_one_empty_returns_zero(self):
        score = _score_brand("Nike", "")
        assert score == 0.0


class TestDateProximity:
    def test_same_date_scores_one(self):
        score = _score_date_proximity("2026-07-10", "2026-07-10")
        assert score > 0.99

    def test_nearby_dates_score_high(self):
        score = _score_date_proximity("2026-07-10", "2026-07-12")
        assert score > 0.7

    def test_far_dates_score_low(self):
        score = _score_date_proximity("2026-01-01", "2026-07-10")
        assert score < 0.2

    def test_invalid_date_returns_zero(self):
        score = _score_date_proximity("not-a-date", "2026-07-10")
        assert score == 0.0


class TestTokenOverlap:
    def test_identical_strings(self):
        assert _token_overlap("apple watch", "apple watch") == 1.0

    def test_no_overlap(self):
        score = _token_overlap("elephant shoe", "bicycle chain")
        assert score == 0.0

    def test_partial_overlap(self):
        score = _token_overlap("black leather wallet", "black wallet found")
        assert 0 < score < 1

    def test_empty_strings_return_zero(self):
        assert _token_overlap("", "hello") == 0.0
        assert _token_overlap("hello", "") == 0.0

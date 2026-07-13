"""
ReConnect – Tests for Search Routes
=======================================
Covers: global search, filters, suggestions, categories endpoint.
"""

import json
import pytest
from tests.conftest import SAMPLE_LOST_ITEM, SAMPLE_FOUND_ITEM, create_item_via_api


class TestGlobalSearch:
    def test_search_all_returns_both_types(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        create_item_via_api(client, "found", SAMPLE_FOUND_ITEM)
        resp = client.get("/api/search/")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 2

    def test_search_type_lost_only(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        create_item_via_api(client, "found", SAMPLE_FOUND_ITEM)
        resp = client.get("/api/search/?type=lost")
        body = json.loads(resp.data)
        types = {i["type"] for i in body["data"]}
        assert types == {"lost"}

    def test_search_type_found_only(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        create_item_via_api(client, "found", SAMPLE_FOUND_ITEM)
        resp = client.get("/api/search/?type=found")
        body = json.loads(resp.data)
        types = {i["type"] for i in body["data"]}
        assert types == {"found"}

    def test_keyword_filters_results(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)   # wallet
        laptop_item = {**SAMPLE_LOST_ITEM, "item_name": "Laptop", "description": "Silver laptop computer found on desk."}
        create_item_via_api(client, "lost", laptop_item)
        resp = client.get("/api/search/?q=wallet")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 1
        assert "wallet" in body["data"][0]["item_name"].lower()

    def test_category_filter(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)  # Accessories
        elec = {**SAMPLE_LOST_ITEM, "item_name": "Laptop", "category": "Electronics",
                "description": "Silver laptop found near the cafeteria."}
        create_item_via_api(client, "lost", elec)
        resp = client.get("/api/search/?category=Accessories")
        body = json.loads(resp.data)
        assert all(i["category"] == "Accessories" for i in body["data"])

    def test_empty_search_returns_all(self, client):
        for _ in range(3):
            create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        resp = client.get("/api/search/")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 3

    def test_meta_contains_query_and_filters(self, client):
        resp = client.get("/api/search/?q=test&category=Electronics")
        body = json.loads(resp.data)
        assert body["meta"]["query"] == "test"
        assert body["meta"]["filters"]["category"] == "Electronics"


class TestSearchSuggestions:
    def test_suggestions_returns_list(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        resp = client.get("/api/search/suggestions?q=wal")
        assert resp.status_code == 200
        body = json.loads(resp.data)
        assert isinstance(body["data"], list)

    def test_short_query_returns_empty(self, client):
        resp = client.get("/api/search/suggestions?q=a")
        body = json.loads(resp.data)
        assert body["data"] == []

    def test_suggestions_contain_matching_name(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)  # "Black Leather Wallet"
        resp = client.get("/api/search/suggestions?q=black")
        body = json.loads(resp.data)
        assert len(body["data"]) >= 1


class TestCategoriesEndpoint:
    def test_returns_category_list(self, client):
        resp = client.get("/api/search/categories")
        assert resp.status_code == 200
        body = json.loads(resp.data)
        assert isinstance(body["data"], list)
        assert len(body["data"]) > 0

    def test_each_category_has_required_keys(self, client):
        resp = client.get("/api/search/categories")
        body = json.loads(resp.data)
        for cat in body["data"]:
            assert "category" in cat
            assert "lost_count" in cat
            assert "found_count" in cat
            assert "total" in cat

    def test_counts_update_after_item_creation(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)  # Accessories
        resp = client.get("/api/search/categories")
        body = json.loads(resp.data)
        accessories = next((c for c in body["data"] if c["category"] == "Accessories"), None)
        assert accessories is not None
        assert accessories["lost_count"] == 1

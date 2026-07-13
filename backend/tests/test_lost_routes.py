"""
ReConnect – Tests for Lost Item Routes
=======================================
Covers: list, create, get, update, delete, validation errors.
"""

import json
import pytest
from tests.conftest import SAMPLE_LOST_ITEM, create_item_via_api


# ──────────────────────────────────────────────────────────────
#  List endpoint  GET /api/lost/
# ──────────────────────────────────────────────────────────────

class TestListLostItems:
    def test_returns_empty_list_initially(self, client):
        resp = client.get("/api/lost/")
        assert resp.status_code == 200
        body = json.loads(resp.data)
        assert body["success"] is True
        assert body["data"] == []
        assert body["meta"]["total_items"] == 0

    def test_returns_items_after_creation(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        resp = client.get("/api/lost/")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 1
        assert body["data"][0]["item_name"] == SAMPLE_LOST_ITEM["item_name"]

    def test_filter_by_category(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        resp = client.get("/api/lost/?category=Accessories")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 1

    def test_filter_by_wrong_category_returns_empty(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        resp = client.get("/api/lost/?category=Electronics")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 0

    def test_keyword_search(self, client):
        create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        resp = client.get("/api/lost/?q=wallet")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 1

    def test_pagination_defaults(self, client):
        # Create 3 items
        for _ in range(3):
            create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        resp = client.get("/api/lost/")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 3
        assert body["meta"]["page"] == 1

    def test_pagination_page_size(self, client):
        for _ in range(5):
            create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        resp = client.get("/api/lost/?page_size=2&page=1")
        body = json.loads(resp.data)
        assert len(body["data"]) == 2
        assert body["meta"]["total_pages"] == 3
        assert body["meta"]["has_next"] is True

    def test_sort_by_name(self, client):
        item_b = {**SAMPLE_LOST_ITEM, "item_name": "Zebra Bag"}
        item_a = {**SAMPLE_LOST_ITEM, "item_name": "Apple Watch"}
        create_item_via_api(client, "lost", item_b)
        create_item_via_api(client, "lost", item_a)
        resp = client.get("/api/lost/?sort=name")
        body = json.loads(resp.data)
        names = [i["item_name"] for i in body["data"]]
        assert names == sorted(names, key=str.lower)


# ──────────────────────────────────────────────────────────────
#  Create endpoint  POST /api/lost/
# ──────────────────────────────────────────────────────────────

class TestCreateLostItem:
    def test_create_returns_201(self, client):
        resp = client.post(
            "/api/lost/",
            data=json.dumps(SAMPLE_LOST_ITEM),
            content_type="application/json",
        )
        assert resp.status_code == 201
        body = json.loads(resp.data)
        assert body["success"] is True
        item = body["data"]["item"]
        assert item["id"].startswith("lost-")
        assert item["type"] == "lost"
        assert item["item_name"] == SAMPLE_LOST_ITEM["item_name"]
        assert item["status"] == "active"
        assert "created_at" in item

    def test_create_missing_required_field_returns_422(self, client):
        data = {**SAMPLE_LOST_ITEM}
        del data["item_name"]
        resp = client.post(
            "/api/lost/",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert resp.status_code == 422
        body = json.loads(resp.data)
        assert body["success"] is False
        fields = [e["field"] for e in body["errors"]]
        assert "item_name" in fields

    def test_create_invalid_category_returns_422(self, client):
        data = {**SAMPLE_LOST_ITEM, "category": "Unicorns"}
        resp = client.post(
            "/api/lost/",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert resp.status_code == 422

    def test_create_invalid_email_returns_422(self, client):
        data = {**SAMPLE_LOST_ITEM, "contact_email": "not-an-email"}
        resp = client.post(
            "/api/lost/",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert resp.status_code == 422

    def test_create_future_date_returns_422(self, client):
        data = {**SAMPLE_LOST_ITEM, "date": "2099-01-01"}
        resp = client.post(
            "/api/lost/",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert resp.status_code == 422

    def test_create_stores_empty_images_list(self, client):
        resp = client.post(
            "/api/lost/",
            data=json.dumps(SAMPLE_LOST_ITEM),
            content_type="application/json",
        )
        body = json.loads(resp.data)
        assert body["data"]["item"]["images"] == []


# ──────────────────────────────────────────────────────────────
#  Get single  GET /api/lost/<id>
# ──────────────────────────────────────────────────────────────

class TestGetLostItem:
    def test_get_existing_item(self, client):
        created = create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        item_id = created["data"]["item"]["id"]
        resp = client.get(f"/api/lost/{item_id}")
        assert resp.status_code == 200
        body = json.loads(resp.data)
        assert body["data"]["id"] == item_id

    def test_get_nonexistent_returns_404(self, client):
        resp = client.get("/api/lost/nonexistent-id")
        assert resp.status_code == 404
        body = json.loads(resp.data)
        assert body["success"] is False


# ──────────────────────────────────────────────────────────────
#  Update  PUT /api/lost/<id>
# ──────────────────────────────────────────────────────────────

class TestUpdateLostItem:
    def test_update_item_name(self, client):
        created = create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        item_id = created["data"]["item"]["id"]
        resp = client.put(
            f"/api/lost/{item_id}",
            data=json.dumps({"item_name": "Updated Wallet"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        body = json.loads(resp.data)
        assert body["data"]["item_name"] == "Updated Wallet"

    def test_update_status_to_resolved(self, client):
        created = create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        item_id = created["data"]["item"]["id"]
        resp = client.put(
            f"/api/lost/{item_id}",
            data=json.dumps({"status": "resolved"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        body = json.loads(resp.data)
        assert body["data"]["status"] == "resolved"

    def test_update_nonexistent_returns_404(self, client):
        resp = client.put(
            "/api/lost/fake-id",
            data=json.dumps({"item_name": "New Name"}),
            content_type="application/json",
        )
        assert resp.status_code == 404


# ──────────────────────────────────────────────────────────────
#  Delete  DELETE /api/lost/<id>
# ──────────────────────────────────────────────────────────────

class TestDeleteLostItem:
    def test_delete_existing_item(self, client):
        created = create_item_via_api(client, "lost", SAMPLE_LOST_ITEM)
        item_id = created["data"]["item"]["id"]

        resp = client.delete(f"/api/lost/{item_id}")
        assert resp.status_code == 200

        # Confirm it's gone
        resp2 = client.get(f"/api/lost/{item_id}")
        assert resp2.status_code == 404

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete("/api/lost/ghost-id")
        assert resp.status_code == 404

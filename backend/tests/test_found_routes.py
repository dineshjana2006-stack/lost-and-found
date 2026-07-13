"""
ReConnect – Tests for Found Item Routes
=========================================
Covers: list, create, get, update, delete, validation.
"""

import json
import pytest
from tests.conftest import SAMPLE_FOUND_ITEM, create_item_via_api


class TestListFoundItems:
    def test_returns_empty_list_initially(self, client):
        resp = client.get("/api/found/")
        assert resp.status_code == 200
        body = json.loads(resp.data)
        assert body["data"] == []
        assert body["meta"]["total_items"] == 0

    def test_filter_by_status(self, client):
        create_item_via_api(client, "found", SAMPLE_FOUND_ITEM)
        resp = client.get("/api/found/?status=active")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 1

    def test_color_filter_case_insensitive(self, client):
        create_item_via_api(client, "found", SAMPLE_FOUND_ITEM)
        resp = client.get("/api/found/?color=BLACK")
        body = json.loads(resp.data)
        assert body["meta"]["total_items"] == 1


class TestCreateFoundItem:
    def test_create_returns_201(self, client):
        resp = client.post(
            "/api/found/",
            data=json.dumps(SAMPLE_FOUND_ITEM),
            content_type="application/json",
        )
        assert resp.status_code == 201
        body = json.loads(resp.data)
        assert body["success"] is True
        item = body["data"]["item"]
        assert item["id"].startswith("found-")
        assert item["type"] == "found"

    def test_missing_contact_email_returns_422(self, client):
        data = {**SAMPLE_FOUND_ITEM}
        del data["contact_email"]
        resp = client.post(
            "/api/found/",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert resp.status_code == 422

    def test_short_description_returns_422(self, client):
        data = {**SAMPLE_FOUND_ITEM, "description": "short"}
        resp = client.post(
            "/api/found/",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert resp.status_code == 422


class TestGetFoundItem:
    def test_get_existing(self, client):
        created = create_item_via_api(client, "found", SAMPLE_FOUND_ITEM)
        item_id = created["data"]["item"]["id"]
        resp = client.get(f"/api/found/{item_id}")
        assert resp.status_code == 200

    def test_get_missing_returns_404(self, client):
        resp = client.get("/api/found/does-not-exist")
        assert resp.status_code == 404


class TestUpdateFoundItem:
    def test_update_location(self, client):
        created = create_item_via_api(client, "found", SAMPLE_FOUND_ITEM)
        item_id = created["data"]["item"]["id"]
        resp = client.put(
            f"/api/found/{item_id}",
            data=json.dumps({"location": "New Location Street"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        body = json.loads(resp.data)
        assert body["data"]["location"] == "New Location Street"


class TestDeleteFoundItem:
    def test_delete_removes_item(self, client):
        created = create_item_via_api(client, "found", SAMPLE_FOUND_ITEM)
        item_id = created["data"]["item"]["id"]
        del_resp = client.delete(f"/api/found/{item_id}")
        assert del_resp.status_code == 200
        get_resp = client.get(f"/api/found/{item_id}")
        assert get_resp.status_code == 404

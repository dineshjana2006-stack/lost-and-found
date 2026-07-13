"""
ReConnect – pytest Configuration & Shared Fixtures
====================================================
Provides app, client, and sample item fixtures for all tests.

Usage:
    pytest tests/                     # run all
    pytest tests/test_lost_routes.py  # run specific file
    pytest -v                         # verbose output
    pytest --tb=short                 # short tracebacks
"""

import json
import os
import sys
import tempfile
import shutil

import pytest

# ── Make the backend root importable ──────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import TestingConfig
from app import create_app


# ──────────────────────────────────────────────────────────────
#  Fixtures
# ──────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def temp_storage_dir():
    """Create a temporary directory for test JSON files."""
    tmp = tempfile.mkdtemp(prefix="reconnect_test_")
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture(scope="function")
def app(tmp_path):
    """Create a fresh Flask test application for each test function.

    Uses a temporary directory for storage and uploads so tests
    are fully isolated from each other.
    """
    # Override storage paths in TestingConfig
    TestingConfig.STORAGE_DIR = str(tmp_path / "storage")
    TestingConfig.LOST_ITEMS_FILE = str(tmp_path / "storage" / "lost_items.json")
    TestingConfig.FOUND_ITEMS_FILE = str(tmp_path / "storage" / "found_items.json")
    TestingConfig.UPLOAD_DIR = str(tmp_path / "uploads" / "images")

    os.makedirs(TestingConfig.STORAGE_DIR, exist_ok=True)
    os.makedirs(TestingConfig.UPLOAD_DIR, exist_ok=True)

    # Seed empty storage files
    for path in [TestingConfig.LOST_ITEMS_FILE, TestingConfig.FOUND_ITEMS_FILE]:
        with open(path, "w") as f:
            json.dump([], f)

    flask_app = create_app(config_class=TestingConfig)
    flask_app.testing = True

    yield flask_app


@pytest.fixture(scope="function")
def client(app):
    """Return a Flask test client."""
    return app.test_client()


# ──────────────────────────────────────────────────────────────
#  Sample item helpers
# ──────────────────────────────────────────────────────────────

SAMPLE_LOST_ITEM = {
    "item_name": "Black Leather Wallet",
    "category": "Accessories",
    "color": "Black",
    "brand": "Fossil",
    "description": "Men's bifold black leather wallet with ID cards inside.",
    "location": "Central Park near the fountain",
    "date": "2026-07-10",
    "contact_name": "Test User",
    "contact_email": "test@example.com",
    "contact_phone": "+91-9876543210",
}

SAMPLE_FOUND_ITEM = {
    "item_name": "Black Wallet",
    "category": "Accessories",
    "color": "Black",
    "brand": "Unknown",
    "description": "Found a black bifold wallet near the park fountain. Has cards inside.",
    "location": "Central Park, near fountain area",
    "date": "2026-07-10",
    "contact_name": "Good Samaritan",
    "contact_email": "finder@example.com",
    "contact_phone": "+91-9000000000",
}


def create_item_via_api(client, item_type: str, data: dict) -> dict:
    """Helper to POST an item and return the parsed response."""
    resp = client.post(
        f"/api/{item_type}/",
        data=json.dumps(data),
        content_type="application/json",
    )
    return json.loads(resp.data)

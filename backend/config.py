"""
ReConnect – Backend Configuration
==================================
Central configuration module. All tuneable parameters live here.
Override any value by setting the corresponding environment variable.
"""

import os

# Absolute path to the backend/ directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    """Base configuration shared across all environments."""

    # ──────────────────────────────────────────
    #  Server
    # ──────────────────────────────────────────
    DEBUG: bool = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    HOST: str = os.getenv("FLASK_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("FLASK_PORT", "5000"))
    SECRET_KEY: str = os.getenv("SECRET_KEY", "reconnect-dev-secret-change-in-prod")

    # ──────────────────────────────────────────
    #  Storage  (JSON flat-file persistence)
    # ──────────────────────────────────────────
    STORAGE_DIR: str = os.path.join(BASE_DIR, "storage")
    LOST_ITEMS_FILE: str = os.path.join(STORAGE_DIR, "lost_items.json")
    FOUND_ITEMS_FILE: str = os.path.join(STORAGE_DIR, "found_items.json")
    MATCH_REPORTS_FILE: str = os.path.join(STORAGE_DIR, "match_reports.json")

    # ──────────────────────────────────────────
    #  Image Uploads
    # ──────────────────────────────────────────
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads", "images")
    ALLOWED_EXTENSIONS: set = {"png", "jpg", "jpeg", "gif", "webp"}
    MAX_IMAGE_SIZE_MB: int = int(os.getenv("MAX_IMAGE_SIZE_MB", "5"))
    MAX_CONTENT_LENGTH: int = MAX_IMAGE_SIZE_MB * 1024 * 1024  # Flask upload limit
    MAX_IMAGES_PER_ITEM: int = int(os.getenv("MAX_IMAGES_PER_ITEM", "5"))

    # Image processing – resize to fit within this box (preserves aspect ratio)
    THUMBNAIL_MAX_SIZE: tuple = (
        int(os.getenv("THUMB_WIDTH", "900")),
        int(os.getenv("THUMB_HEIGHT", "900")),
    )
    JPEG_QUALITY: int = int(os.getenv("JPEG_QUALITY", "85"))

    # ──────────────────────────────────────────
    #  Pagination
    # ──────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "12"))
    MAX_PAGE_SIZE: int = int(os.getenv("MAX_PAGE_SIZE", "50"))

    # ──────────────────────────────────────────
    #  CORS
    # ──────────────────────────────────────────
    CORS_ORIGINS: list = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
    ).split(",")

    # ──────────────────────────────────────────
    #  Smart Matching Engine
    # ──────────────────────────────────────────
    # Minimum confidence score (%) to include a result
    MATCH_MIN_SCORE: float = float(os.getenv("MATCH_MIN_SCORE", "15"))
    # Maximum number of match results to return per query
    MATCH_MAX_RESULTS: int = int(os.getenv("MATCH_MAX_RESULTS", "10"))

    # Weights (must sum to 100)
    MATCH_WEIGHT_CATEGORY: float = 30.0
    MATCH_WEIGHT_NAME: float = 25.0
    MATCH_WEIGHT_COLOR: float = 15.0
    MATCH_WEIGHT_LOCATION: float = 10.0
    MATCH_WEIGHT_BRAND: float = 10.0
    MATCH_WEIGHT_DATE: float = 5.0
    MATCH_WEIGHT_DESCRIPTION: float = 5.0

    # ──────────────────────────────────────────
    #  Item Categories (canonical list)
    # ──────────────────────────────────────────
    ITEM_CATEGORIES: list = [
        "Electronics",
        "Clothing",
        "Accessories",
        "Documents",
        "Keys",
        "Bags",
        "Pets",
        "Sports",
        "Jewelry",
        "Books",
        "Vehicles",
        "Other",
    ]

    # ──────────────────────────────────────────
    #  Item Status Options
    # ──────────────────────────────────────────
    ITEM_STATUSES: list = ["active", "resolved", "archived"]


class DevelopmentConfig(Config):
    """Development-specific overrides."""
    DEBUG = True


class ProductionConfig(Config):
    """Production-specific overrides."""
    DEBUG = False
    # In production, override SECRET_KEY via environment variable


class TestingConfig(Config):
    """Testing-specific overrides – uses in-memory temp files."""
    TESTING = True
    DEBUG = True
    STORAGE_DIR = os.path.join(BASE_DIR, "tests", "fixtures")
    LOST_ITEMS_FILE = os.path.join(STORAGE_DIR, "test_lost_items.json")
    FOUND_ITEMS_FILE = os.path.join(STORAGE_DIR, "test_found_items.json")
    UPLOAD_DIR = os.path.join(BASE_DIR, "tests", "fixtures", "uploads")
    MATCH_MIN_SCORE = 0  # Return all matches in tests for full coverage


# Active config selected by environment variable
ENV_CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}

ActiveConfig = ENV_CONFIG_MAP.get(os.getenv("FLASK_ENV", "development"), DevelopmentConfig)

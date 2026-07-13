"""
ReConnect – Smart Digital Lost & Found Network
================================================
Flask Application Entry Point

Run in development:
    python app.py

Run with gunicorn (production):
    gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"

Environment Variables:
    FLASK_DEBUG       – "true" | "false"  (default: true)
    FLASK_HOST        – bind host          (default: 0.0.0.0)
    FLASK_PORT        – bind port          (default: 5000)
    FLASK_ENV         – "development" | "production" | "testing"
    SECRET_KEY        – secret key for Flask sessions
    MAX_IMAGE_SIZE_MB – max upload size in MB
    CORS_ORIGINS      – comma-separated allowed origins
"""

import os
import logging

from flask import Flask, send_from_directory, jsonify

from config import ActiveConfig
from api import register_blueprints
from utils.response_helpers import error_response

# ──────────────────────────────────────────────────────────────
#  Logging configuration
# ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if ActiveConfig.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
#  Application factory
# ──────────────────────────────────────────────────────────────
def create_app(config_class=None):
    """Create and configure the Flask application.

    Args:
        config_class: Config class to use. Defaults to ActiveConfig
                      which is determined by the FLASK_ENV env variable.

    Returns:
        Configured Flask application instance.
    """
    if config_class is None:
        config_class = ActiveConfig

    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)

    # ── Ensure required directories exist ─────────────────────
    os.makedirs(app.config["STORAGE_DIR"], exist_ok=True)
    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)

    # ── CORS ──────────────────────────────────────────────────
    from flask_cors import CORS
    CORS(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept"],
    )

    # ── Register all API blueprints ───────────────────────────
    register_blueprints(app)

    # ── Static image serving ──────────────────────────────────
    @app.route("/uploads/images/<path:filename>")
    def serve_image(filename):
        """Serve an uploaded image file."""
        # Prevent path traversal
        safe_name = os.path.basename(filename)
        return send_from_directory(app.config["UPLOAD_DIR"], safe_name)

    # ── Health check ──────────────────────────────────────────
    @app.route("/api/health")
    def health_check():
        """Simple health check endpoint for load balancers and monitoring."""
        return jsonify({
            "success": True,
            "status": "healthy",
            "service": "ReConnect API",
            "version": "1.0.0",
            "environment": os.getenv("FLASK_ENV", "development"),
        }), 200

    # ── Error handlers ────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return error_response("Bad request.", 400)

    @app.errorhandler(404)
    def not_found(e):
        return error_response(
            "The requested resource was not found. "
            "Check the URL and try again.",
            404,
        )

    @app.errorhandler(405)
    def method_not_allowed(e):
        return error_response("HTTP method not allowed on this endpoint.", 405)

    @app.errorhandler(413)
    def payload_too_large(e):
        max_mb = app.config.get("MAX_IMAGE_SIZE_MB", 5)
        return error_response(
            f"File size exceeds the {max_mb} MB limit. "
            f"Please compress your image and try again.",
            413,
        )

    @app.errorhandler(500)
    def internal_server_error(e):
        logger.error("Internal server error: %s", e, exc_info=True)
        return error_response(
            "An internal server error occurred. "
            "Our team has been notified.",
            500,
        )

    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        logger.exception("Unhandled exception: %s", e)
        return error_response("An unexpected error occurred.", 500)

    logger.info(
        "ReConnect API ready — host=%s port=%s debug=%s",
        app.config["HOST"],
        app.config["PORT"],
        app.config["DEBUG"],
    )
    return app


# ──────────────────────────────────────────────────────────────
#  Development entry point
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = create_app()
    app.run(
        host=ActiveConfig.HOST,
        port=ActiveConfig.PORT,
        debug=ActiveConfig.DEBUG,
    )

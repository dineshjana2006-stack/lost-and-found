"""
ReConnect – API Package
========================
Registers all route blueprints with the Flask application.

Import order matters: blueprints are registered in the order listed,
which determines the order Flask will attempt to match URL rules.
"""

from .lost_routes import lost_bp
from .found_routes import found_bp
from .search_routes import search_bp
from .match_routes import match_bp
from .stats_routes import stats_bp
from .report_routes import report_bp


def register_blueprints(app):
    """Attach every API blueprint to the Flask app.

    All blueprints are mounted under the /api prefix.
    """
    app.register_blueprint(lost_bp,   url_prefix="/api/lost")
    app.register_blueprint(found_bp,  url_prefix="/api/found")
    app.register_blueprint(search_bp, url_prefix="/api/search")
    app.register_blueprint(match_bp,  url_prefix="/api/match")
    app.register_blueprint(stats_bp,  url_prefix="/api/stats")
    app.register_blueprint(report_bp, url_prefix="/api/report")

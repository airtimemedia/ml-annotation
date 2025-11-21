from flask import Blueprint, jsonify

main_bp = Blueprint("main", __name__)


@main_bp.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "video-comparison-api"})


@main_bp.route("/api/ping")
def ping():
    """Ping endpoint to test API connectivity."""
    return jsonify({"message": "pong"})

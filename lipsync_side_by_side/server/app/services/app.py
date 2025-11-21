import os
from pathlib import Path

from flask import Flask, send_from_directory
from flask_cors import CORS

from app.constants import (
    DEFAULT_SECRET_KEY,
    ENV_DEVELOPMENT,
    MAX_CONTENT_LENGTH,
    CORS_ALLOWED_ORIGINS,
    CORS_ALLOWED_HEADERS,
    CORS_ALLOWED_METHODS
)


def create_app():
    """Create and configure the Flask application."""
    # Determine React build folder
    server_dir = Path(__file__).parents[2]
    client_dir = server_dir.parent / "client"
    build_dir = client_dir / "dist"

    app = Flask(
        __name__,
        static_folder=str(build_dir) if build_dir.exists() else None,
        static_url_path="",
    )

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", DEFAULT_SECRET_KEY)
    app.config["DEBUG"] = os.environ.get("FLASK_ENV") == ENV_DEVELOPMENT
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

    # CORS - allow all origins for development
    CORS(
        app,
        supports_credentials=True,
        origins=CORS_ALLOWED_ORIGINS,
        allow_headers=CORS_ALLOWED_HEADERS,
        methods=CORS_ALLOWED_METHODS,
    )

    # Register blueprints
    from app.routes.video import video_bp
    from app.routes.comparison import comparison_bp
    from app.routes.main import main_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(video_bp, url_prefix="/api/video")
    app.register_blueprint(comparison_bp, url_prefix="/api/comparison")

    # Serve React app for all non-API routes
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react(path):
        if build_dir.exists():
            if path and (build_dir / path).exists():
                return send_from_directory(build_dir, path)
            return send_from_directory(build_dir, "index.html")
        return {"error": "Frontend not built. Run 'npm run build' in client directory."}, 404

    return app

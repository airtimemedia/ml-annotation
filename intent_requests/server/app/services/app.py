import os
from pathlib import Path
from flask import Flask
from flask_cors import CORS
from app.routes.dataset import dataset_bp
from app.routes.annotations import annotations_bp


def create_app():
    # Determine React build folder
    client_dir = Path(__file__).parents[3] / "client"
    build_dir = client_dir / "dist"

    app = Flask(
        __name__,
        static_folder=str(build_dir) if build_dir.exists() else None,
        static_url_path="",
    )

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-me")
    app.config["DEBUG"] = os.environ.get("FLASK_ENV") == "development"

    # CORS - allow all origins for Vercel deployments
    CORS(
        app,
        supports_credentials=True,
        origins="*",
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'ok', 'service': 'intent-annotator'}

    # Register routes
    app.register_blueprint(dataset_bp, url_prefix="/api")
    app.register_blueprint(annotations_bp, url_prefix="/api")

    # Serve React app for all other routes (only in production when build exists)
    if build_dir.exists():
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_react(path):
            from flask import send_from_directory
            # Don't serve static files for API routes
            if path.startswith('api/'):
                return {'error': 'Not found'}, 404
            if path and (build_dir / path).exists():
                return send_from_directory(build_dir, path)
            return send_from_directory(build_dir, 'index.html')

    return app

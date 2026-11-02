import os
from flask import Flask
from flask_cors import CORS

from app.config import config_by_name
from app.models.db import close_db
from app.routes import health_bp, resume_bp, skills_bp, interview_bp, study_bp, auth_bp
from app.utils.errors import error_response


def create_app(config_name: str = None) -> Flask:
    """
    Application Factory for AI Academic & Career Copilot API.
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    config_class = config_by_name.get(config_name, config_by_name["default"])
    app.config.from_object(config_class)

    # If running in testing mode, ensure test database is initialized
    if app.config.get("TESTING"):
        from database.init_db import init_test_database
        init_test_database(app.config["DATABASE_PATH"])

    # Configure CORS for frontend communication
    allowed_origin = app.config.get("CORS_ORIGIN", "http://localhost:5173")
    CORS(
        app,
        resources={r"/api/*": {"origins": [allowed_origin, "http://127.0.0.1:5173", "http://localhost:5173"]}},
        supports_credentials=True,
    )

    # Register database teardown
    app.teardown_appcontext(close_db)

    # Register Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(resume_bp)
    app.register_blueprint(skills_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(study_bp)
    app.register_blueprint(auth_bp)

    # Global Error Handlers
    @app.errorhandler(404)
    def handle_not_found(e):
        return error_response(
            message="The requested API endpoint does not exist.",
            status_code=404,
            details={"error": "Not Found"}
        )

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return error_response(
            message="Method not allowed for this endpoint.",
            status_code=405,
            details={"error": "Method Not Allowed"}
        )

    @app.errorhandler(500)
    def handle_internal_error(e):
        return error_response(
            message="An unexpected server error occurred.",
            status_code=500,
            details={"error": "Internal Server Error"}
        )

    return app

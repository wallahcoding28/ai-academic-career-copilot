import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root or backend directory if present
BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
dotenv_path = BASE_DIR / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)


class Config:
    """Base Configuration"""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-fallback-secret-key-32bytes")
    _raw_db = os.getenv("DATABASE_PATH", str(BASE_DIR / "database" / "copilot.db"))
    DATABASE_PATH = str(Path(_raw_db) if Path(_raw_db).is_absolute() else BASE_DIR / _raw_db)
    CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")
    API_VERSION = "1.0.0-stage5"

    # Session & Cookie Security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    # AI Service Configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


class DevelopmentConfig(Config):
    """Development Configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production Configuration"""
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").lower() in ("true", "1")


class TestingConfig(Config):
    """Testing Configuration"""
    DEBUG = True
    TESTING = True
    _raw_test_db = os.getenv("TEST_DATABASE_PATH", str(BASE_DIR / "database" / "copilot_test.db"))
    DATABASE_PATH = str(Path(_raw_test_db) if Path(_raw_test_db).is_absolute() else BASE_DIR / _raw_test_db)


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}

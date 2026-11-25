"""
AISecGuard — Application Settings
Loads configuration from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application configuration settings."""

    # Project metadata
    PROJECT_NAME: str = "AISecGuard"
    PROJECT_DESCRIPTION: str = (
        "Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks"
    )
    VERSION: str = "0.1.0"

    # API settings
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",   # User Portal Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:5174",   # Admin Control Portal Vite dev server
        "http://127.0.0.1:5174",
        "http://localhost:3000",   # Alternative frontend port
    ]

    # Database — in-memory by default (Zero disk database required)
    DATABASE_URL: str = "sqlite:///:memory:"
    # For persistent SQLite or PostgreSQL:
    # DATABASE_URL: str = "sqlite:///./aisecguard_dev.db"
    # DATABASE_URL=postgresql+psycopg2://aisecguard:password@localhost:5432/aisecguard

    # Security & Standalone Mode
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_STRONG_RANDOM_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    NO_LOGIN_REQUIRED: bool = True  # Standalone mode: bypass login requirement

    # File upload settings
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 100

    # Model signing (Ed25519). Empty = <UPLOAD_DIR>/.keys/signing_ed25519.pem
    SIGNING_KEY_PATH: str = ""

    # Rate limiting (Task 4b). Disable in tests to avoid 429s.
    RATE_LIMIT_ENABLED: bool = True

    # Online vulnerability lookups (OSV.dev). Off by default: scans stay offline.
    OSV_LOOKUP_ENABLED: bool = True
    OSV_TIMEOUT_SECONDS: float = 5.0
    SYNC_SCANS: bool = False
    SCAN_MIN_DURATION_SECONDS: float = 5.0

    # Allowed file extensions
    ALLOWED_MODEL_EXTENSIONS: List[str] = [
        ".pkl", ".joblib", ".h5", ".pt", ".pth", ".onnx", ".bin", ".safetensors", ".zip"
    ]
    ALLOWED_DATASET_EXTENSIONS: List[str] = [
        ".csv", ".json", ".parquet", ".jsonl"
    ]
    ALLOWED_DEPENDENCY_EXTENSIONS: List[str] = [
        ".txt", ".toml"
    ]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# Global settings instance
settings = Settings()

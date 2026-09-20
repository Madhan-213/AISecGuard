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
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Alternative frontend port
        "http://127.0.0.1:5173",
    ]

    # Database
    DATABASE_URL: str = "sqlite:///./aisecguard_dev.db"
    # For PostgreSQL (set in .env):
    # DATABASE_URL=postgresql+psycopg2://aisecguard:password@localhost:5432/aisecguard

    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_STRONG_RANDOM_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # File upload settings
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 100

    # Allowed file extensions
    ALLOWED_MODEL_EXTENSIONS: List[str] = [
        ".pkl", ".joblib", ".h5", ".pt", ".pth", ".onnx", ".bin", ".safetensors"
    ]
    ALLOWED_DATASET_EXTENSIONS: List[str] = [
        ".csv", ".json", ".parquet", ".jsonl"
    ]
    ALLOWED_DEPENDENCY_EXTENSIONS: List[str] = [
        ".txt", ".toml"
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()

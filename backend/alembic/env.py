"""
AISecGuard — Alembic env.py
Configured for autogenerate support with SQLAlchemy models.
DATABASE_URL is read from the environment variable (or defaults to SQLite dev).
"""

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# -----------------------------------------------------------------------
# Make sure 'app' is importable (backend/ is the pythonpath root)
# -----------------------------------------------------------------------
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Import models and Base for autogenerate
import app.models  # noqa: F401
from app.db.base import Base

# -----------------------------------------------------------------------
# Alembic config
# -----------------------------------------------------------------------
config = context.config

# Override sqlalchemy.url from environment variable if set
db_url = os.getenv("DATABASE_URL", "sqlite:///./aisecguard_dev.db")
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generates SQL without a live connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (requires a live database connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

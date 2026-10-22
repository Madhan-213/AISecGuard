"""
AISecGuard — Alembic Migration Tests
Tests run on SQLite via create_all, which hides drift between the ORM enums and
the PostgreSQL enum types the migrations create (Docker uses PostgreSQL).

  - Static checks parse the migration sources (always run).
  - A real PostgreSQL upgrade/downgrade runs when AISECGUARD_TEST_POSTGRES_URL
    points at a disposable database, e.g.
      postgresql+psycopg2://aisecguard:aisecguard_password@localhost:5432/aisecguard_migtest
"""

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

from app.models.enums import ArtifactType, FindingSeverity, FindingType

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
VERSIONS_DIR = BACKEND_DIR / "alembic" / "versions"
POSTGRES_URL = os.getenv("AISECGUARD_TEST_POSTGRES_URL")


def _alembic(*args: str, database_url: str) -> subprocess.CompletedProcess:
    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
    env["DATABASE_URL"] = database_url
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _migration_source() -> str:
    return "\n".join(p.read_text(encoding="utf-8") for p in sorted(VERSIONS_DIR.glob("*.py")))


def _declared_enum_values(source: str, type_name: str) -> set[str]:
    """Values given to sa.Enum(..., name=type_name) plus later ADD VALUE statements."""
    declared: set[str] = set()
    for body in re.findall(rf"sa\.Enum\(([^)]*?)name=['\"]{type_name}['\"]", source, re.S):
        declared |= set(re.findall(r"['\"]([A-Z_]+)['\"]", body))
    declared |= set(re.findall(
        rf"ALTER TYPE {type_name} ADD VALUE(?: IF NOT EXISTS)? '([A-Z_]+)'", source
    ))
    return declared


ENUMS = [
    (FindingType, "finding_type_enum"),
    (FindingSeverity, "finding_severity_enum"),
    (ArtifactType, "artifact_type_enum"),
]


def test_single_migration_head():
    proc = _alembic("heads", database_url="sqlite:///:memory:")
    assert proc.returncode == 0, proc.stderr
    heads = [line for line in proc.stdout.splitlines() if "(head)" in line]
    assert len(heads) == 1, proc.stdout


@pytest.mark.parametrize("enum_cls, type_name", ENUMS)
def test_migrations_declare_every_model_enum_value(enum_cls, type_name):
    """Every value the ORM can write must exist in the PostgreSQL enum type."""
    declared = _declared_enum_values(_migration_source(), type_name)
    assert declared, f"{type_name} is never created"
    missing = {member.value for member in enum_cls} - declared
    assert not missing, f"{type_name} is missing {sorted(missing)}"


def test_boolean_server_defaults_are_portable():
    """PostgreSQL rejects integer defaults such as text('1') on BOOLEAN columns."""
    assert not re.search(
        r"sa\.Boolean\(\)[^\n]*server_default=sa\.text\(['\"][01]['\"]\)",
        _migration_source(),
    )


def test_sqlite_upgrade_and_downgrade(tmp_path):
    url = f"sqlite:///{(tmp_path / 'migrate.db').as_posix()}"
    up = _alembic("upgrade", "head", database_url=url)
    assert up.returncode == 0, up.stderr
    down = _alembic("downgrade", "base", database_url=url)
    assert down.returncode == 0, down.stderr


@pytest.mark.skipif(not POSTGRES_URL, reason="AISECGUARD_TEST_POSTGRES_URL not set")
def test_postgres_upgrade_accepts_every_finding_type():
    from sqlalchemy import create_engine, text

    up = _alembic("upgrade", "head", database_url=POSTGRES_URL)
    assert up.returncode == 0, up.stderr
    engine = create_engine(POSTGRES_URL)
    try:
        with engine.connect() as conn:
            values = set(conn.execute(text(
                "SELECT unnest(enum_range(NULL::finding_type_enum))::text"
            )).scalars())
        assert {m.value for m in FindingType} <= values
    finally:
        engine.dispose()
        down = _alembic("downgrade", "base", database_url=POSTGRES_URL)
        assert down.returncode == 0, down.stderr

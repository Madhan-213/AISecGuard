"""
AISecGuard — Database Setup & Seeding Script
Run this script to initialize tables and default accounts in the SQLite/PostgreSQL database:
    python seed_db.py
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.db.init_db import init_db

if __name__ == "__main__":
    print("[AISecGuard] Initializing database and role-based accounts...")
    init_db()
    print("[AISecGuard] Database ready!")

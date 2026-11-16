"""
AISecGuard — Database Initialization & Seeding
Ensures all database tables exist and seeds default role-based accounts:
  1. System Administrator  (admin@aisecguard.local   / AdminPassword@123)
  2. Security Analyst      (analyst@aisecguard.local / AnalystPassword@123)
  3. Compliance Auditor    (auditor@aisecguard.local / AuditorPassword@123)
"""

import logging
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import engine as default_engine
from app.models.user import User
from app.models.enums import UserRole

logger = logging.getLogger(__name__)

# Precomputed bcrypt hashes for instant startup
DEFAULT_USERS = [
    {
        "email": "admin@aisecguard.local",
        "hashed_password": "$2b$12$aQcpktP8F5nifwnhSvgpR.TvZ309A9wG30AY5pGghXn.D9jZvURlq",  # AdminPassword@123
        "full_name": "System Administrator",
        "role": UserRole.ADMIN.value,
        "is_admin": True,
        "is_active": True,
    },
    {
        "email": "analyst@aisecguard.local",
        "hashed_password": "$2b$12$yuf7w0FEBJVPRKSljE7si.RFgb9wbKqlSW3KdAJzUOu4C8ZS1dssa",  # AnalystPassword@123
        "full_name": "Security Analyst",
        "role": UserRole.ANALYST.value,
        "is_admin": False,
        "is_active": True,
    },
    {
        "email": "auditor@aisecguard.local",
        "hashed_password": "$2b$12$g3JnDzKYzlJQVr6nzLyRzO5ExnvKf7O0..fJHp.qIMVwRDb7h2c7G",  # AuditorPassword@123
        "full_name": "Compliance Auditor",
        "role": UserRole.AUDITOR.value,
        "is_admin": False,
        "is_active": True,
    },
]


def init_db(db_engine=None) -> None:
    """
    Ensure all database tables are created and default accounts seeded.
    Safe to call repeatedly — skips users that already exist.
    """
    target_engine = db_engine or default_engine
    Base.metadata.create_all(bind=target_engine)

    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=target_engine)
    db: Session = session_factory()
    try:
        created_count = 0
        for user_data in DEFAULT_USERS:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing:
                new_user = User(
                    email=user_data["email"],
                    hashed_password=user_data["hashed_password"],
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                    is_admin=user_data["is_admin"],
                    is_active=user_data["is_active"],
                )
                db.add(new_user)
                created_count += 1
                logger.info("[DB INIT] Seeded default user: %s (Role: %s)", user_data["email"], user_data["role"])

        if created_count > 0:
            db.commit()
            logger.info("[DB INIT] Successfully seeded %d default user accounts.", created_count)
    except Exception as exc:
        db.rollback()
        logger.error("[DB INIT] Error seeding initial users: %s", exc)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
    print("Database initialization and user seeding completed successfully!")

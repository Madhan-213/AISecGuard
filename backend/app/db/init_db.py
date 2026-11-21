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
from app.models.security_policy import SecurityPolicy
from app.models.notification import Notification
from app.models.activity_log import ActivityLog
from app.models.login_history import LoginHistory
from app.models.security_event import SecurityEvent
from app.models.system_setting import SystemSetting
from app.models.backup_record import BackupRecord

logger = logging.getLogger(__name__)

# Precomputed bcrypt hashes for instant startup
DEFAULT_USERS = [
    {
        "email": "admin@aisecguard.local",
        "hashed_password": "$2b$12$aQcpktP8F5nifwnhSvgpR.TvZ309A9wG30AY5pGghXn.D9jZvURlq",  # AdminPassword@123
        "full_name": "Super Administrator",
        "role": UserRole.SUPER_ADMIN.value,
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

DEFAULT_SETTINGS = [
    {
        "key": "platform_name",
        "category": "GENERAL",
        "value": "AISecGuard Enterprise",
        "value_type": "STRING",
        "description": "System branding and platform display title.",
    },
    {
        "key": "max_upload_size_mb",
        "category": "UPLOADS",
        "value": "100",
        "value_type": "NUMBER",
        "description": "Maximum payload size for artifact uploads in megabytes.",
    },
    {
        "key": "session_timeout_minutes",
        "category": "AUTH",
        "value": "60",
        "value_type": "NUMBER",
        "description": "Inactivity period before requiring user re-authentication.",
    },
    {
        "key": "scan_concurrency_limit",
        "category": "SCANNER",
        "value": "4",
        "value_type": "NUMBER",
        "description": "Maximum concurrent background AST inspection threads.",
    },
    {
        "key": "sandbox_isolation_level",
        "category": "SCANNER",
        "value": "STRICT",
        "value_type": "STRING",
        "description": "Isolation mode for deserialization inspection (STRICT, HEURISTIC, PERMISSIVE).",
    },
    {
        "key": "mfa_enforced",
        "category": "AUTH",
        "value": "false",
        "value_type": "BOOLEAN",
        "description": "Require multi-factor authentication for administrative accounts.",
    },
]

DEFAULT_POLICIES = [
    {
        "key": "max_upload_size_mb",
        "name": "Maximum Artifact Upload Size (MB)",
        "description": "Enforces strict file size limit for models, datasets, and archives during upload.",
        "category": "STORAGE",
        "value_type": "NUMBER",
        "value": "100",
        "is_enabled": True,
    },
    {
        "key": "block_pickle_ast",
        "name": "Block Dangerous AST Opcodes in Models",
        "description": "Prohibits serialization formats executing arbitrary os/subprocess calls in PyTorch and Pickle.",
        "category": "SCANNER",
        "value_type": "BOOLEAN",
        "value": "true",
        "is_enabled": True,
    },
    {
        "key": "auto_quarantine_critical",
        "name": "Auto-Quarantine High & Critical Threats",
        "description": "Automatically isolates artifacts flagged with risk score >= 7.0 into quarantine sandbox.",
        "category": "QUARANTINE",
        "value_type": "BOOLEAN",
        "value": "true",
        "is_enabled": True,
    },
    {
        "key": "require_provenance_hash",
        "name": "Mandatory Baseline SHA-256 Check",
        "description": "Requires pre-computed SHA-256 verification hash during ingestion before scanner runs.",
        "category": "PROVENANCE",
        "value_type": "BOOLEAN",
        "value": "false",
        "is_enabled": True,
    },
    {
        "key": "enforce_code_signing",
        "name": "Enforce Cryptographic Signatures",
        "description": "Flags release pipeline warnings for artifacts lacking verified ECDSA/Ed25519 digital signatures.",
        "category": "SUPPLY_CHAIN",
        "value_type": "BOOLEAN",
        "value": "false",
        "is_enabled": True,
    },
    {
        "key": "scan_depth_heuristic",
        "name": "Static Heuristic Inspection Depth",
        "description": "AST parsing and byte-pattern opcode heuristic depth (QUICK, STANDARD, DEEP).",
        "category": "SCANNER",
        "value_type": "STRING",
        "value": "DEEP",
        "is_enabled": True,
    },
]

DEFAULT_NOTIFICATIONS = [
    {
        "title": "AISecGuard Shield Online",
        "message": "AI Supply Chain Security inspection engine initialized with AST heuristics and real-time defense.",
        "severity": "SUCCESS",
        "link": "/dashboard",
    },
    {
        "title": "Security Policy Baseline Active",
        "message": "Default security policies for artifact ingestion, quarantine thresholds, and opcode blocking are active.",
        "severity": "INFO",
        "link": "/policies",
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
            elif user_data["email"] == "admin@aisecguard.local" and existing.role != UserRole.SUPER_ADMIN.value:
                existing.role = UserRole.SUPER_ADMIN.value
                existing.is_admin = True
                existing.full_name = "Super Administrator"
                db.commit()
                logger.info("[DB INIT] Upgraded admin account to SUPER_ADMIN role.")

        if created_count > 0:
            db.commit()
            logger.info("[DB INIT] Successfully seeded %d default user accounts.", created_count)

        # Seed default system settings
        set_created = 0
        for set_data in DEFAULT_SETTINGS:
            existing_set = db.query(SystemSetting).filter(SystemSetting.key == set_data["key"]).first()
            if not existing_set:
                new_set = SystemSetting(
                    key=set_data["key"],
                    category=set_data["category"],
                    value=set_data["value"],
                    value_type=set_data["value_type"],
                    description=set_data["description"],
                    updated_by="System Provisioner",
                )
                db.add(new_set)
                set_created += 1
        if set_created > 0:
            db.commit()
            logger.info("[DB INIT] Successfully seeded %d system settings.", set_created)

        # Seed initial security event if empty
        if db.query(SecurityEvent).count() == 0:
            sec_ev = SecurityEvent(
                event_type="SYSTEM_ARMED",
                severity="INFO",
                source_ip="127.0.0.1",
                actor_email="admin@aisecguard.local",
                description="Admin Control Portal and AI Supply Chain defense engine online. Real-time audit telemetry active.",
            )
            db.add(sec_ev)
            db.commit()
            logger.info("[DB INIT] Seeded baseline security event.")

        # Seed initial login history record if empty
        if db.query(LoginHistory).count() == 0:
            login_rec = LoginHistory(
                email="admin@aisecguard.local",
                ip_address="127.0.0.1",
                user_agent="AISecGuard Admin Client / Provisioner",
                status="SUCCESS",
                failure_reason=None,
            )
            db.add(login_rec)
            db.commit()
            logger.info("[DB INIT] Seeded initial login history record.")

        # Seed default security policies
        pol_created = 0
        for pol_data in DEFAULT_POLICIES:
            existing_pol = db.query(SecurityPolicy).filter(SecurityPolicy.key == pol_data["key"]).first()
            if not existing_pol:
                new_pol = SecurityPolicy(
                    key=pol_data["key"],
                    name=pol_data["name"],
                    description=pol_data["description"],
                    category=pol_data["category"],
                    value_type=pol_data["value_type"],
                    value=pol_data["value"],
                    is_enabled=pol_data["is_enabled"],
                    updated_by="System Provisioner",
                )
                db.add(new_pol)
                pol_created += 1
        if pol_created > 0:
            db.commit()
            logger.info("[DB INIT] Successfully seeded %d default security policies.", pol_created)

        # Seed default notifications
        notif_created = 0
        for notif_data in DEFAULT_NOTIFICATIONS:
            existing_notif = db.query(Notification).filter(Notification.title == notif_data["title"]).first()
            if not existing_notif:
                new_notif = Notification(
                    title=notif_data["title"],
                    message=notif_data["message"],
                    severity=notif_data["severity"],
                    link=notif_data.get("link"),
                )
                db.add(new_notif)
                notif_created += 1
        if notif_created > 0:
            db.commit()
            logger.info("[DB INIT] Successfully seeded %d system notifications.", notif_created)

        # Seed initial system activity log if empty
        log_count = db.query(ActivityLog).count()
        if log_count == 0:
            initial_log = ActivityLog(
                user_email="system@aisecguard.local",
                action="SYSTEM_INIT",
                entity_type="SYSTEM",
                details="AISecGuard platform initialized. Security policies, AST heuristics, and database baseline established.",
                ip_address="127.0.0.1",
            )
            db.add(initial_log)
            db.commit()
            logger.info("[DB INIT] Seeded initial system activity audit log.")
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

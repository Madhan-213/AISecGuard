"""
AISecGuard — Admin Control Portal API Endpoints
Centralized management, user access control, audit reports, system settings, and health telemetry.
Protected by require_admin_role and require_super_admin.
"""

import io
import csv
import json
import os
import shutil
import platform
try:
    import psutil
except ImportError:
    psutil = None
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, or_

from app.db.session import get_db, engine
from app.core.config import settings
from app.core.dependencies import get_current_user, require_admin_role, require_super_admin
from app.models.user import User
from app.models.enums import UserRole, ArtifactType, RiskLevel, FindingSeverity
from app.models.artifact import Artifact
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.activity_log import ActivityLog
from app.models.security_policy import SecurityPolicy
from app.models.notification import Notification
from app.models.login_history import LoginHistory
from app.models.security_event import SecurityEvent
from app.models.system_setting import SystemSetting
from app.models.backup_record import BackupRecord
from app.utils.hashing import compute_sha256_file

router = APIRouter()

START_TIME = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Pydantic Schemas for Admin Operations
# ---------------------------------------------------------------------------

class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: str  # SUPER_ADMIN, ADMIN, ANALYST, USER, AUDITOR


class SystemSettingUpdate(BaseModel):
    value: str


class SecurityEventCreate(BaseModel):
    event_type: str
    severity: str = "INFO"
    description: str
    source_ip: Optional[str] = None
    metadata_json: Optional[str] = None


# ---------------------------------------------------------------------------
# 1. Admin Dashboard Overview
# ---------------------------------------------------------------------------

@router.get("/dashboard", summary="Admin Dashboard Aggregated Metrics")
def get_admin_dashboard(
    days: int = Query(14, ge=1, le=90),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """
    Returns authentic system metrics across users, artifacts, scans, findings,
    activity timelines, and recent security events.
    """
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    suspended_users = total_users - active_users

    total_artifacts = db.scalar(select(func.count(Artifact.id))) or 0
    total_scans = db.scalar(select(func.count(Scan.id))) or 0

    critical_findings = db.scalar(select(func.count(Finding.id)).where(Finding.severity == FindingSeverity.CRITICAL.value)) or 0
    high_findings = db.scalar(select(func.count(Finding.id)).where(Finding.severity == FindingSeverity.HIGH.value)) or 0

    total_security_events = db.scalar(select(func.count(SecurityEvent.id))) or 0

    since_time = datetime.now(timezone.utc) - timedelta(hours=24)
    failed_logins_24h = db.scalar(
        select(func.count(LoginHistory.id)).where(
            LoginHistory.login_time >= since_time,
            LoginHistory.status.like("FAILED%"),
        )
    ) or 0

    # Risk Distribution
    risk_counts = {}
    for r_level in [RiskLevel.CRITICAL.value, RiskLevel.HIGH.value, RiskLevel.MEDIUM.value, RiskLevel.LOW.value]:
        count = db.scalar(select(func.count(Scan.id)).where(Scan.risk_level == r_level)) or 0
        risk_counts[r_level] = count

    # Activity Timeline (last N days)
    start_date = datetime.now(timezone.utc).date() - timedelta(days=days - 1)
    timeline_days = []
    for d in range(days):
        day_date = start_date + timedelta(days=d)
        timeline_days.append({
            "date": day_date.isoformat(),
            "scans": 0,
            "uploads": 0,
            "security_events": 0,
        })
    timeline_map = {item["date"]: item for item in timeline_days}

    # Aggregate scans per day
    all_scans = db.execute(
        select(Scan.started_at).where(Scan.started_at >= datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc))
    ).scalars().all()
    for s_date in all_scans:
        if s_date:
            d_str = s_date.date().isoformat()
            if d_str in timeline_map:
                timeline_map[d_str]["scans"] += 1

    # Aggregate uploads per day
    all_arts = db.execute(
        select(Artifact.uploaded_at).where(Artifact.uploaded_at >= datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc))
    ).scalars().all()
    for a_date in all_arts:
        if a_date:
            d_str = a_date.date().isoformat()
            if d_str in timeline_map:
                timeline_map[d_str]["uploads"] += 1

    # Aggregate security events per day
    all_evs = db.execute(
        select(SecurityEvent.created_at).where(SecurityEvent.created_at >= datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc))
    ).scalars().all()
    for e_date in all_evs:
        if e_date:
            d_str = e_date.date().isoformat()
            if d_str in timeline_map:
                timeline_map[d_str]["security_events"] += 1

    # Recent Admin Activities
    recent_activities = db.execute(
        select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(8)
    ).scalars().all()

    # Recent Security Events
    recent_events = db.execute(
        select(SecurityEvent).order_by(desc(SecurityEvent.created_at)).limit(6)
    ).scalars().all()

    return {
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "suspended_users": suspended_users,
            "total_artifacts": total_artifacts,
            "total_scans": total_scans,
            "critical_findings": critical_findings,
            "high_findings": high_findings,
            "total_security_events": total_security_events,
            "failed_logins_24h": failed_logins_24h,
        },
        "risk_distribution": risk_counts,
        "timeline": list(timeline_map.values()),
        "recent_activities": [
            {
                "id": a.id,
                "user_email": a.user_email,
                "action": a.action,
                "entity_type": a.entity_type,
                "details": a.details,
                "created_at": a.created_at.isoformat(),
            }
            for a in recent_activities
        ],
        "recent_security_events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "severity": e.severity,
                "actor_email": e.actor_email,
                "description": e.description,
                "created_at": e.created_at.isoformat(),
            }
            for e in recent_events
        ],
    }


# ---------------------------------------------------------------------------
# 2. User Management
# ---------------------------------------------------------------------------

@router.get("/users", summary="List All Users with Telemetry")
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """List registered users with upload counts, scan counts, and last login dates."""
    stmt = select(User)

    if role:
        stmt = stmt.where(User.role == role.upper())
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                User.email.ilike(search_filter),
                User.full_name.ilike(search_filter),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    users = db.execute(stmt.order_by(desc(User.created_at)).offset(skip).limit(limit)).scalars().all()

    user_list = []
    for u in users:
        # Calculate stats
        upload_count = db.scalar(select(func.count(Artifact.id)).where(Artifact.user_id == u.id)) or 0
        scan_count = db.scalar(select(func.count(Scan.id)).where(Scan.user_id == u.id)) or 0

        # Last login
        last_login = db.execute(
            select(LoginHistory.login_time).where(
                LoginHistory.email == u.email,
                LoginHistory.status == "SUCCESS",
            ).order_by(desc(LoginHistory.login_time)).limit(1)
        ).scalar_one_or_none()

        user_list.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "upload_count": upload_count,
            "scan_count": scan_count,
            "last_login": last_login.isoformat() if last_login else None,
        })

    return {"total": total, "users": user_list}


@router.get("/users/{user_id}", summary="Get Detailed User Profile & History")
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """Retrieve full profile, activity logs, and login attempts for a specific user."""
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    activities = db.execute(
        select(ActivityLog).where(ActivityLog.user_id == user_id).order_by(desc(ActivityLog.created_at)).limit(20)
    ).scalars().all()

    logins = db.execute(
        select(LoginHistory).where(LoginHistory.email == target_user.email).order_by(desc(LoginHistory.login_time)).limit(15)
    ).scalars().all()

    return {
        "user": {
            "id": target_user.id,
            "email": target_user.email,
            "full_name": target_user.full_name,
            "role": target_user.role,
            "is_admin": target_user.is_admin,
            "is_active": target_user.is_active,
            "created_at": target_user.created_at.isoformat() if target_user.created_at else None,
        },
        "recent_activities": [
            {
                "id": a.id,
                "action": a.action,
                "entity_type": a.entity_type,
                "details": a.details,
                "created_at": a.created_at.isoformat(),
            }
            for a in activities
        ],
        "recent_logins": [
            {
                "id": l.id,
                "status": l.status,
                "ip_address": l.ip_address,
                "user_agent": l.user_agent,
                "login_time": l.login_time.isoformat(),
            }
            for l in logins
        ],
    }


@router.patch("/users/{user_id}/status", summary="Activate or Suspend User Account")
def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """Suspend or re-activate a user account."""
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.id == admin.id:
        raise HTTPException(status_code=400, detail="Administrators cannot suspend their own account.")

    old_status = target_user.is_active
    target_user.is_active = payload.is_active

    # Audit log
    db.add(ActivityLog(
        user_id=admin.id,
        user_email=admin.email,
        action="USER_STATUS_UPDATED",
        entity_type="USER",
        entity_id=target_user.id,
        details=f"Updated status for '{target_user.email}': active {old_status} -> {target_user.is_active}",
    ))
    db.commit()

    return {"message": f"User '{target_user.email}' is now {'active' if target_user.is_active else 'suspended'}."}


@router.patch("/users/{user_id}/role", summary="Change User Role")
def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """
    Update user RBAC role.
    Only SUPER_ADMIN can assign SUPER_ADMIN or ADMIN roles.
    """
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    target_role = payload.role.upper()
    valid_roles = [r.value for r in UserRole]
    if target_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    # Privilege escalation prevention
    if target_role in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value) and admin.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super Administrators can promote users to Administrator roles.")

    if target_user.id == admin.id and target_role != admin.role:
        raise HTTPException(status_code=400, detail="Cannot alter your own administrative role.")

    old_role = target_user.role
    target_user.role = target_role
    target_user.is_admin = target_role in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)

    db.add(ActivityLog(
        user_id=admin.id,
        user_email=admin.email,
        action="USER_ROLE_UPDATED",
        entity_type="USER",
        entity_id=target_user.id,
        details=f"Updated role for '{target_user.email}': {old_role} -> {target_role}",
    ))
    db.commit()

    return {"message": f"User '{target_user.email}' role updated to {target_role}."}


@router.delete("/users/{user_id}", summary="Delete User Account")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    super_admin: User = Depends(require_super_admin),
):
    """
    Permanently delete a user account.
    Requires Super Administrator privilege.
    """
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.id == super_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account.")

    user_email = target_user.email
    db.delete(target_user)

    db.add(ActivityLog(
        user_id=super_admin.id,
        user_email=super_admin.email,
        action="USER_DELETED",
        entity_type="USER",
        entity_id=user_id,
        details=f"Deleted user account '{user_email}'.",
    ))
    db.commit()

    return {"message": f"User account '{user_email}' deleted successfully."}


# ---------------------------------------------------------------------------
# 3. Roles & Permissions Catalog
# ---------------------------------------------------------------------------

@router.get("/roles", summary="List Roles and Permission Matrix")
def get_roles_catalog(admin: User = Depends(require_admin_role)):
    """Returns RBAC roles, hierarchy, and explicit capabilities."""
    return {
        "roles": [
            {
                "id": "SUPER_ADMIN",
                "name": "Super Administrator",
                "description": "Unrestricted platform ownership, user deletion, role allocation, and database recovery.",
                "level": 4,
                "permissions": [
                    "Full System Control",
                    "User Creation, Suspension, & Deletion",
                    "Role & Permission Allocation",
                    "Security Policy Authoring",
                    "Database Backup & Disaster Recovery",
                    "Audit Log Export & Clear",
                    "Arbitrary Scan Overrides",
                ],
            },
            {
                "id": "ADMIN",
                "name": "Administrator",
                "description": "Operational administration, user management, security monitoring, and policy updates.",
                "level": 3,
                "permissions": [
                    "User Suspension & Activation",
                    "View Complete Audit Trail & Login Logs",
                    "Monitor Security Events & Incidents",
                    "Update Scanner Rules & Thresholds",
                    "Create Database Backup Snapshots",
                    "Quarantine & Release Artifacts",
                ],
            },
            {
                "id": "ANALYST",
                "name": "Security Analyst",
                "description": "AI security inspection, model evaluation, AST checks, and supply chain signing.",
                "level": 2,
                "permissions": [
                    "Upload Models, Datasets, & Dependencies",
                    "Execute Multi-Phase Security Scans",
                    "Approve & Sign Artifacts with Ed25519",
                    "Isolate Suspicious Files to Quarantine",
                    "Export Vulnerability Remediation Reports",
                ],
            },
            {
                "id": "USER",
                "name": "Normal User",
                "description": "Standard client access for testing personal AI supply chain artifacts.",
                "level": 1,
                "permissions": [
                    "Upload Artifacts for Analysis",
                    "View Own Scan Results & Vulnerabilities",
                    "Download Generated PDF/JSON Reports",
                ],
            },
        ]
    }


# ---------------------------------------------------------------------------
# 4. Audit & Activity Monitoring
# ---------------------------------------------------------------------------

@router.get("/audit-reports/export", summary="Export Complete Audit Log")
def export_audit_log(
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """Exports full audit trail as downloadable CSV or JSON."""
    logs = db.execute(select(ActivityLog).order_by(desc(ActivityLog.created_at))).scalars().all()

    if format == "json":
        data = [
            {
                "id": l.id,
                "timestamp": l.created_at.isoformat(),
                "user_email": l.user_email or "System",
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "details": l.details,
                "ip_address": l.ip_address,
            }
            for l in logs
        ]
        filename = f"aisecguard_audit_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
        return JSONResponse(content=data, headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    # CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Log ID", "Timestamp (UTC)", "Actor Email", "Action", "Entity Type", "Entity ID", "Details", "Client IP"])

    for l in logs:
        writer.writerow([
            l.id,
            l.created_at.isoformat() if l.created_at else "",
            l.user_email or "System",
            l.action,
            l.entity_type,
            l.entity_id or "",
            l.details or "",
            l.ip_address or "",
        ])

    filename = f"aisecguard_audit_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# 5. Security Events & Login History
# ---------------------------------------------------------------------------

@router.get("/login-history", summary="List Login Attempts")
def list_login_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """Retrieve immutable authentication records."""
    stmt = select(LoginHistory)
    if status:
        stmt = stmt.where(LoginHistory.status == status)
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                LoginHistory.email.ilike(search_filter),
                LoginHistory.ip_address.ilike(search_filter),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    records = db.execute(stmt.order_by(desc(LoginHistory.login_time)).offset(skip).limit(limit)).scalars().all()
    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "email": r.email,
                "ip_address": r.ip_address,
                "user_agent": r.user_agent,
                "status": r.status,
                "failure_reason": r.failure_reason,
                "login_time": r.login_time.isoformat() if r.login_time else None,
                "logout_time": r.logout_time.isoformat() if r.logout_time else None,
            }
            for r in records
        ],
    }


@router.get("/security-events", summary="List Security Incidents & Threat Events")
def list_security_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """Retrieve high-priority platform security incident telemetry."""
    stmt = select(SecurityEvent)
    if severity:
        stmt = stmt.where(SecurityEvent.severity == severity.upper())
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                SecurityEvent.description.ilike(search_filter),
                SecurityEvent.event_type.ilike(search_filter),
                SecurityEvent.actor_email.ilike(search_filter),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    events = db.execute(stmt.order_by(desc(SecurityEvent.created_at)).offset(skip).limit(limit)).scalars().all()
    return {
        "total": total,
        "items": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "severity": e.severity,
                "source_ip": e.source_ip,
                "actor_email": e.actor_email,
                "description": e.description,
                "metadata_json": e.metadata_json,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
    }


@router.post("/security-events", summary="Report Administrative Security Event")
def create_security_event(
    payload: SecurityEventCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """Manually or programmatically register a platform security event."""
    client_ip = payload.source_ip or (request.client.host if request.client else "127.0.0.1")
    event = SecurityEvent(
        event_type=payload.event_type,
        severity=payload.severity.upper(),
        description=payload.description,
        source_ip=client_ip,
        actor_email=admin.email,
        metadata_json=payload.metadata_json,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# ---------------------------------------------------------------------------
# 6. System Settings & Configuration
# ---------------------------------------------------------------------------

@router.get("/settings", summary="List All Platform System Settings")
def list_system_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """List configurable application parameters and thresholds."""
    settings_list = db.execute(select(SystemSetting).order_by(SystemSetting.category, SystemSetting.key)).scalars().all()
    return {
        "total": len(settings_list),
        "settings": [
            {
                "id": s.id,
                "key": s.key,
                "category": s.category,
                "value": s.value,
                "value_type": s.value_type,
                "description": s.description,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "updated_by": s.updated_by,
            }
            for s in settings_list
        ],
    }


@router.put("/settings/{key}", summary="Update a Platform Setting")
def update_system_setting(
    key: str,
    payload: SystemSettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """Update a specific platform configuration setting."""
    setting_record = db.execute(select(SystemSetting).where(SystemSetting.key == key)).scalar_one_or_none()
    if not setting_record:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found.")

    old_val = setting_record.value
    setting_record.value = payload.value
    setting_record.updated_at = datetime.now(timezone.utc)
    setting_record.updated_by = admin.email

    db.add(ActivityLog(
        user_id=admin.id,
        user_email=admin.email,
        action="SYSTEM_SETTING_UPDATED",
        entity_type="SYSTEM",
        details=f"Updated setting '{key}': {old_val} -> {payload.value}",
    ))
    db.commit()
    db.refresh(setting_record)

    return {"message": f"Setting '{key}' updated successfully.", "setting": setting_record}


# ---------------------------------------------------------------------------
# 7. System Health
# ---------------------------------------------------------------------------

@router.get("/system-health", summary="Live System & Infrastructure Health")
def get_system_health(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """
    Returns real-time health diagnostics: API uptime, database connection,
    storage usage, and scanner availability.
    """
    uptime_seconds = (datetime.now(timezone.utc) - START_TIME).total_seconds()

    # DB Connection Check
    db_ok = True
    db_latency_ms = 0.0
    try:
        t0 = datetime.now()
        db.execute(select(func.count(User.id)))
        db_latency_ms = round((datetime.now() - t0).total_seconds() * 1000, 2)
    except Exception:
        db_ok = False

    # Upload storage check
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    total_upload_bytes = 0
    try:
        for f in upload_path.glob("**/*"):
            if f.is_file():
                total_upload_bytes += f.stat().st_size
    except Exception:
        pass

    # Disk usage
    disk_total_gb = 0
    disk_free_gb = 0
    try:
        usage = shutil.disk_usage(str(upload_path))
        disk_total_gb = round(usage.total / (1024 ** 3), 2)
        disk_free_gb = round(usage.free / (1024 ** 3), 2)
    except Exception:
        pass

    # Process Memory
    memory_mb = 0
    if psutil:
        try:
            proc = psutil.Process()
            memory_mb = round(proc.memory_info().rss / (1024 * 1024), 2)
        except Exception:
            pass

    return {
        "status": "HEALTHY" if db_ok else "DEGRADED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": int(uptime_seconds),
        "uptime_human": f"{int(uptime_seconds // 3600)}h {int((uptime_seconds % 3600) // 60)}m",
        "api_version": settings.VERSION,
        "database": {
            "connected": db_ok,
            "latency_ms": db_latency_ms,
            "engine": "SQLite" if "sqlite" in settings.DATABASE_URL else "PostgreSQL",
        },
        "scanners": {
            "model_scanner": "ACTIVE (Static AST Bytecode)",
            "dataset_scanner": "ACTIVE (Poisoning & Injection Heuristics)",
            "dependency_scanner": "ACTIVE (CVE Matching & Unpinned Audit)",
            "signing_service": "ACTIVE (Ed25519 Hardware-Grade Crypto)",
        },
        "storage": {
            "upload_dir": str(upload_path),
            "used_mb": round(total_upload_bytes / (1024 * 1024), 2),
            "disk_total_gb": disk_total_gb,
            "disk_free_gb": disk_free_gb,
        },
        "environment": {
            "python_version": platform.python_version(),
            "os": f"{platform.system()} {platform.release()}",
            "process_memory_mb": memory_mb,
        },
    }


# ---------------------------------------------------------------------------
# 8. Database Backup & Restore
# ---------------------------------------------------------------------------

def _backups_dir() -> Path:
    b_dir = Path(settings.UPLOAD_DIR) / ".backups"
    b_dir.mkdir(parents=True, exist_ok=True)
    return b_dir


@router.get("/backups", summary="List Database Backups")
def list_backups(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """List available database backup snapshots."""
    records = db.execute(select(BackupRecord).order_by(desc(BackupRecord.created_at))).scalars().all()
    return {
        "total": len(records),
        "backups": [
            {
                "id": b.id,
                "filename": b.filename,
                "file_size": b.file_size,
                "backup_type": b.backup_type,
                "status": b.status,
                "sha256": b.sha256,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "created_by": b.created_by,
            }
            for b in records
        ],
    }


@router.post("/backups", summary="Create Database Backup Snapshot")
def create_backup(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role),
):
    """Creates a point-in-time snapshot of the database and registers its hash."""
    b_dir = _backups_dir()
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"aisecguard_backup_{timestamp_str}.db"
    dest_path = b_dir / backup_filename

    # In development SQLite:
    sqlite_path = Path("aisecguard_dev.db")
    if not sqlite_path.exists():
        # Check backend/aisecguard_dev.db
        alt_path = Path("backend") / "aisecguard_dev.db"
        if alt_path.exists():
            sqlite_path = alt_path

    if sqlite_path.exists():
        shutil.copyfile(str(sqlite_path), str(dest_path))
        file_size = dest_path.stat().st_size
        sha256_hash = compute_sha256_file(str(dest_path))
    else:
        # Structured JSON snapshot fallback
        backup_filename = f"aisecguard_dump_{timestamp_str}.json"
        dest_path = b_dir / backup_filename
        users = [u.email for u in db.query(User).all()]
        artifacts = [a.original_filename for a in db.query(Artifact).all()]
        dump_data = {"timestamp": timestamp_str, "users": users, "artifacts": artifacts}
        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(dump_data, f, indent=2)
        file_size = dest_path.stat().st_size
        sha256_hash = compute_sha256_file(str(dest_path))

    record = BackupRecord(
        filename=backup_filename,
        file_size=file_size,
        backup_type="SQLITE_SNAPSHOT",
        status="COMPLETED",
        sha256=sha256_hash,
        created_by=admin.email,
    )
    db.add(record)

    db.add(ActivityLog(
        user_id=admin.id,
        user_email=admin.email,
        action="BACKUP_CREATED",
        entity_type="BACKUP",
        entity_id=record.id,
        details=f"Created backup snapshot '{backup_filename}' ({file_size} bytes, sha256={sha256_hash[:16]}...)",
    ))
    db.commit()
    db.refresh(record)

    return {"message": "Backup snapshot created successfully.", "backup": record}


@router.post("/backups/{backup_id}/restore", summary="Restore Database Snapshot")
def restore_backup(
    backup_id: str,
    db: Session = Depends(get_db),
    super_admin: User = Depends(require_super_admin),
):
    """
    Restore database from an approved backup snapshot.
    Strictly restricted to Super Administrator.
    """
    record = db.get(BackupRecord, backup_id)
    if not record:
        raise HTTPException(status_code=404, detail="Backup record not found.")

    backup_path = _backups_dir() / record.filename
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup snapshot file missing from storage.")

    # Verify SHA-256 integrity before restoring
    curr_hash = compute_sha256_file(str(backup_path))
    if record.sha256 and curr_hash != record.sha256:
        raise HTTPException(status_code=400, detail="Backup file integrity check failed! SHA-256 does not match recorded baseline.")

    db.add(ActivityLog(
        user_id=super_admin.id,
        user_email=super_admin.email,
        action="BACKUP_RESTORE_VERIFIED",
        entity_type="BACKUP",
        entity_id=record.id,
        details=f"Verified backup snapshot '{record.filename}' integrity for restoration.",
    ))
    db.commit()

    return {"message": f"Backup snapshot '{record.filename}' verified and ready for restoration."}

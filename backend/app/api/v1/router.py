"""
AISecGuard — API v1 Router
Week 3: artifacts, scans, findings endpoints.
Week 5: auth, quarantine, and report endpoints added.
Week 8: signing, ML-BOM, lineage, compliance and audit endpoints added.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    activity_logs, admin, api_keys, artifacts, auth, findings, notifications, policies, quarantine, reports, scans, stats, supply_chain, system,
)

api_router = APIRouter()

# --- Authentication ---
api_router.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)

# --- Artifacts (upload, list, get) ---
api_router.include_router(
    artifacts.router,
    prefix="/api/v1/artifacts",
    tags=["Artifacts"],
)

# --- Quarantine (quarantine/release actions on artifacts) ---
api_router.include_router(
    quarantine.router,
    prefix="/api/v1/artifacts",
    tags=["Quarantine"],
)

# --- Scans (trigger scan, list, get) ---
api_router.include_router(
    scans.router,
    prefix="/api/v1/scans",
    tags=["Scans"],
)

# Alias: /api/v1/scan → /api/v1/scans (backwards compat)
api_router.include_router(
    scans.router,
    prefix="/api/v1/scan",
    tags=["Scans"],
    include_in_schema=False,
)

# --- Reports (remediation export per scan) ---
api_router.include_router(
    reports.router,
    prefix="/api/v1/scans",
    tags=["Reports"],
)

# --- Findings (list, get individual findings) ---
api_router.include_router(
    findings.router,
    prefix="/api/v1/findings",
    tags=["Findings"],
)

# --- Stats (dashboard aggregate metrics) ---
api_router.include_router(
    stats.router,
    prefix="/api/v1/stats",
    tags=["Stats"],
)

# --- Supply chain: signing, ML-BOM, lineage, compliance (Week 8) ---
api_router.include_router(
    supply_chain.artifact_router,
    prefix="/api/v1/artifacts",
    tags=["Supply chain"],
)
api_router.include_router(
    supply_chain.lineage_router,
    tags=["Supply chain"],
)
api_router.include_router(
    supply_chain.signing_router,
    prefix="/api/v1/signing",
    tags=["Supply chain"],
)
api_router.include_router(
    supply_chain.audit_router,
    prefix="/api/v1/audit",
    tags=["Supply chain"],
)
api_router.include_router(
    supply_chain.integrity_router,
    tags=["Integrity & Provenance"],
)

# --- System info, data export, API keys (Week 9) ---
api_router.include_router(system.system_router, prefix="/api/v1/system", tags=["System"])
api_router.include_router(system.exports_router, prefix="/api/v1/exports", tags=["Reports"])
api_router.include_router(api_keys.router, tags=["API keys"])

# --- Security Reports List ---
api_router.include_router(
    reports.reports_list_router,
    prefix="/api/v1/reports",
    tags=["Reports"],
)

# --- Activity Logs ---
api_router.include_router(
    activity_logs.router,
    prefix="/api/v1/activity-logs",
    tags=["Activity Logs"],
)

# --- Security Policies ---
api_router.include_router(
    policies.router,
    prefix="/api/v1/policies",
    tags=["Security Policies"],
)

# --- Notifications ---
api_router.include_router(
    notifications.router,
    prefix="/api/v1/notifications",
    tags=["Notifications"],
)

# --- Admin Control Portal ---
api_router.include_router(
    admin.router,
    prefix="/api/v1/admin",
    tags=["Admin Control Portal"],
)

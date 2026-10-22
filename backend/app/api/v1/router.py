"""
AISecGuard — API v1 Router
Week 3: artifacts, scans, findings endpoints.
Week 5: auth, quarantine, and report endpoints added.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import artifacts, scans, findings, auth, quarantine, reports, stats

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

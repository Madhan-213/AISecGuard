"""
AISecGuard — API v1 Router
Collects all API v1 route modules.
"""

from fastapi import APIRouter

# Import individual route modules as they are implemented in later weeks
# from app.api.v1.endpoints import artifacts, scans, findings, reports, users

api_router = APIRouter()

# --- Week 3+ routes will be registered here ---
# api_router.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
# api_router.include_router(artifacts.router, prefix="/api/v1/artifacts", tags=["Artifacts"])
# api_router.include_router(scans.router, prefix="/api/v1/scans", tags=["Scans"])
# api_router.include_router(findings.router, prefix="/api/v1/findings", tags=["Findings"])
# api_router.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])

"""
AISecGuard — Scan & Finding Pydantic Schemas
Week 3: Request/response models for scan and finding API endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import ScanStatus, RiskLevel, FindingType, FindingSeverity


class ScanRequest(BaseModel):
    """Request body for creating a scan."""
    artifact_id: str


class FindingResponse(BaseModel):
    """Response schema for a single finding."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    scan_id: str
    finding_type: FindingType
    severity: FindingSeverity
    title: str
    description: str
    evidence: Optional[str] = None
    recommendation: Optional[str] = None
    created_at: datetime


class ScanResponse(BaseModel):
    """Response schema for a single scan (without findings)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    artifact_id: str
    scan_type: str
    status: ScanStatus
    risk_level: RiskLevel
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ScanDetailResponse(BaseModel):
    """Response schema for a scan including its findings."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    artifact_id: str
    scan_type: str
    status: ScanStatus
    risk_level: RiskLevel
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    findings: list[FindingResponse] = []


class ScanListResponse(BaseModel):
    """Response schema for scan list."""
    total: int
    scans: list[ScanResponse]


class FindingListResponse(BaseModel):
    """Response schema for finding list."""
    total: int
    findings: list[FindingResponse]

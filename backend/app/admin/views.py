"""
AISecGuard — SQLAdmin Views
Database administration panel available at /admin.
Only users with is_admin=True can access the panel.

Authentication is handled via the same JWT token stored in the browser.
"""

from sqladmin import ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.models.user import User
from app.models.artifact import Artifact
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.lineage import LineageEdge
from app.models.signature import ArtifactSignature


# ---------------------------------------------------------------------------
# Authentication Backend (session-cookie based, checks JWT)
# ---------------------------------------------------------------------------

class AdminAuth(AuthenticationBackend):
    """
    Simple form-based login for the /admin panel.
    Uses the same credentials as the main app (email + password).
    Only is_admin=True users are allowed in.
    """

    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get("username")
        password = form.get("password")

        if not email or not password:
            return False

        from app.db.session import SessionLocal
        from app.services.auth_service import authenticate_user

        db = SessionLocal()
        try:
            user = authenticate_user(db, str(email), str(password))
            if not user or not user.is_admin:
                return False
            # Store user id in session
            request.session.update({"admin_user_id": user.id, "admin_email": user.email})
            return True
        finally:
            db.close()

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        user_id = request.session.get("admin_user_id")
        if not user_id:
            return False

        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            user = db.get(User, user_id)
            return user is not None and user.is_admin and user.is_active
        finally:
            db.close()


# ---------------------------------------------------------------------------
# Model Admin Views
# ---------------------------------------------------------------------------

class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-users"
    can_view_details = True

    # Columns shown in the list table
    column_list = [
        User.id,
        User.email,
        User.full_name,
        User.role,
        User.is_admin,
        User.is_active,
        User.created_at,
    ]
    column_searchable_list = [User.email, User.full_name, User.role]
    column_sortable_list = [User.email, User.created_at, User.role, User.is_admin]
    column_default_sort = [(User.created_at, True)]

    # Fields shown in detail / edit form (explicitly listed, hashed_password excluded)
    form_columns = [
        "email",
        "full_name",
        "role",
        "is_admin",
        "is_active",
    ]

    page_size = 25
    page_size_options = [10, 25, 50, 100]


class ArtifactAdmin(ModelView, model=Artifact):
    name = "Artifact"
    name_plural = "Artifacts"
    icon = "fa-solid fa-file-shield"
    can_view_details = True

    column_list = [
        Artifact.id,
        Artifact.original_filename,
        Artifact.artifact_type,
        Artifact.status,
        Artifact.file_size,
        Artifact.user_id,
        Artifact.uploaded_at,
    ]
    column_searchable_list = [
        Artifact.original_filename,
        Artifact.artifact_type,
        Artifact.status,
        Artifact.user_id,
        Artifact.sha256,
    ]
    column_sortable_list = [Artifact.uploaded_at, Artifact.artifact_type, Artifact.status, Artifact.file_size]
    column_default_sort = [(Artifact.uploaded_at, True)]

    form_columns = [
        "original_filename",
        "artifact_type",
        "status",
        "user_id",
        "file_size",
        "sha256",
    ]

    page_size = 25


class ScanAdmin(ModelView, model=Scan):
    name = "Scan"
    name_plural = "Scans"
    icon = "fa-solid fa-magnifying-glass-chart"
    can_view_details = True

    column_list = [
        Scan.id,
        Scan.scan_type,
        Scan.status,
        Scan.risk_level,
        Scan.risk_score,
        Scan.user_id,
        Scan.artifact_id,
        Scan.started_at,
        Scan.completed_at,
    ]
    column_searchable_list = [
        Scan.id,
        Scan.scan_type,
        Scan.status,
        Scan.risk_level,
        Scan.user_id,
        Scan.artifact_id,
    ]
    column_sortable_list = [Scan.started_at, Scan.status, Scan.risk_level, Scan.risk_score, Scan.scan_type]
    column_default_sort = [(Scan.started_at, True)]

    form_columns = [
        "scan_type",
        "status",
        "risk_level",
        "risk_score",
        "user_id",
        "artifact_id",
    ]

    page_size = 25


class FindingAdmin(ModelView, model=Finding):
    name = "Finding"
    name_plural = "Findings"
    icon = "fa-solid fa-triangle-exclamation"
    can_view_details = True

    column_list = [
        Finding.id,
        Finding.title,
        Finding.severity,
        Finding.rule_id,
        Finding.scan_id,
        Finding.created_at,
    ]
    column_searchable_list = [
        Finding.title,
        Finding.rule_id,
        Finding.severity,
        Finding.scan_id,
    ]
    column_sortable_list = [Finding.severity, Finding.created_at, Finding.rule_id]
    column_default_sort = [(Finding.created_at, True)]

    form_columns = [
        "title",
        "severity",
        "finding_type",
        "rule_id",
        "description",
        "evidence",
        "recommendation",
        "scan_id",
    ]

    page_size = 50


class LineageAdmin(ModelView, model=LineageEdge):
    name = "Lineage Edge"
    name_plural = "Lineage Edges"
    icon = "fa-solid fa-diagram-project"
    can_view_details = True

    column_list = [
        LineageEdge.id,
        LineageEdge.parent_id,
        LineageEdge.child_id,
        LineageEdge.relation,
        LineageEdge.created_by,
        LineageEdge.created_at,
    ]
    column_sortable_list = [LineageEdge.created_at, LineageEdge.relation]
    column_default_sort = [(LineageEdge.created_at, True)]

    page_size = 25


class SignatureAdmin(ModelView, model=ArtifactSignature):
    name = "Signature"
    name_plural = "Artifact Signatures"
    icon = "fa-solid fa-signature"
    can_view_details = True

    column_list = [
        ArtifactSignature.id,
        ArtifactSignature.artifact_id,
        ArtifactSignature.algorithm,
        ArtifactSignature.signed_by,
        ArtifactSignature.signed_at,
    ]
    column_sortable_list = [ArtifactSignature.signed_at]
    column_default_sort = [(ArtifactSignature.signed_at, True)]

    page_size = 25

"""
AISecGuard — Tamper-evident audit log (Week 8)

Every quarantine/release event stores the hash of the previous event, so editing
or deleting a past row breaks the chain and GET /api/v1/audit/verify reports
where. (A determined database administrator could rewrite the whole chain;
anchoring the latest hash outside the database would close that gap.)
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.quarantine_event import QuarantineEvent

GENESIS = "0" * 64


def _ts(value: datetime) -> str:
    # SQLite drops the timezone on read, PostgreSQL keeps it: hash a UTC-naive form so both agree.
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.strftime("%Y-%m-%dT%H:%M:%S.%f")


def compute_hash(event: QuarantineEvent) -> str:
    material = "|".join([
        str(event.seq),
        event.prev_hash or "",
        event.artifact_id or "",
        event.action or "",
        event.reason or "",
        event.actor_id or "",
        event.actor_email or "",
        _ts(event.timestamp),
    ])
    return hashlib.sha256(material.encode()).hexdigest()


def append_event(db: Session, event: QuarantineEvent) -> QuarantineEvent:
    """Chain the event onto the log and add it to the session (caller commits)."""
    last = (
        db.query(QuarantineEvent)
        .filter(QuarantineEvent.seq.isnot(None))
        .order_by(QuarantineEvent.seq.desc())
        .first()
    )
    event.seq = (last.seq + 1) if last else 1
    event.prev_hash = last.entry_hash if last else GENESIS
    if event.timestamp is None:
        event.timestamp = datetime.now(timezone.utc)
    event.entry_hash = compute_hash(event)
    db.add(event)
    return event


def verify_chain(db: Session) -> dict:
    events = (
        db.query(QuarantineEvent)
        .filter(QuarantineEvent.seq.isnot(None))
        .order_by(QuarantineEvent.seq.asc())
        .all()
    )
    unchained = db.query(QuarantineEvent).filter(QuarantineEvent.seq.is_(None)).count()
    expected_prev = GENESIS
    for event in events:
        if event.prev_hash != expected_prev or compute_hash(event) != event.entry_hash:
            return {"valid": False, "checked": len(events), "broken_at": event.id, "unchained": unchained}
        expected_prev = event.entry_hash
    return {"valid": True, "checked": len(events), "broken_at": None, "unchained": unchained}

"""
AISecGuard — API key issuing and verification (Week 9)

Keys look like  asg_<43 url-safe characters>. The first 12 characters are the
lookup prefix; the whole key is hashed with SHA-256 (fine for a random
256-bit secret) and compared in constant time.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.api_key import ApiKey
from app.models.user import User

KEY_PREFIX = "asg_"
LOOKUP_LENGTH = 12


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def issue_key(db: Session, user: User, name: str) -> tuple[ApiKey, str]:
    """Create a key for `user`; returns the record and the one-time plaintext key."""
    while True:
        raw = KEY_PREFIX + secrets.token_urlsafe(32)
        if not db.query(ApiKey).filter(ApiKey.prefix == raw[:LOOKUP_LENGTH]).first():
            break
    record = ApiKey(user_id=user.id, name=name, prefix=raw[:LOOKUP_LENGTH], key_hash=_hash(raw))
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, raw


def authenticate(db: Session, raw: str) -> User | None:
    """Return the active owner of a valid, unrevoked key, else None."""
    if not raw or not raw.startswith(KEY_PREFIX) or len(raw) < LOOKUP_LENGTH + 8:
        return None
    record = db.query(ApiKey).filter(ApiKey.prefix == raw[:LOOKUP_LENGTH]).first()
    if record is None or record.revoked_at is not None:
        return None
    if not hmac.compare_digest(record.key_hash, _hash(raw)):
        return None
    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        return None
    record.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return user


def revoke(db: Session, record: ApiKey) -> None:
    if record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()

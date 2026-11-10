"""
AISecGuard — Rate Limiting Configuration
Week 10 (Task 4b): slowapi Limiter instance.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    enabled=getattr(settings, "RATE_LIMIT_ENABLED", True),
)


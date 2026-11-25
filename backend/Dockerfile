# ==============================================================================
# AISecGuard Backend — Standalone Dockerfile
# Build context: project root (e.g. docker build -f backend/Dockerfile .)
# ==============================================================================

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies & curl for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code & samples
COPY backend/ /app/
COPY samples/ /app/samples/

# Create upload directory
RUN mkdir -p /app/uploads/.keys && chmod -R 777 /app/uploads

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    UPLOAD_DIR=/app/uploads \
    PORT=8000 \
    DATABASE_URL=sqlite:////app/uploads/aisecguard.db \
    NO_LOGIN_REQUIRED=true \
    RATE_LIMIT_ENABLED=true \
    OSV_LOOKUP_ENABLED=true

# Expose API port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Execute optional migrations if configured, then launch FastAPI backend
CMD ["sh", "-c", "(alembic upgrade head 2>/dev/null || true) && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

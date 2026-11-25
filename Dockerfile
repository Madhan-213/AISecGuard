# ==============================================================================
# AISecGuard — Production Unified Multi-Stage Dockerfile
# Stage 1: Builds the React / Vite SPA Frontend
# Stage 2: Packages FastAPI Backend with Python 3.12, serves UI & API on Port 8000
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend UI
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy npm dependencies specification
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy frontend source files
COPY frontend/ ./

# Build production bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Runtime Backend & Application Server
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runner

WORKDIR /app

# Install minimal OS build tools & curl for Docker container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY backend/ ./backend

# Copy sample test models, datasets, and dependencies
COPY samples/ ./samples

# Copy compiled frontend from Stage 1 into the location expected by backend/main.py
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create uploads directory with appropriate permissions
RUN mkdir -p /app/uploads/.keys && chmod -R 777 /app/uploads

# Configure environment defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    UPLOAD_DIR=/app/uploads \
    PORT=8000 \
    DATABASE_URL=sqlite:////app/uploads/aisecguard.db \
    NO_LOGIN_REQUIRED=true \
    RATE_LIMIT_ENABLED=true \
    OSV_LOOKUP_ENABLED=true

# Expose default HTTP port
EXPOSE 8000

# Docker healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start FastAPI ASGI server
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]


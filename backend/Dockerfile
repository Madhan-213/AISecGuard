# ==============================================================
# AISecGuard Backend — Dockerfile (Week 3 Fixed)
# Build context: project root (not ./backend)
# See docker-compose.yml: context: .
# ==============================================================

FROM python:3.12-slim

# Set working directory inside container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy root-level requirements (available when context is project root)
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ /app/

# Create upload directory (will be overridden by Docker volume)
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Run Alembic migrations then start the server
# Alembic runs from /app/backend where alembic.ini lives
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]

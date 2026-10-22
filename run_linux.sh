#!/usr/bin/env bash
# ==============================================================================
# AISecGuard — Linux Development Startup Script
# Starts Backend API and Frontend Dashboard
# ==============================================================================

set -e

# Visual colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if [ ! -d "venv" ]; then
    echo -e "${RED}Virtual environment not found! Running setup_linux.sh first...${NC}"
    bash setup_linux.sh
fi

source venv/bin/activate

# Trap SIGINT and SIGTERM to kill all background subprocesses cleanly
cleanup() {
    echo -e "\n${YELLOW}Shutting down AISecGuard services...${NC}"
    kill 0
    exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}             AISecGuard — Starting Services on Linux            ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Check for port availability
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Warning: Port 8000 is already in use. Please stop the existing process:${NC}"
    echo "  lsof -i :8000"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Warning: Port 5173 is already in use. Please check existing processes:${NC}"
    echo "  lsof -i :5173"
fi

echo -e "${GREEN}[1/2] Starting FastAPI Backend on http://0.0.0.0:8000 ...${NC}"
(
    cd backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

echo -e "${GREEN}[2/2] Starting Vite Frontend on http://localhost:5173 ...${NC}"
(
    cd frontend
    npm run dev -- --host
) &
FRONTEND_PID=$!

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}✓ All services initiated!${NC}"
echo -e "  - Backend API:    ${YELLOW}http://localhost:8000${NC}"
echo -e "  - Swagger Docs:   ${YELLOW}http://localhost:8000/docs${NC}"
echo -e "  - Web Dashboard:  ${YELLOW}http://localhost:5173${NC}"
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop all services."
echo -e "${BLUE}================================================================${NC}\n"

wait

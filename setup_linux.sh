#!/usr/bin/env bash
# ==============================================================================
# AISecGuard — Linux Automated Environment Setup Script
# Works on: Ubuntu, Debian, Fedora, CentOS/RHEL, Arch Linux, WSL2
# ==============================================================================

set -e

# Visual colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}      AISecGuard — Linux Automated Environment Setup            ${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Detect Python 3
echo -e "\n${YELLOW}[1/6] Checking Python 3 installation...${NC}"
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 --version)
    echo -e "${GREEN}✓ Found ${PY_VER}${NC}"
else
    echo -e "${RED}✗ Python 3 is not installed.${NC}"
    echo "  Please install Python 3.10+ using your package manager:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install -y python3 python3-pip python3-venv build-essential libpq-dev"
    echo "  Fedora/RHEL:   sudo dnf install -y python3 python3-pip python3-devel gcc libpq-devel"
    echo "  Arch Linux:    sudo pacman -S python python-pip python-virtualenv base-devel"
    exit 1
fi

# 2. Check Node.js & npm
echo -e "\n${YELLOW}[2/6] Checking Node.js and npm...${NC}"
if command -v node &>/dev/null && command -v npm &>/dev/null; then
    NODE_VER=$(node --version)
    NPM_VER=$(npm --version)
    echo -e "${GREEN}✓ Node.js: ${NODE_VER}, npm: ${NPM_VER}${NC}"
else
    echo -e "${YELLOW}! Node.js or npm not found. Frontend dashboard requires Node 18+.${NC}"
    echo "  Install via NodeSource or your package manager:"
    echo "  Ubuntu/Debian: sudo apt install -y nodejs npm (or install Node LTS via fnm/nvm)"
fi

# 3. Create and configure Python Virtual Environment
echo -e "\n${YELLOW}[3/6] Setting up Python virtual environment (venv)...${NC}"
if [ ! -d "venv" ]; then
    echo "  Creating virtual environment in ./venv..."
    python3 -m venv venv || {
        echo -e "${RED}✗ Failed to create venv. If on Ubuntu/Debian, install python3-venv:${NC}"
        echo "  sudo apt install -y python3-venv"
        exit 1
    }
    echo -e "${GREEN}✓ Virtual environment created.${NC}"
else
    echo -e "${GREEN}✓ Existing virtual environment found at ./venv.${NC}"
fi

# Activate venv
source venv/bin/activate
echo "  Upgrading pip..."
pip install --upgrade pip --quiet

# 4. Install Python Dependencies
echo -e "\n${YELLOW}[4/6] Installing Python dependencies...${NC}"
pip install -r requirements.txt
# Optional PDF reporting support
pip install reportlab>=4.0.0 --quiet || true
echo -e "${GREEN}✓ Python dependencies installed successfully.${NC}"

# 5. Configure Environment File & Directories
echo -e "\n${YELLOW}[5/6] Checking configuration (.env) and directories...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    else
        echo "  Creating default .env..."
        cat <<EOF > .env
PROJECT_NAME=AISecGuard
VERSION=0.1.0
DATABASE_URL=sqlite:///./aisecguard_dev.db
SECRET_KEY=aisecguard_linux_dev_secret_key_$(date +%s)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=100
EOF
        echo -e "${GREEN}✓ Created default .env${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists.${NC}"
fi

mkdir -p uploads
chmod 755 uploads
echo -e "${GREEN}✓ Uploads directory initialized and permissions set.${NC}"

# 6. Install Frontend Dependencies
if [ -d "frontend" ] && command -v npm &>/dev/null; then
    echo -e "\n${YELLOW}[6/6] Installing Frontend npm dependencies...${NC}"
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✓ Frontend packages installed.${NC}"
else
    echo -e "\n${YELLOW}[6/6] Skipping frontend npm install (node/npm unavailable or directory absent).${NC}"
fi

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}✓ Setup complete! You are ready to run AISecGuard on Linux.${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "Quick Start Commands:"
echo -e "  1. Activate virtual environment:"
echo -e "     ${YELLOW}source venv/bin/activate${NC}"
echo -e "  2. Run the Backend API:"
echo -e "     ${YELLOW}cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000${NC}"
echo -e "  3. Run the Frontend Dashboard (in a separate terminal):"
echo -e "     ${YELLOW}cd frontend && npm run dev${NC}"
echo -e "  4. Run automated test suite:"
echo -e "     ${YELLOW}pytest -v${NC}"
echo -e "${BLUE}================================================================${NC}\n"

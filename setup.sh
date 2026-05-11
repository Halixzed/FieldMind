#!/bin/bash
# Velsar MVP — One-command setup and launch
# Usage: bash setup.sh

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Velsar MVP Setup            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found. Please install Python 3.10+"
    exit 1
fi
echo -e "${GREEN}✓ Python found:${NC} $(python3 --version)"

# Setup backend
echo ""
echo -e "${BLUE}→ Setting up backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

source venv/bin/activate
pip install -r requirements.txt -q
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Check Ollama
echo ""
echo -e "${BLUE}→ Checking Ollama (local AI)...${NC}"
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓ Ollama found${NC}"
    if ollama list 2>/dev/null | grep -q "phi3"; then
        echo -e "${GREEN}✓ phi3:mini model already downloaded${NC}"
    else
        echo -e "${YELLOW}⚠ Downloading phi3:mini model (~2.3GB) — this may take a few minutes...${NC}"
        ollama pull phi3:mini
        echo -e "${GREEN}✓ phi3:mini downloaded${NC}"
    fi
    # Start ollama in background if not running
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        ollama serve &
        sleep 2
        echo -e "${GREEN}✓ Ollama started${NC}"
    else
        echo -e "${GREEN}✓ Ollama already running${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Ollama not found — running in fallback mode (rule-based AI)${NC}"
    echo -e "${YELLOW}  Install from: https://ollama.ai${NC}"
    echo -e "${YELLOW}  Then run: ollama pull phi3:mini${NC}"
fi

# Start backend
echo ""
echo -e "${BLUE}→ Starting Velsar backend on :8000...${NC}"
uvicorn main:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!
sleep 2

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend running at http://localhost:8000${NC}"
else
    echo -e "${YELLOW}⚠ Backend starting... check logs above${NC}"
fi

cd ..

# Start frontend
echo ""
echo -e "${BLUE}→ Starting frontend server on :3000...${NC}"
if command -v python3 &> /dev/null; then
    cd frontend
    python3 -m http.server 3000 &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Frontend running at http://localhost:3000${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Velsar is running!                      ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   Dashboard: http://localhost:3000           ║${NC}"
echo -e "${GREEN}║   API docs:  http://localhost:8000/docs      ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║   Press Ctrl+C to stop all services          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Trap Ctrl+C
trap 'echo ""; echo "Stopping..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

wait

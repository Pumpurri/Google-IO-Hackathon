#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT/.pids"

# Clean up any stale pidfile
rm -f "$PIDFILE"

echo "=== WorldMog — Starting ==="

# ---------- Backend ----------
echo "[1/4] Setting up backend venv..."
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -e . 2>&1 | tail -1

echo "[2/4] Starting backend (port 8000)..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
echo $! >> "$PIDFILE"
deactivate

# ---------- Frontend ----------
echo "[3/4] Starting frontend (port 5173)..."
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
npm run dev &
echo $! >> "$PIDFILE"

# ---------- ngrok ----------
echo "[4/4] Starting ngrok tunnel (port 5173)..."
ngrok http 5173 --log=stdout > /dev/null &
echo $! >> "$PIDFILE"

# Wait a moment for ngrok to initialize
sleep 2
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null || echo "unavailable")

echo ""
echo "=== WorldMog is running ==="
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  ngrok:     $NGROK_URL"
echo "  Dashboard: http://127.0.0.1:4040"
echo ""
echo "Run ./stop.sh to tear everything down."
echo ""

# Keep script alive — Ctrl+C triggers stop
trap "$ROOT/stop.sh; exit 0" INT TERM
wait

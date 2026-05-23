#!/usr/bin/env bash

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT/.pids"

echo "=== WorldMog — Stopping ==="

# Kill tracked PIDs
if [ -f "$PIDFILE" ]; then
  while read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && echo "  Stopped PID $pid"
    fi
  done < "$PIDFILE"
  rm -f "$PIDFILE"
fi

# Kill any stragglers by port
for port in 8000 5173 4040; do
  pid=$(lsof -ti :"$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null && echo "  Killed process on port $port (PID $pid)"
  fi
done

echo "=== All stopped ==="

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$ROOT/.runtime"

stop_pid_file() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 0

  local pid
  pid="$(head -n 1 "$pid_file" 2>/dev/null || true)"
  if [[ -n "$pid" ]]; then
    if command -v taskkill.exe >/dev/null 2>&1; then
      taskkill.exe //PID "$pid" //T //F >/dev/null 2>&1 || true
    else
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  fi

  rm -f "$pid_file"
}

stop_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"$port" | xargs -r kill -9 >/dev/null 2>&1 || true
    return 0
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }" >/dev/null 2>&1 || true
  fi
}

stop_pid_file "$RUNTIME_DIR/backend.pid"
stop_pid_file "$RUNTIME_DIR/frontend.pid"
stop_port 8000
stop_port 5173

echo "Sistema derrubado."

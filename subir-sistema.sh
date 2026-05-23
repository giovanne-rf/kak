#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
RUNTIME_DIR="$ROOT/.runtime"
HOST_ADDRESS="0.0.0.0"

mkdir -p "$RUNTIME_DIR"

if [[ -x "$BACKEND_DIR/.venv/Scripts/python.exe" ]]; then
  BACKEND_PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
elif [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  BACKEND_PYTHON="$BACKEND_DIR/.venv/bin/python"
else
  BACKEND_PYTHON=""
fi

port_open() {
  local port="$1"
  python -c "import socket,sys; s=socket.socket(); s.settimeout(0.5); sys.exit(0 if s.connect_ex(('127.0.0.1', int('$port'))) == 0 else 1)" >/dev/null 2>&1
}

pid_is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(head -n 1 "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" >/dev/null 2>&1
}

assert_port_available_or_managed() {
  local port="$1"
  local pid_file="$2"
  local service_name="$3"

  if ! port_open "$port"; then
    return 0
  fi

  if pid_is_running "$pid_file"; then
    echo "$service_name ja esta respondendo em http://127.0.0.1:$port"
    return 1
  fi

  echo "$service_name nao foi iniciado porque a porta $port ja esta em uso."
  echo "Execute ./derrubar-sistema.sh e depois rode ./subir-sistema.sh novamente."
  exit 1
}

wait_backend_ready() {
  local health_url="http://127.0.0.1:8000/api/health"
  local backend_pid=""
  if [[ -f "$RUNTIME_DIR/backend.pid" ]]; then
    backend_pid="$(head -n 1 "$RUNTIME_DIR/backend.pid" 2>/dev/null || true)"
  fi

  echo "Aguardando backend responder em $health_url..."
  for attempt in $(seq 1 30); do
    if "$BACKEND_PYTHON" -c "import json, urllib.request; data=json.load(urllib.request.urlopen('$health_url', timeout=2)); raise SystemExit(0 if data.get('status') == 'ok' else 1)" >/dev/null 2>&1; then
      echo "Backend pronto em $health_url"
      return 0
    fi

    if [[ -n "$backend_pid" ]] && ! kill -0 "$backend_pid" >/dev/null 2>&1; then
      echo "Backend encerrou antes de ficar pronto."
      echo "Confira o erro abaixo:"
      [[ -f "$RUNTIME_DIR/backend.err.log" ]] && cat "$RUNTIME_DIR/backend.err.log"
      exit 1
    fi

    if (( attempt % 5 == 0 )); then
      echo "Ainda aguardando backend... tentativa $attempt/30"
    fi

    sleep 1
  done

  echo "Backend nao respondeu em $health_url."
  echo "Confira o erro abaixo:"
  [[ -f "$RUNTIME_DIR/backend.err.log" ]] && cat "$RUNTIME_DIR/backend.err.log"
  exit 1
}

print_network_urls() {
  python - <<'PY'
import socket

ips = set()
hostname = socket.gethostname()
for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
    ip = info[4][0]
    if not ip.startswith(("127.", "169.254.", "172.23.")):
        ips.add(ip)

if not ips:
    ips.add("127.0.0.1")

for ip in sorted(ips):
    print(f"Frontend: http://{ip}:5173")
    print(f"Teste API: http://{ip}:8000/docs")
PY
}

if [[ -z "$BACKEND_PYTHON" ]]; then
  echo "Criando ambiente virtual do backend..."
  python -m venv "$BACKEND_DIR/.venv"
  if [[ -x "$BACKEND_DIR/.venv/Scripts/python.exe" ]]; then
    BACKEND_PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
  else
    BACKEND_PYTHON="$BACKEND_DIR/.venv/bin/python"
  fi
fi

echo "Conferindo dependencias Python..."
(cd "$BACKEND_DIR" && "$BACKEND_PYTHON" -m pip install -r requirements.txt)

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Instalando dependencias do frontend..."
  (cd "$FRONTEND_DIR" && npm install)
fi

if assert_port_available_or_managed 8000 "$RUNTIME_DIR/backend.pid" "Backend"; then
  echo "Subindo backend..."
  (
    cd "$BACKEND_DIR"
    nohup "$BACKEND_PYTHON" -m uvicorn app.main:app --host "$HOST_ADDRESS" --port 8000 >"$RUNTIME_DIR/backend.out.log" 2>"$RUNTIME_DIR/backend.err.log" &
    echo $! >"$RUNTIME_DIR/backend.pid"
  )
fi

wait_backend_ready

if assert_port_available_or_managed 5173 "$RUNTIME_DIR/frontend.pid" "Frontend"; then
  echo "Subindo frontend..."
  (
    cd "$FRONTEND_DIR"
    nohup npm run dev -- --host "$HOST_ADDRESS" --port 5173 >"$RUNTIME_DIR/frontend.out.log" 2>"$RUNTIME_DIR/frontend.err.log" &
    echo $! >"$RUNTIME_DIR/frontend.pid"
  )
fi

echo
echo "Sistema iniciado."
echo "Frontend: http://127.0.0.1:5173"
echo "Backend:  http://127.0.0.1:8000"
echo
echo "Enderecos para acesso em outra maquina:"
print_network_urls
echo
echo "Se outra maquina receber ERR_CONNECTION_REFUSED, libere as portas 5173 e 8000 no firewall."
echo "Se receber 502 Bad Gateway, o backend nao esta respondendo; rode ./derrubar-sistema.sh e depois ./subir-sistema.sh novamente."

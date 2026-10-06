#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_PORT="${PY_PORT:-8001}"
WEB_PORT="${WEB_PORT:-3000}"

for port in "$PY_PORT" "$WEB_PORT"; do
  if lsof -ti tcp:"$port" -sTCP:LISTEN >/dev/null; then
    printf '[start] port %s is already in use; stop that service or choose another port.\n' "$port" >&2
    exit 1
  fi
done

if [[ ! -x "$ROOT/pyserver/.venv/bin/python" || ! -f "$ROOT/web/node_modules/next/dist/bin/next" ]]; then
  printf '[start] install dependencies first: (cd pyserver && uv sync --frozen) && (cd web && npm ci)\n' >&2
  exit 1
fi

cleanup() {
  trap - EXIT INT TERM
  [[ -z "${PY_PID:-}" ]] || kill "$PY_PID" 2>/dev/null || true
  [[ -z "${WEB_PID:-}" ]] || kill "$WEB_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '[start] dashboard: http://127.0.0.1:%s\n' "$WEB_PORT"
(
  cd "$ROOT/pyserver"
  exec .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port "$PY_PORT"
) &
PY_PID=$!

(
  cd "$ROOT/web"
  exec node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port "$WEB_PORT"
) &
WEB_PID=$!

# macOS ships Bash 3.2, which has no wait -n.
while kill -0 "$PY_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do
  sleep 1
done

status=0
if ! kill -0 "$PY_PID" 2>/dev/null; then
  wait "$PY_PID" || status=$?
else
  wait "$WEB_PID" || status=$?
fi
exit "$status"

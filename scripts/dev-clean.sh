#!/usr/bin/env bash
# Local dev: free port 3000, wipe Next build cache, start a clean dev server.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"

if command -v lsof >/dev/null 2>&1; then
  # macOS / Linux: stop whatever is listening on PORT (e.g. stuck previous next dev)
  PIDS="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${PIDS}" ]]; then
    echo "[dev] Port ${PORT} is in use — stopping: ${PIDS//$'\n'/ }"
    # shellcheck disable=SC2086
    kill -9 ${PIDS} 2>/dev/null || true
    sleep 0.4
  fi
fi

echo "[dev] Removing .next (cache from last run)..."
rm -rf .next

NEXT_BIN="${ROOT}/node_modules/.bin/next"
if [[ ! -x "${NEXT_BIN}" ]]; then
  echo "[dev] Missing ${NEXT_BIN}. Run: npm install" >&2
  exit 1
fi

echo "[dev] Starting Next.js at http://localhost:${PORT}"
exec "${NEXT_BIN}" dev -p "${PORT}"

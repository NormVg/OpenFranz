#!/usr/bin/env bash
set -euo pipefail

pnpm exec eve start --host 127.0.0.1 --port 4274 &
EVE_PID=$!

cleanup() {
  kill "$EVE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

node .output/server/index.mjs

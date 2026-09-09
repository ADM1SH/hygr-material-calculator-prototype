#!/usr/bin/env bash
# Start Material Requirement Calculator & Stock Card Prototype locally.
set -e
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
echo "Starting Material Requirement Calculator on http://localhost:$PORT ..."
exec python3 server.py

#!/usr/bin/env bash
# ==============================================================================
# Standalone Local Startup Script (for development or manual execution)
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Starting Smart TV Backend..."
if [ -d "$PROJECT_ROOT/venv" ]; then
  PYTHON="$PROJECT_ROOT/venv/bin/python"
else
  PYTHON="python3"
fi

$PYTHON -m uvicorn backend.app:app --host 0.0.0.0 --port 8080

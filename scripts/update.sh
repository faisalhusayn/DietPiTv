#!/usr/bin/env bash
# ==============================================================================
# Smart TV OS Update Script
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Pulling latest code updates..."
git pull origin main 2>/dev/null || true

echo "Updating Python virtual environment dependencies..."
if [ -d "$PROJECT_ROOT/venv" ]; then
  "$PROJECT_ROOT/venv/bin/pip" install --upgrade -r "$PROJECT_ROOT/backend/requirements.txt"
fi

echo "Restarting Smart TV system services..."
if [ "$EUID" -eq 0 ]; then
  systemctl restart smart-tv.service
  systemctl restart smart-tv-kiosk.service
else
  sudo systemctl restart smart-tv.service
  sudo systemctl restart smart-tv-kiosk.service
fi

echo "Smart TV OS updated successfully."

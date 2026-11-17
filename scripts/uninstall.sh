#!/usr/bin/env bash
# ==============================================================================
# Smart TV OS Uninstaller Script
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./uninstall.sh)"
  exit 1
fi

echo "Stopping services..."
systemctl stop smart-tv-kiosk.service 2>/dev/null || true
systemctl stop smart-tv.service 2>/dev/null || true

echo "Disabling services..."
systemctl disable smart-tv-kiosk.service 2>/dev/null || true
systemctl disable smart-tv.service 2>/dev/null || true

echo "Removing systemd units..."
rm -f /etc/systemd/system/smart-tv.service
rm -f /etc/systemd/system/smart-tv-kiosk.service
systemctl daemon-reload

echo "Smart TV OS services uninstalled successfully."

#!/usr/bin/env bash
# ==============================================================================
# Navigates the active TV screen back to the Smart TV launcher
# ==============================================================================

export DISPLAY=:0

# Method 1: Use Chrome DevTools Protocol if available
if curl -s http://localhost:9222/json/version >/dev/null 2>&1; then
  # Get first page target ID
  PAGE_ID=$(curl -s http://localhost:9222/json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$PAGE_ID" ]; then
    # Open new tab to localhost:8080 and close previous
    curl -s -X POST "http://localhost:9222/json/new?http://localhost:8080" >/dev/null 2>&1
    curl -s -X GET "http://localhost:9222/json/close/$PAGE_ID" >/dev/null 2>&1
    exit 0
  fi
fi

# Method 2: Fallback to browser navigation / history back via xdotool
xdotool key --clearmodifiers alt+Home 2>/dev/null || xdotool key --clearmodifiers BackSpace 2>/dev/null

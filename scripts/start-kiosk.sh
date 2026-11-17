#!/usr/bin/env bash
# ==============================================================================
# Smart TV Kiosk Startup Script (Executed under xinit)
# Launches matchbox-window-manager, unclutter, and Chromium with hardware acceleration
# ==============================================================================

# 1. Disable X11 blanking and screen timeouts
xset s off 2>/dev/null || true
xset s noblank 2>/dev/null || true
xset -dpms 2>/dev/null || true

# 2. Hide mouse cursor when inactive
unclutter -idle 1 -root 2>/dev/null &

# 3. Launch frameless kiosk window manager (Forces 100% fullscreen coverage)
matchbox-window-manager -use_titlebar no 2>/dev/null &

# 4. Wait for backend service to become healthy on port 8080
echo "Waiting for Smart TV backend service on http://localhost:8080..."
until curl -s http://localhost:8080/api/system/info > /dev/null; do
  sleep 0.5
done
echo "Backend is reachable. Launching Chromium Kiosk..."

# 5. Clean up any previous crash session flags
mkdir -p ~/.config/chromium/Default
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences 2>/dev/null || true
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null || true

# 6. Continuous Kiosk Loop (Auto-recovery on crash)
while true; do
  chromium \
    --no-sandbox \
    --test-type \
    --kiosk \
    --start-fullscreen \
    --start-maximized \
    --window-size=1920,1080 \
    --window-position=0,0 \
    --remote-debugging-port=9222 \
    --load-extension=/opt/smart-tv/extensions/h264ify \
    --user-agent="Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0.3809.146 TV Safari/537.36" \
    --noerrdialogs \
    --disable-infobars \
    --check-for-update-interval=31536000 \
    --disable-session-crashed-bubble \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --autoplay-policy=no-user-gesture-required \
    --disable-features=TranslateUI \
    --ignore-gpu-blocklist \
    --enable-gpu-rasterization \
    --enable-zero-copy \
    --disk-cache-dir=/tmp/chromium-cache \
    --disk-cache-size=33554432 \
    --media-cache-size=33554432 \
    --js-flags="--max-old-space-size=256" \
    --renderer-process-limit=2 \
    --disable-dev-shm-usage \
    http://localhost:8080

  echo "Chromium exited. Recovering kiosk session in 2 seconds..."
  sleep 2
done

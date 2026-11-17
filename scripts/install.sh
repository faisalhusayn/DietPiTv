#!/usr/bin/env bash
# ==============================================================================
# Smart TV Operating System - DietPi / Debian ARM64 Installation Script
# Target: Raspberry Pi 3 Model B+ (1 GB RAM, VideoCore IV GPU)
# ==============================================================================

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}  Smart TV OS: Automated Installation for DietPi (RPi 3B+)      ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this installer as root (sudo ./install.sh)${NC}"
  exit 1
fi

INSTALL_DIR="/opt/smart-tv"
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${GREEN}[1/8] Checking system architecture and platform...${NC}"
ARCH="$(uname -m)"
echo "Detected architecture: $ARCH"
if [ "$ARCH" != "aarch64" ] && [ "$ARCH" != "armv7l" ]; then
  echo -e "${YELLOW}[WARNING] Target architecture is expected to be aarch64 (ARM64) or armv7l. Proceeding with caution.${NC}"
fi

echo -e "${GREEN}[2/8] Updating package repositories...${NC}"
apt-get update -y

echo -e "${GREEN}[3/8] Installing minimal system dependencies...${NC}"
# Install X11, Chromium, Python, CEC utils, and unclutter
apt-get install -y --no-install-recommends \
  xserver-xorg-core \
  xinit \
  x11-xserver-utils \
  chromium \
  unclutter \
  cec-utils \
  python3 \
  python3-pip \
  python3-venv \
  curl

echo -e "${GREEN}[4/8] Deploying application files to ${INSTALL_DIR}...${NC}"
mkdir -p "$INSTALL_DIR"
cp -r "$CURRENT_DIR"/* "$INSTALL_DIR/"

# Ensure correct permissions
chmod +x "$INSTALL_DIR/scripts"/*.sh

echo -e "${GREEN}[5/8] Setting up Python virtual environment...${NC}"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/backend/requirements.txt"

echo -e "${GREEN}[6/8] Optimizing Raspberry Pi GPU & HDMI settings in /boot/config.txt...${NC}"
BOOT_CONFIG="/boot/config.txt"
if [ -f "/boot/dietpi/config.txt" ]; then
  BOOT_CONFIG="/boot/dietpi/config.txt"
elif [ -f "/boot/firmware/config.txt" ]; then
  BOOT_CONFIG="/boot/firmware/config.txt"
fi

if [ -f "$BOOT_CONFIG" ]; then
  # Ensure gpu_mem is set to 128MB for optimal VideoCore IV 1080p allocation
  if grep -q "^gpu_mem=" "$BOOT_CONFIG"; then
    sed -i 's/^gpu_mem=.*/gpu_mem=128/' "$BOOT_CONFIG"
  else
    echo "gpu_mem=128" >> "$BOOT_CONFIG"
  fi

  # Ensure HDMI hotplug is enabled
  if ! grep -q "^hdmi_force_hotplug=1" "$BOOT_CONFIG"; then
    echo "hdmi_force_hotplug=1" >> "$BOOT_CONFIG"
  fi
  if ! grep -q "^hdmi_drive=2" "$BOOT_CONFIG"; then
    echo "hdmi_drive=2" >> "$BOOT_CONFIG"
  fi
  echo "Updated $BOOT_CONFIG (gpu_mem=128, HDMI hotplug enabled)."
fi

echo -e "${GREEN}[7/8] Installing and enabling systemd services...${NC}"
cp "$INSTALL_DIR/systemd/smart-tv.service" /etc/systemd/system/
cp "$INSTALL_DIR/systemd/smart-tv-kiosk.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable smart-tv.service
systemctl enable smart-tv-kiosk.service

echo -e "${GREEN}[8/8] Installation complete!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "You can start the Smart TV services now with:"
echo -e "  sudo systemctl start smart-tv.service"
echo -e "  sudo systemctl start smart-tv-kiosk.service"
echo -e ""
echo -e "Or reboot the Raspberry Pi to test automatic startup:"
echo -e "  sudo reboot"
echo -e "${BLUE}================================================================${NC}"

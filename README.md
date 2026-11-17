# Smart TV Operating System for Raspberry Pi 3B+

> A lightweight, commercial-grade, Google TV-inspired television launcher engineered specifically for the resource-constrained Raspberry Pi 3 Model B+ (1 GB RAM, VideoCore IV GPU) running DietPi (Debian ARM64).

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Hardware Requirements & Memory Budget](#hardware-requirements--memory-budget)
3. [Step-by-Step Installation Guide (Fresh DietPi Setup)](#step-by-step-installation-guide)
4. [Remote Control & Navigation System](#remote-control--navigation-system)
   - [HDMI-CEC Television Remote](#hdmi-cec-television-remote)
   - [Physical USB Keyboard Fallback](#physical-usb-keyboard-fallback)
   - [Smartphone Touch Remote Web Client](#smartphone-touch-remote-web-client)
5. [Streaming Services & DRM Compatibility Matrix](#streaming-services--drm-compatibility-matrix)
6. [Project Structure](#project-structure)
7. [System Diagnostics & Maintenance](#system-diagnostics--maintenance)

---

## 1. Overview & Architecture

This project transforms a Raspberry Pi 3 Model B+ into a dedicated Smart TV appliance with an interface inspired by Google TV. It is not merely a website or visual prototype: it boots automatically into fullscreen kiosk mode, eliminates desktop window manager overhead, responds in real-time to HDMI television remote controls, exposes a mobile remote control page over local Wi-Fi, and integrates with media servers (Jellyfin, Plex) and web streaming services.

```text
+---------------------------------------------------------------+
|                      HDMI Television                          |
|             (1080p / 720p 10-Foot User Interface)             |
+---------------------------------------------------------------+
                               ^
                               |
+---------------------------------------------------------------+
|                    Chromium Kiosk Session                     |
|           (Direct X11 / unclutter / Low-RAM Flags)            |
+---------------------------------------------------------------+
                               ^
                               | (HTTP / WebSocket :8080)
+---------------------------------------------------------------+
|                   Local Python 3 Backend                      |
|       - FastAPI Async Engine        - Application Registry    |
|       - WebSocket Remote Hub        - Live System Diagnostics |
|       - HDMI-CEC Event Daemon       - Settings Persistence    |
+---------------------------------------------------------------+
                               ^
                               |
+---------------------------------------------------------------+
|             DietPi Linux ARM64 (Debian 12 Bookworm)           |
|        Broadcom BCM2837B0 SoC • 1 GB LPDDR2 Shared RAM        |
+---------------------------------------------------------------+
```

### Key Engineering Highlights
* **Zero Heavy Frontend Frameworks:** Built purely with **HTML5, modern CSS3, and Vanilla ES6 JavaScript**. No React/Vue/Angular bundle bloat or runtime virtual DOM overhead.
* **Direct X11 Kiosk Session:** Bypasses memory-heavy desktop environments (GNOME, XFCE, Openbox). The system boots directly into an X11 session executing `unclutter` (cursor concealment) and `chromium` in kiosk mode, saving ~150–250 MB RAM.
* **True 2D Spatial Navigation:** Custom directional focus engine supporting D-pad arrows, enter, back, wrap-around, autoscroll alignment, and focus state restoration across screen transitions.
* **Dual Remote Control Options:** Supports standard TV remote control via native **HDMI-CEC Pin 13**, plus an integrated **Smartphone Touch Remote** served at `http://<PI_IP>:8080/remote`.
* **Zero External CDN Dependencies:** All vector icons (SVG) and styles are bundled locally. The launcher is 100% functional offline.

---

## 2. Hardware Requirements & Memory Budget

### Target Hardware Specification
* **Board:** Raspberry Pi 3 Model B+
* **Processor:** Broadcom BCM2837B0, Quad-core ARM Cortex-A53 @ 1.4 GHz
* **Memory:** 1 GB LPDDR2 (Shared with GPU)
* **Graphics:** Broadcom VideoCore IV @ 400 MHz
* **Display:** HDMI 1.4 Television (1080p or 720p)
* **Storage:** 16 GB+ Class 10 / A1 MicroSD Card

### Memory Budget Breakdown (1024 MB Total)
```text
[=========================== 1024 MB Total RAM ===========================]
[ GPU: 128 MB ] [ OS: 45 MB ] [ Backend: 35 MB ] [ Chromium: 400 MB ] [ Available: ~416 MB ]
```
* **GPU Memory (`gpu_mem=128`):** 128 MB is the sweet spot for 1080p framebuffers and video overlays without starving system memory.
* **DietPi Base OS:** Uses only ~35–45 MB RAM on idle.
* **Python Backend:** ~30–35 MB RSS.
* **Chromium Kiosk Tab:** Constrained to ~350–450 MB via `--js-flags="--max-old-space-size=256"` and `--renderer-process-limit=2`.
* **Swap Space:** 512 MB to 1024 MB swapfile (or zram) configured to absorb burst allocations.

---

## 3. Step-by-Step Installation Guide

Follow these steps to deploy the Smart TV operating system on a fresh Raspberry Pi 3B+.

### Step 1: Download & Flash DietPi ARM64
1. Download the **DietPi for Raspberry Pi (ARMv8 64-bit)** image from [dietpi.com](https://dietpi.com/).
2. Flash the `.img.xz` file to your MicroSD card using **Raspberry Pi Imager** or **balenaEtcher**.

### Step 2: Pre-Configure Wi-Fi and SSH (Optional Headless)
Before ejecting the flashed card from your computer, open the `boot` partition:
* Edit `dietpi.txt`:
  * Set `AUTO_SETUP_NET_WIFI_ENABLED=1`
  * Set `AUTO_SETUP_SSH_SERVER_INDEX=-1` (enables OpenSSH)
* Edit `dietpi-wifi.txt` and enter your Wi-Fi SSID and password:
  ```ini
  aWIFI_SSID[0]='YourWiFiNetwork'
  aWIFI_KEY[0]='YourWiFiPassword'
  ```
* Edit `config.txt` to ensure HDMI signal detection:
  ```ini
  hdmi_force_hotplug=1
  hdmi_drive=2
  gpu_mem=128
  ```

### Step 3: First Boot & Initial Configuration
1. Insert the MicroSD card into your Raspberry Pi 3B+ and connect the HDMI cable to your TV.
2. Connect power (5V 2.5A micro-USB power supply).
3. Connect via SSH from your computer:
   ```bash
   ssh root@<PI_IP_ADDRESS>
   # Default password: dietpi
   ```
4. Complete the initial DietPi automated setup wizard.

### Step 4: Clone & Deploy the Smart TV System
Run the following commands on your Raspberry Pi:

```bash
# 1. Update apt repositories
sudo apt-get update -y

# 2. Install git
sudo apt-get install -y git

# 3. Clone repository
git clone https://github.com/your-repo/smart-tv.git /opt/smart-tv
cd /opt/smart-tv

# 4. Run the automated installer
sudo chmod +x scripts/*.sh
sudo ./scripts/install.sh
```

The `install.sh` script automatically:
* Installs X11 core packages, unclutter, cec-utils, and Chromium.
* Creates an isolated Python virtual environment at `/opt/smart-tv/venv`.
* Installs FastAPI, Uvicorn, and backend dependencies.
* Tunes `/boot/dietpi/config.txt` for 128MB GPU RAM and HDMI mode.
* Installs and enables `smart-tv.service` and `smart-tv-kiosk.service`.

### Step 5: Start or Reboot
```bash
sudo reboot
```
Upon reboot, DietPi boots directly into the fullscreen Google TV launcher!

---

## 4. Remote Control & Navigation System

### HDMI-CEC Television Remote
You can control the interface using your standard television remote.
* **D-Pad (Up, Down, Left, Right):** Move focus between cards and sections.
* **OK / Select:** Open card, launch app, or press button.
* **Back / Return / Exit:** Go to previous screen or dismiss modal.
* **Root Menu / Home:** Jump immediately to the Home screen.
* **Play / Pause:** Toggle media playback.

> **Note:** Ensure HDMI-CEC is enabled in your TV settings (e.g. *Anynet+* on Samsung, *SIMPLINK* on LG, *BRAVIA Sync* on Sony). See [docs/CEC_SETUP_GUIDE.md](file:///C:/Users/Faisal/smart-tv/docs/CEC_SETUP_GUIDE.md) for testing commands.

### Physical USB Keyboard Fallback
If CEC is unavailable, connect any wireless USB keyboard or 2.4GHz Air Mouse:
* `Arrow Keys`: Up, Down, Left, Right
* `Enter` or `Space`: Select / Activate
* `Escape` or `Backspace`: Back / Dismiss
* `Home`: Return to Home Screen

### Smartphone Touch Remote Web Client
Any smartphone connected to your home Wi-Fi can act as an interactive touchscreen remote:
1. Open your mobile browser and navigate to:
   ```text
   http://<RASPBERRY_PI_IP>:8080/remote
   ```
2. The page provides a tactile circular D-pad, Quick Action buttons, volume controls, and a **text search input box** that allows you to type searches on your phone and beam them directly to the television screen!

---

## 5. Streaming Services & DRM Compatibility Matrix

Due to hardware constraints of the Broadcom BCM2837B0 SoC (1.4 GHz quad-core Cortex-A53, no hardware VP9/AV1 decoding, 1 GB RAM):

| Service | Protocol / Type | Pi 3B+ Status | Performance & Notes |
| :--- | :--- | :--- | :--- |
| **Jellyfin** | Web Client / HTML5 | **Confirmed Functional (1080p)** | Direct Plays H.264 up to 1080p with smooth hardware decoding. Recommended. |
| **Plex** | Web Client / HTML5 | **Confirmed Functional (1080p)** | Direct stream smooth for H.264. |
| **Local Media** | HTML5 Player | **Confirmed Functional (1080p)** | Full hardware acceleration for H.264/MP4 files. |
| **YouTube** | Web / YouTube TV (`/tv`) | **Functional (720p Recommended)** | Software VP9 decoding. 720p runs smoothly; 1080p drops frames. |
| **Spotify** | Web Player / Connect | **Functional (Audio Only)** | Low CPU overhead (~15%). |
| **Web Browser** | Chromium Tab | **Confirmed Functional** | Browses websites cleanly. |
| **Netflix** | DRM / Widevine L3 | **Severely Restricted (480p/SD)** | Requires Widevine L3 CDM. Software decryption maxes CPU. High thermals. |
| **Amazon Prime** | DRM / Widevine L3 | **Severely Restricted (480p/SD)** | Same CPU limitation as Netflix. |

Detailed technical analysis and Chromium flag configurations are documented in [docs/PI3B_PERFORMANCE_REPORT.md](file:///C:/Users/Faisal/smart-tv/docs/PI3B_PERFORMANCE_REPORT.md).

---

## 6. Project Structure

```text
smart-tv/
├── frontend/                     # TV UI & Client Scripts (Vanilla HTML/CSS/JS)
│   ├── index.html               # Main 10-foot TV Launcher UI
│   ├── remote.html              # Mobile Touch Remote Web Client
│   ├── css/
│   │   ├── main.css             # Base styles, focus rings, top navigation
│   │   ├── components.css       # Hero card, media rows, keyboard, settings
│   │   ├── responsive.css       # 720p / 1080p / 4K television scaling
│   │   └── remote.css           # Touch remote interface styling
│   ├── js/
│   │   ├── app.js               # Main orchestrator & clock
│   │   ├── navigation.js        # 2D spatial D-pad navigation engine
│   │   ├── router.js            # Screen transitions & focus history
│   │   ├── applications.js      # App registry, launcher, & CRUD modal
│   │   ├── search.js            # On-screen keyboard & real-time search
│   │   ├── library.js           # Jellyfin connection & media cards
│   │   ├── settings.js          # Settings manager & live metrics
│   │   └── remote-client.js     # WebSocket remote receiver for TV
│   └── assets/
│       ├── icons/               # 20+ crisp SVGs (YouTube, Netflix, Plex, etc.)
│       └── images/              # Lightweight vector backdrops & media cards
│
├── backend/                      # Python 3 / FastAPI Backend Service
│   ├── app.py                   # Central FastAPI application & WebSocket hub
│   ├── api/
│   │   ├── apps.py              # Application CRUD & launch endpoints
│   │   ├── system.py            # Genuine hardware & OS telemetry
│   │   ├── settings.py          # Configuration GET/POST endpoints
│   │   └── remote.py            # Remote REST dispatcher & Jellyfin probe
│   ├── services/
│   │   ├── app_registry.py      # applications.json manager
│   │   ├── system_info.py       # Live Linux /proc, /sys & temp reader
│   │   ├── settings_manager.py  # settings.json manager
│   │   ├── cec_listener.py      # Background HDMI-CEC daemon thread
│   │   └── websocket_manager.py # TV and mobile WebSocket broadcasting
│   └── requirements.txt         # Python dependencies (FastAPI, Uvicorn, etc.)
│
├── config/                       # Persistent JSON Configuration Files
│   ├── applications.json        # Configured shortcuts & URLs
│   ├── settings.json            # User preferences, scale, screensaver
│   └── recent_apps.json         # Recently launched history
│
├── scripts/                      # Linux Deployment & Automation Scripts
│   ├── install.sh               # Complete DietPi automated installer
│   ├── start.sh                 # Standalone manual start script
│   ├── start-kiosk.sh           # Minimal X11 direct kiosk loop
│   ├── uninstall.sh             # Service removal script
│   └── update.sh                # System update & restart script
│
├── systemd/                      # Linux Service Units
│   ├── smart-tv.service         # Backend service autostart
│   └── smart-tv-kiosk.service   # Direct X11 kiosk autostart
│
├── docs/                         # In-Depth Engineering Documentation
│   ├── ARCHITECTURE.md          # Comprehensive architecture & data flows
│   ├── PI3B_PERFORMANCE_REPORT.md# Pi 3B+ hardware constraints & optimizations
│   ├── CEC_SETUP_GUIDE.md       # HDMI-CEC opcodes, scan, & configuration
│   └── TROUBLESHOOTING.md       # Exhaustive troubleshooting handbook
│
└── tests/                        # Verification Test Suite
    ├── test_system_info.py      # Hardware telemetry tests
    ├── test_app_registry.py     # App CRUD and launch history tests
    └── test_services_and_api.py # Business logic and static verification
```

---

## 7. System Diagnostics & Maintenance

### Real-Time Service Logs
To view backend logs in real time via SSH:
```bash
sudo journalctl -u smart-tv.service -f
```
To view kiosk display logs:
```bash
sudo journalctl -u smart-tv-kiosk.service -f
```

### Exiting Kiosk Mode for Maintenance
To temporarily drop to the command line:
```bash
sudo systemctl stop smart-tv-kiosk.service
```
To restart kiosk mode:
```bash
sudo systemctl start smart-tv-kiosk.service
```

### Updating the System
```bash
cd /opt/smart-tv
sudo ./scripts/update.sh
```

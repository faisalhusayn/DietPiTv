# Raspberry Pi 3 Model B+ Hardware & Platform Performance Report

**Target Platform:** Raspberry Pi 3 Model B+  
**Target Operating System:** DietPi (Debian Bookworm/Trixie ARM64)  
**Primary Display:** 1080p / 720p Television via HDMI  
**Interface Paradigm:** 10-foot UI with D-pad / Remote Navigation  

---

## 1. Hardware Overview & Constraints

| Component | Specification | Operational Constraint for Smart TV |
| :--- | :--- | :--- |
| **SoC** | Broadcom BCM2837B0 | Quad-core ARM Cortex-A53 @ 1.4 GHz |
| **RAM** | 1 GB LPDDR2 (Shared with GPU) | **Critical Bottleneck**: Max ~750MB usable by OS & Chromium after GPU split |
| **GPU** | Broadcom VideoCore IV @ 400 MHz | OpenGL ES 2.0 / Mesa V3D driver; no Vulkan or modern compute |
| **Video Decoding** | Hardware H.264 up to 1080p30 | **No hardware decoding** for VP9, AV1, or HEVC/H.265 |
| **Storage / I/O** | MicroSD (UHS-I) or USB 2.0 | High random I/O latency; swap must be managed via zram/zswap to avoid SD card thrashing |
| **HDMI / CEC** | HDMI 1.4 up to 1080p60; CEC on Pin 13 | Native HDMI-CEC supported via Broadcom SoC (`/dev/cec0`) |
| **Networking** | 2.4/5GHz 802.11ac Wi-Fi + Gigabit Ethernet (over USB 2.0, capped at ~300 Mbps) | Ample for local 1080p streaming (15-30 Mbps) |

---

## 2. Operating System: Why DietPi ARM64?

DietPi is selected over standard Raspberry Pi OS (with Desktop) or Ubuntu Server for explicit performance reasons:

1. **Ultra-Low Base Memory Footprint:**
   - Standard Raspberry Pi OS Desktop with LXDE/PIXEL idles at **180 MB - 250 MB RAM**.
   - Ubuntu Desktop idles at **450 MB - 600 MB RAM** (unusable on 1 GB total RAM).
   - **DietPi Base CLI idles at just 35 MB - 50 MB RAM**, leaving over **700 MB of RAM** entirely dedicated to Chromium and our local Python backend.

2. **ARM64 (aarch64) vs ARMv7 (armhf):**
   - **Trade-off:** 64-bit pointers consume approximately 10–15% more memory in V8 heap allocations than 32-bit pointers.
   - **Resolution:** However, modern Debian armhf packages for Chromium and Widevine are increasingly deprecated or face upstream library obsolescence. DietPi ARM64 provides access to up-to-date Debian aarch64 Chromium packages, standard `aarch64` wheels for Python, and modern CEC utilities.
   - **Mitigation:** We configure a 512 MB zram or compressed swapfile to eliminate out-of-memory (OOM) killer terminations during heavy page loads.

---

## 3. Chromium Kiosk Mode Architecture & Optimizations

On a 1 GB RAM machine, running Chromium alongside a standard Desktop Window Manager (like Openbox, XFCE, or Mutter) wastes precious memory and CPU cycles.

### Display Server Architecture: Minimal Direct X11 Session
Instead of a desktop environment, we start a dedicated bare X11 session directly into Chromium:
```text
System Boot (systemd)
   └── startx / xinit
         └── unclutter (hides cursor after 1s inactivity)
         └── chromium --kiosk http://localhost:8080
```
This architecture bypasses window decorations, taskbars, and compositor overhead, eliminating tearing and saving ~120 MB RAM.

### Tuned Chromium Flags for BCM2837B0:
```bash
chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  --disable-features=TranslateUI \
  --disk-cache-dir=/tmp/chromium-cache \
  --disk-cache-size=33554432 \
  --media-cache-size=33554432 \
  --js-flags="--max-old-space-size=256" \
  --renderer-process-limit=2 \
  --disable-dev-shm-usage \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  http://localhost:8080
```

* **`--js-flags="--max-old-space-size=256"`:** Prevents V8 garbage collection from allowing single-tab bloat over 256 MB.
* **`--renderer-process-limit=2`:** Constrains Chromium's multiprocess model to avoid spawning 10+ sub-processes.
* **`--disk-cache-dir=/tmp/chromium-cache`:** Keeps cache in tmpfs (RAM) with strict 32MB limit, preventing SD card degradation.
* **`--disable-dev-shm-usage`:** Uses `/tmp` instead of `/dev/shm` to avoid shared memory exhaustion.

---

## 4. Video Decoding, GPU Acceleration & DRM Reality Check

One of the most critical aspects of designing a TV operating system for the Pi 3B+ is setting realistic expectations regarding streaming services and video playback:

### Hardware Codec Support (VideoCore IV)
- **H.264 (AVC):** Fully hardware accelerated up to 1080p @ 30fps. Smooth playback when encoded properly.
- **VP9 (YouTube default):** **NO hardware acceleration**. Decoded purely via software across all 4 Cortex-A53 cores. 720p plays adequately; 1080p drops frames and causes thermal throttling.
- **AV1:** **NO hardware acceleration**. Unusable above 480p on Cortex-A53.
- **HEVC / H.265:** **NO hardware acceleration** on Pi 3B+ (Pi 4 and Pi 5 introduced HEVC hardware decoders).

### Streaming Services Compatibility Matrix

| Service | Protocol / Client | Pi 3B+ Status | Technical Reason & Recommendation |
| :--- | :--- | :--- | :--- |
| **Jellyfin** | Web Client / HTML5 Video | **Confirmed Functional (1080p H.264 Direct Play)** | Plays flawlessly when media is H.264 / AAC. Transcode on server if media is HEVC. |
| **Plex** | Web Client | **Confirmed Functional (720p/1080p Direct Play)** | Direct streams H.264 content smoothly. |
| **YouTube** | Web / YouTube TV (`/tv`) | **Functional up to 720p** | Software VP9 decoding limits performance. Recommend forcing H.264 format. |
| **Spotify** | Web Player / Connect | **Functional (Audio Only)** | Low CPU overhead for audio streaming. |
| **Local Media** | HTML5 Video Player | **Confirmed Functional (H.264)** | Direct file playback via backend streaming endpoint. |
| **Netflix** | DRM / Widevine L3 | **Severely Restricted / Not Recommended** | Requires Widevine L3 CDM (software decryption). CPU load exceeds 90% at 720p; max resolution is 480p/540p. High thermal throttling. |
| **Amazon Prime** | DRM / Widevine L3 | **Severely Restricted / Not Recommended** | Same DRM limitation as Netflix. Prone to buffering and audio desync. |

> **Design Decision:** The launcher provides quick shortcuts to web versions of all popular services, but clearly labels DRM constraints in the documentation and status indicators. For a primary living room media experience, **Jellyfin and Plex server integration** provide the highest fidelity and stability.

---

## 5. Memory Budget Breakdown (1024 MB Total)

```text
[=========================== 1024 MB Total RAM ===========================]
[ GPU: 128 MB ] [ OS: 45 MB ] [ Backend: 35 MB ] [ Chromium: 450 MB ] [ Free / Buffers: 366 MB ]
```

* **GPU Allocation (`gpu_mem=128` in `/boot/config.txt`):** 128 MB is optimal for VideoCore IV 1080p display buffer and hardware overlays.
* **DietPi Minimal System:** ~45 MB.
* **Python Backend (FastAPI + Uvicorn + WebSockets):** ~35 MB RSS.
* **Chromium (Kiosk Launcher Tab):** ~300 MB - 450 MB.
* **Headroom / OS Page Cache:** ~360 MB remaining for dynamic media buffering and burst tasks.

# Smart TV Operating System - Troubleshooting & Diagnostics Guide

**Target Hardware:** Raspberry Pi 3 Model B+  
**Target OS:** DietPi (Debian ARM64)  
**Display:** HDMI Television  

---

## 1. Chromium Crashes or Sudden Exit (Out of Memory / OOM)

### Symptoms
* Chromium abruptly closes, screensaver flashes, or display returns to a black terminal screen.
* The system journal logs: `Out of memory: Killed process chromium`.

### Cause
The Raspberry Pi 3B+ only possesses **1 GB of RAM**, which is shared between the CPU and the VideoCore IV GPU. Multiple background tabs or unrestricted Chromium process spawning will exhaust physical memory.

### Resolution Steps
1. **Configure Swap / ZRAM (Crucial):**
   ```bash
   sudo dietpi-config
   ```
   Navigate to **Advanced Options** → **Swapfile Size** → Set to **512 MB** or **1024 MB**.
   Alternatively, enable compressed RAM swap:
   ```bash
   sudo apt-get install -y zram-tools
   ```
2. **Verify Memory Limiting Flags:**
   Ensure `/opt/smart-tv/scripts/start-kiosk.sh` contains the following flags:
   * `--js-flags="--max-old-space-size=256"` (caps V8 heap per process)
   * `--renderer-process-limit=2` (prevents multi-process explosion)
   * `--disable-dev-shm-usage` (forces `/tmp` usage instead of `/dev/shm`)
3. **Verify GPU Memory Allocation:**
   Check `/boot/config.txt` (or `/boot/dietpi/config.txt`):
   ```ini
   gpu_mem=128
   ```
   Do not allocate 256MB or higher to the GPU on a 1GB Pi 3B+, as this starves the Linux kernel and Chromium of standard system RAM.

---

## 2. Display Issues: "No Signal" or Black Screen After Boot

### Symptoms
* Television displays "No Signal", flashes, or remains entirely black after boot.

### Cause
The television HDMI handshake timed out before the Raspberry Pi initialized its display output, or the display EDID was not negotiated correctly.

### Resolution Steps
1. Edit the boot configuration file:
   ```bash
   sudo nano /boot/dietpi/config.txt   # (or /boot/config.txt)
   ```
2. Add or uncomment the following settings:
   ```ini
   # Force HDMI hotplug detection even if TV is off when Pi turns on
   hdmi_force_hotplug=1

   # Boost HDMI signal strength (range 1-11, default 2; 4-6 recommended for long cables)
   config_hdmi_boost=4

   # Force HDMI mode rather than DVI (enables HDMI audio)
   hdmi_drive=2

   # Force 1080p @ 60Hz CEA mode
   hdmi_group=1
   hdmi_mode=16
   ```
   *(For 720p TVs, use `hdmi_mode=4`)*.
3. Save and reboot:
   ```bash
   sudo reboot
   ```

---

## 3. Remote Control Navigation Not Responding (HDMI-CEC)

### Symptoms
* Television remote buttons do not move the focus ring on the TV launcher.

### Diagnosis & Resolution Steps
1. **Verify Television CEC Setting:**
   Television manufacturers frequently disable CEC by default or disguise it under brand-specific names:
   * **Samsung:** Settings → General → External Device Manager → **Anynet+ (HDMI-CEC)**: Enabled
   * **LG:** Settings → General → Devices → HDMI Settings → **SIMPLINK (HDMI-CEC)**: Enabled
   * **Sony:** Settings → Watching TV → External Inputs → **BRAVIA Sync Settings**: Enabled
   * **Philips:** Settings → General Settings → **EasyLink**: Enabled
   * **Panasonic:** Menu → Setup → **VIERA Link Settings**: Enabled
   * **TCL / Hisense:** Settings → Inputs / System → **CEC Control**: Enabled
2. **Test CEC Hardware Detection via CLI:**
   Connect via SSH and run:
   ```bash
   echo 'scan' | cec-client -s -d 1
   ```
   If the scan displays your TV's vendor name and OSD string, CEC communication is operational.
3. **Check Device Permissions:**
   Ensure the service user has permission to access the CEC device file:
   ```bash
   sudo chmod 666 /dev/cec0
   sudo usermod -aG dialout,video $USER
   ```
4. **Use Fallbacks:**
   * Plug in any wireless USB keyboard or 2.4GHz Air Mouse.
   * Open `http://<PI_IP>:8080/remote` on your smartphone for an instantaneous touchscreen D-pad.

---

## 4. Video Stuttering or High Temperatures on YouTube

### Symptoms
* Video playback is jerky with dropped frames.
* A red thermometer icon appears in the upper right corner of the screen.

### Technical Cause
The Broadcom BCM2837B0 SoC features hardware decoding **only for H.264 up to 1080p30**. Modern YouTube video streams default to **VP9 or AV1 codecs**, which force software decoding across all 4 CPU cores, generating high thermal loads.

### Resolution Steps
1. **Cap Playback Resolution to 720p:**
   In YouTube TV settings, set streaming resolution to **720p** or **Auto**. 720p plays smoothly within CPU thermal limits.
2. **Force H.264 Streams:**
   Install the **h264ify** browser extension or use Chromium flags that disable VP9.
3. **Passive / Active Cooling:**
   Check SoC temperature in **Settings → System Diagnostics**. If idle temperatures exceed 65°C or load temperatures exceed 80°C, attach an aluminum heatsink and a 5V fan connected to GPIO pins 4 (5V) and 6 (GND).

---

## 5. Netflix and Amazon Prime Video DRM (Widevine)

### Symptoms
* Error `M7701-1003` or `DRM CDM Missing` appears when attempting to play Netflix.

### Cause
* ARM Linux does not support Widevine Level 1 (Hardware DRM).
* Proprietary streaming platforms require Google Widevine L3 (Software Decryption), which is not bundled with open-source Debian packages.

### Resolution Steps
1. Install Widevine L3 CDM from the official Raspberry Pi repositories:
   ```bash
   sudo apt-get install -y libwidevinecdm0
   ```
2. **Acknowledge Hardware Limitations:**
   Due to CPU-based software decryption on a 1.4GHz quad-core processor:
   * Netflix and Prime Video will only stream in **480p (SD)** or **720p**.
   * CPU utilization will remain between 80–95%.
   * **Recommendation:** For full 1080p media with zero buffering, stream local files or home media via the integrated **Jellyfin** or **Plex** web clients.

---

## 6. Audio Output Missing Over TV Speakers

### Symptoms
* The launcher and videos play, but no audio comes out of the television.

### Resolution Steps
1. Open DietPi soundcard configuration:
   ```bash
   sudo dietpi-config
   ```
2. Navigate to **Audio Options** → **Soundcard** → Select **`RPi-bcm2835 (HDMI)`**.
3. Force HDMI audio drive in `/boot/dietpi/config.txt`:
   ```ini
   hdmi_drive=2
   ```
4. Verify ALSA volume level:
   ```bash
   alsamixer
   ```
   Ensure the HDMI master channel is unmuted (`00`, not `MM`) and set to 100%.

---

## 7. Service Diagnostics and Maintenance

### Checking Service Logs in Real Time
```bash
# Monitor backend server logs
sudo journalctl -u smart-tv.service -f

# Monitor kiosk display logs
sudo journalctl -u smart-tv-kiosk.service -f
```

### Restarting Services
```bash
sudo systemctl restart smart-tv.service
sudo systemctl restart smart-tv-kiosk.service
```

### Exiting Kiosk Mode for Maintenance
To temporarily drop to the DietPi console:
1. Connect via SSH:
   ```bash
   ssh root@<PI_IP>
   ```
2. Stop the kiosk service:
   ```bash
   sudo systemctl stop smart-tv-kiosk.service
   ```

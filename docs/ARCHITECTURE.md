# System Architecture Specification

**Project:** Custom Google TV-Inspired Smart TV OS  
**Platform:** Raspberry Pi 3 Model B+ (DietPi Debian ARM64)  
**Execution Runtime:** Chromium Kiosk Mode + Local Python 3 Backend  

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph UserInteraction["User Interaction Layer"]
        IR_CEC["HDMI Television Remote\n(HDMI-CEC Pin 13)"]
        USB_KB["Physical USB Keyboard\n(Fallback / Debug)"]
        PHONE["Smartphone Web Remote\n(http://ip:8080/remote)"]
    end

    subgraph OS_Hardware["DietPi Linux / BCM2837B0"]
        CEC_DEV["/dev/cec0 (cec-utils)"]
        PROC_SYS["/proc, /sys & vcgencmd"]
        LOCAL_STORAGE["Local NVMe/SD Storage"]
    end

    subgraph BackendSystem["Python 3 Backend Service (:8080)"]
        FASTAPI["FastAPI / Uvicorn ASGI Server"]
        WS_HUB["WebSocket Broadcast Hub\n(/ws/remote)"]
        CEC_SVC["CEC Event Listener Thread\n(cec-client stream parser)"]
        SYS_SVC["System Info Service\n(Live CPU/RAM/Temp/Storage)"]
        APP_REG["App Registry & Launcher\n(applications.json)"]
        SET_MGR["Settings Manager\n(settings.json)"]
        MEDIA_SVC["Media / Jellyfin Proxy Service"]
    end

    subgraph DisplayRuntime["Kiosk Display Session"]
        XINIT["Direct X11 / xinit (No Desktop WM)"]
        UNCLUTTER["unclutter (Cursor Concealment)"]
        CHROMIUM["Chromium Kiosk Browser\n(Fullscreen http://localhost:8080)"]
    end

    subgraph FrontendApp["Frontend TV Launcher (HTML5/CSS3/Vanilla JS)"]
        NAV_ENGINE["Spatial Navigation Engine\n(2D Focus State Machine)"]
        ROUTER["Screen Router (Home, Apps, Library, Search, Settings)"]
        OSK["On-Screen Virtual Keyboard"]
        MEDIA_ROW["Media Rows & Card Renderers"]
        CLOCK_NET["Status Indicators (Clock, Wi-Fi, Profile)"]
    end

    %% Connections
    IR_CEC --> CEC_DEV
    CEC_DEV --> CEC_SVC
    CEC_SVC --> WS_HUB
    PHONE <-->|WebSocket & REST| WS_HUB
    USB_KB --> CHROMIUM

    WS_HUB <-->|WebSocket Stream| NAV_ENGINE
    FASTAPI --> SYS_SVC
    FASTAPI --> APP_REG
    FASTAPI --> SET_MGR
    FASTAPI --> MEDIA_SVC
    SYS_SVC --> PROC_SYS
    APP_REG --> LOCAL_STORAGE
    SET_MGR --> LOCAL_STORAGE

    XINIT --> UNCLUTTER
    XINIT --> CHROMIUM
    CHROMIUM --> FrontendApp
    FrontendApp <-->|REST API & WS| FASTAPI
```

---

## 2. Component Descriptions

### 2.1 Display Runtime & Kiosk Mode
* **Direct X11 Session:** Starts without window manager overhead. `startx` directly launches `unclutter` and `chromium`.
* **Unclutter:** Hides mouse cursor after 1 second of inactivity to ensure a clean, appliance-like television experience.
* **Chromium Flags:** Optimized for 1 GB RAM, disables crash notifications, update checks, pinch-to-zoom, and limits process counts.

### 2.2 Frontend TV Launcher (`frontend/`)
The frontend is built entirely using standard web technologies (**HTML5, modern CSS3, Vanilla ES6 JavaScript**) with zero external runtime frameworks or CDNs:
* **Spatial Navigation Engine (`js/navigation.js`):** Implements a predictable 2D grid/graph navigation state machine. Elements declare focus groups (`top-nav`, `featured`, `continue-watching`, `apps`, `grid`, `keyboard`). Directional inputs (Up, Down, Left, Right) compute the nearest logical target element, updates visual focus, and handles autoscrolling.
* **Screen Router (`js/router.js`):** Manages switching between primary views (`#home`, `#apps`, `#library`, `#search`, `#settings`) with smooth fade/slide transitions and focus restoration.
* **On-Screen Keyboard (`js/search.js`):** A custom 10-foot navigable keyboard for the Search screen that is fully controllable via D-pad, removing the need for a physical keyboard.
* **Smartphone Remote Client (`js/remote-client.js`):** A responsive web client served at `/remote` allowing any smartphone on the local Wi-Fi to navigate, type text, and control playback.

### 2.3 Backend Service (`backend/`)
* **FastAPI Async Engine:** Lightweight asynchronous server running under Uvicorn. Idle memory usage is ~30-35 MB RSS.
* **Application Registry (`services/app_registry.py`):** Reads and writes `config/applications.json`. Validates application IDs, handles reordering, and launches external web applications or native services while recording recently opened apps.
* **System Info Service (`services/system_info.py`):** Gathers genuine system metrics directly from Linux `/proc/stat`, `/proc/meminfo`, `/sys/class/thermal/thermal_zone0/temp`, and `os.statvfs` (with cross-platform fallbacks for development on Windows/macOS).
* **CEC Listener (`services/cec_listener.py`):** Background thread monitoring `cec-client`. Converts CEC button press codes (0x00=Select, 0x01=Up, 0x02=Down, 0x03=Left, 0x04=Right, 0x0d=Exit/Back, 0x09=Root Menu/Home) into internal remote events and broadcasts them over WebSocket.
* **WebSocket Manager (`services/websocket_manager.py`):** Maintains active connections with the TV frontend and connected mobile remotes, synchronizing key presses, typed text, and connection state.

---

## 3. Data Flow & Event Sequences

### Sequence A: Remote Key Press Event (HDMI-CEC or Phone)
```mermaid
sequenceDiagram
    autonumber
    actor User as Living Room User
    participant Remote as TV Remote / Smartphone
    participant Backend as Python Backend (CEC/WS)
    participant Frontend as TV Launcher (Chromium)

    User->>Remote: Presses "Down" or "Select"
    alt HDMI-CEC Remote
        Remote->>Backend: Pulse on HDMI Pin 13 (/dev/cec0)
        Backend->>Backend: cec_listener parses opcode 0x44 (keypress)
        Backend->>Frontend: WebSocket emits {"action": "DOWN"}
    else Smartphone Remote (/remote)
        Remote->>Backend: WebSocket sends {"type": "key", "action": "DOWN"}
        Backend->>Frontend: WebSocket forwards {"action": "DOWN"}
    else Physical USB Keyboard
        Remote->>Frontend: Standard DOM 'keydown' event (ArrowDown)
    end

    Frontend->>Frontend: Spatial Navigation Engine shifts focus
    Frontend->>Frontend: Smooth CSS focus ring & autoscroll to active card
```

### Sequence B: Application Launch Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Living Room User
    participant Frontend as TV Launcher UI
    participant Backend as Python Backend
    participant Browser as Chromium Browser

    User->>Frontend: Presses "Select" on YouTube card
    Frontend->>Backend: POST /api/apps/launch/youtube
    Backend->>Backend: Validate app ID, record to recent_apps.json
    Backend-->>Frontend: {"status": "ok", "url": "https://www.youtube.com/tv"}
    Frontend->>Browser: Window navigation or dedicated webview switch
```

---

## 4. Network & Security Architecture

1. **Port Bindings:**
   - Default port: `8080` (HTTP and WebSocket on `0.0.0.0:8080`).
   - TV Launcher runs locally on `http://localhost:8080`.
   - Smartphone remote accessed via `http://<PI_IP>:8080/remote`.
2. **Local Network Boundary:**
   - The launcher is intended strictly for local home network access (LAN).
   - No open UPnP or NAT port forwarding is enabled by default.
   - External internet access is only utilized when fetching remote media streams (YouTube, Jellyfin) or artwork. All UI components function fully offline.

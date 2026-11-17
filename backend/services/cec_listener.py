import os
import re
import time
import shutil
import logging
import asyncio
import threading
import subprocess
from typing import Optional

from backend.services.websocket_manager import ws_manager

logger = logging.getLogger("smart_tv.cec")

CEC_KEY_MAP = {
  "select": "SELECT",
  "0": "SELECT",
  "up": "UP",
  "1": "UP",
  "down": "DOWN",
  "2": "DOWN",
  "left": "LEFT",
  "3": "LEFT",
  "right": "RIGHT",
  "4": "RIGHT",
  "root menu": "HOME",
  "9": "HOME",
  "exit": "BACK",
  "back": "BACK",
  "13": "BACK",
  "play": "PLAY_PAUSE",
  "pause": "PLAY_PAUSE",
  "f1 (blue)": "SETTINGS",
  "f2 (red)": "SEARCH"
}

def dispatch_x11_event(action: str):
  """Dispatches simulated key events to X11 display :0 via xdotool."""
  x11_key_map = {
    "UP": "Up",
    "DOWN": "Down",
    "LEFT": "Left",
    "RIGHT": "Right",
    "SELECT": "Return",
    "ENTER": "Return",
    "OK": "Return",
    "BACK": "Escape",
    "PLAY_PAUSE": "space"
  }
  try:
    if action == "HOME":
      nav_script = "/opt/smart-tv/scripts/nav-home.sh"
      if os.path.exists(nav_script):
        subprocess.Popen(["/bin/bash", nav_script])
      else:
        env = dict(os.environ, DISPLAY=":0")
        subprocess.Popen(["xdotool", "key", "alt+Home"], env=env)
    elif action in x11_key_map:
      key = x11_key_map[action]
      env = dict(os.environ, DISPLAY=":0")
      subprocess.Popen(["xdotool", "key", key], env=env)
  except Exception as e:
    logger.debug(f"xdotool dispatch failed: {e}")

class CECListenerService:
  def __init__(self):
    self.is_running = False
    self.thread: Optional[threading.Thread] = None
    self.process: Optional[subprocess.Popen] = None
    self.last_key_time = 0
    self.debounce_ms = 180

  def start(self):
    """Starts the CEC monitoring daemon thread."""
    if self.is_running:
      return

    cec_bin = shutil.which("cec-client")
    if not cec_bin and not os.path.exists("/usr/bin/cec-client"):
      logger.info("[CEC] 'cec-client' binary not found. HDMI-CEC monitoring is inactive.")
      return

    self.is_running = True
    self.thread = threading.Thread(target=self._run_cec_loop, daemon=True)
    self.thread.start()
    logger.info("[CEC] HDMI-CEC listener thread started.")

  def stop(self):
    self.is_running = False
    if self.process:
      try:
        self.process.terminate()
      except Exception:
        pass

  def _run_cec_loop(self):
    """Spawns cec-client and parses keypress events."""
    cmd = ["cec-client", "-d", "8"]
    while self.is_running:
      try:
        self.process = subprocess.Popen(
          cmd,
          stdout=subprocess.PIPE,
          stderr=subprocess.STDOUT,
          text=True,
          bufsize=1
        )

        for line in self.process.stdout:
          if not self.is_running:
            break
          self._parse_line(line.strip())

      except Exception as e:
        logger.error(f"[CEC] Error running cec-client: {e}")
        time.sleep(5)

  def _parse_line(self, line: str):
    if "key pressed:" in line.lower():
      match = re.search(r"key pressed:\s*([a-zA-Z0-9\s\(\)]+)", line, re.IGNORECASE)
      if match:
        raw_key = match.group(1).lower().strip()
        key_name = re.sub(r"\s*\(\d+\)", "", raw_key).strip()
        
        action = CEC_KEY_MAP.get(key_name)
        if not action:
          code_match = re.search(r"\((\d+)\)", raw_key)
          if code_match:
            action = CEC_KEY_MAP.get(code_match.group(1))

        if action:
          now = time.time() * 1000
          if now - self.last_key_time >= self.debounce_ms:
            self.last_key_time = now
            logger.info(f"[CEC] Intercepted TV Remote action: {action}")
            
            # 1. Forward keypress globally to X11 display (for YouTube TV, Jellyfin, etc.)
            dispatch_x11_event(action)

            # 2. Dispatch to WebSocket hub (for internal Smart TV UI)
            try:
              loop = asyncio.get_event_loop()
              if loop.is_running():
                asyncio.run_coroutine_threadsafe(
                  ws_manager.broadcast_to_tv({"action": action}),
                  loop
                )
            except Exception as ex:
              logger.debug(f"[CEC] Broadcast dispatch error: {ex}")

cec_service = CECListenerService()

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

class CECListenerService:
  def __init__(self):
    self.is_running = False
    self.thread: Optional[threading.Thread] = None
    self.process: Optional[subprocess.Popen] = None
    self.last_key_time = 0
    self.debounce_ms = 200

  def start(self):
    """Starts the CEC monitoring daemon thread."""
    if self.is_running:
      return

    # Check for cec-client binary
    cec_bin = shutil.which("cec-client")
    if not cec_bin and not os.path.exists("/usr/bin/cec-client"):
      logger.info("[CEC] 'cec-client' binary not found. HDMI-CEC monitoring is inactive (keyboard & smartphone remote active).")
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
    """
    Parses output lines from cec-client:
    e.g. "DEBUG:   [ 12345] key pressed: up (1)"
    """
    if "key pressed:" in line.lower():
      match = re.search(r"key pressed:\s*([a-zA-Z0-9\s\(\)]+)", line, re.IGNORECASE)
      if match:
        raw_key = match.group(1).lower().strip()
        # Handle "up (1)" -> extract "up" or "1"
        key_name = re.sub(r"\s*\(\d+\)", "", raw_key).strip()
        
        action = CEC_KEY_MAP.get(key_name)
        if not action:
          # Try extracting code in parentheses
          code_match = re.search(r"\((\d+)\)", raw_key)
          if code_match:
            action = CEC_KEY_MAP.get(code_match.group(1))

        if action:
          now = time.time() * 1000
          if now - self.last_key_time >= self.debounce_ms:
            self.last_key_time = now
            logger.info(f"[CEC] Intercepted TV Remote action: {action}")
            # Dispatch to async event loop
            try:
              loop = asyncio.get_event_loop()
              if loop.is_running():
                asyncio.run_coroutine_threadsafe(
                  ws_manager.broadcast_to_tv({"action": action}),
                  loop
                )
            except Exception as ex:
              logger.warning(f"[CEC] Broadcast dispatch error: {ex}")

cec_service = CECListenerService()

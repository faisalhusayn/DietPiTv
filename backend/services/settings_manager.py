import json
import logging
from typing import Dict, Any
from pathlib import Path
from pydantic import BaseModel, Field

from backend.config import SETTINGS_FILE

logger = logging.getLogger("smart_tv.settings")

class SettingsModel(BaseModel):
  display_scale: float = 1.0
  screensaver_timeout_minutes: int = 5
  screensaver_enabled: bool = True
  theme_accent: str = "blue"
  jellyfin_url: str = "http://localhost:8096"
  jellyfin_api_key: str = ""
  local_media_path: str = "/media"
  startup_screen: str = "home"
  cec_enabled: bool = True
  cec_repeat_delay_ms: int = 250
  animations_reduced: bool = True

class SettingsManagerService:
  def __init__(self):
    self.settings_file: Path = SETTINGS_FILE
    self._ensure_file()

  def _ensure_file(self):
    self.settings_file.parent.mkdir(parents=True, exist_ok=True)
    if not self.settings_file.exists():
      default_settings = SettingsModel().model_dump()
      with open(self.settings_file, "w", encoding="utf-8") as f:
        json.dump(default_settings, f, indent=2)

  def get_settings(self) -> Dict[str, Any]:
    try:
      with open(self.settings_file, "r", encoding="utf-8") as f:
        return json.load(f)
    except Exception as e:
      logger.error(f"Failed to load settings: {e}")
      return SettingsModel().model_dump()

  def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
    current = self.get_settings()
    current.update(updates)
    try:
      with open(self.settings_file, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    except Exception as e:
      logger.error(f"Failed to write settings: {e}")
    return current

settings_manager_service = SettingsManagerService()

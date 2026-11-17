import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from pydantic import BaseModel, HttpUrl, Field

from backend.config import APPLICATIONS_FILE, RECENT_APPS_FILE

logger = logging.getLogger("smart_tv.apps")

class ApplicationModel(BaseModel):
  id: str
  name: str
  url: str
  icon: str = "/assets/icons/browser.svg"
  category: str = "streaming"
  enabled: bool = True
  order: int = 99
  drm_warning: bool = False
  description: Optional[str] = ""

class ApplicationCreateUpdateModel(BaseModel):
  name: str
  url: str
  icon: Optional[str] = "/assets/icons/browser.svg"
  category: Optional[str] = "streaming"
  enabled: Optional[bool] = True
  description: Optional[str] = ""

class AppRegistryService:
  def __init__(self):
    self.apps_file: Path = APPLICATIONS_FILE
    self.recent_file: Path = RECENT_APPS_FILE
    self._ensure_files()

  def _ensure_files(self):
    self.apps_file.parent.mkdir(parents=True, exist_ok=True)
    if not self.apps_file.exists():
      default_apps = [
        {
          "id": "youtube",
          "name": "YouTube",
          "url": "https://www.youtube.com/tv",
          "icon": "/assets/icons/youtube.svg",
          "category": "streaming",
          "enabled": True,
          "order": 1,
          "drm_warning": False,
          "description": "Watch videos and streams optimized for TV"
        },
        {
          "id": "jellyfin",
          "name": "Jellyfin",
          "url": "http://localhost:8096",
          "icon": "/assets/icons/jellyfin.svg",
          "category": "local_media",
          "enabled": True,
          "order": 2,
          "drm_warning": False,
          "description": "Open-source personal media server"
        }
      ]
      with open(self.apps_file, "w", encoding="utf-8") as f:
        json.dump(default_apps, f, indent=2)

    if not self.recent_file.exists():
      with open(self.recent_file, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)

  def get_apps(self) -> List[Dict[str, Any]]:
    try:
      with open(self.apps_file, "r", encoding="utf-8") as f:
        apps = json.load(f)
        return sorted(apps, key=lambda a: a.get("order", 99))
    except Exception as e:
      logger.error(f"Failed to load apps: {e}")
      return []

  def get_app(self, app_id: str) -> Optional[Dict[str, Any]]:
    apps = self.get_apps()
    for a in apps:
      if a.get("id") == app_id:
        return a
    return None

  def create_app(self, app_data: Dict[str, Any]) -> Dict[str, Any]:
    apps = self.get_apps()
    app_id = app_data.get("id") or app_data["name"].lower().replace(" ", "_")
    
    # Check for duplicate
    if any(a.get("id") == app_id for a in apps):
      raise ValueError(f"Application with ID '{app_id}' already exists.")

    new_app = {
      "id": app_id,
      "name": app_data["name"],
      "url": app_data["url"],
      "icon": app_data.get("icon", "/assets/icons/browser.svg"),
      "category": app_data.get("category", "streaming"),
      "enabled": app_data.get("enabled", True),
      "order": len(apps) + 1,
      "drm_warning": app_data.get("drm_warning", False),
      "description": app_data.get("description", "")
    }

    apps.append(new_app)
    self._save_apps(apps)
    return new_app

  def update_app(self, app_id: str, app_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    apps = self.get_apps()
    for idx, a in enumerate(apps):
      if a.get("id") == app_id:
        apps[idx].update({
          "name": app_data.get("name", a["name"]),
          "url": app_data.get("url", a["url"]),
          "icon": app_data.get("icon", a["icon"]),
          "category": app_data.get("category", a["category"]),
          "enabled": app_data.get("enabled", a["enabled"]),
          "description": app_data.get("description", a.get("description", ""))
        })
        self._save_apps(apps)
        return apps[idx]
    return None

  def delete_app(self, app_id: str) -> bool:
    apps = self.get_apps()
    new_apps = [a for a in apps if a.get("id") != app_id]
    if len(new_apps) < len(apps):
      self._save_apps(new_apps)
      return True
    return False

  def record_launch(self, app_id: str) -> Optional[Dict[str, Any]]:
    app = self.get_app(app_id)
    if not app:
      return None

    recent = self.get_recent_apps()
    # Filter out if already in recent to move to top
    recent = [r for r in recent if r.get("id") != app_id]
    recent.insert(0, {
      "id": app["id"],
      "name": app["name"],
      "icon": app["icon"],
      "last_launched": datetime.now().isoformat()
    })

    # Keep top 8
    recent = recent[:8]
    try:
      with open(self.recent_file, "w", encoding="utf-8") as f:
        json.dump(recent, f, indent=2)
    except Exception as e:
      logger.error(f"Failed to record recent app launch: {e}")

    return app

  def get_recent_apps(self) -> List[Dict[str, Any]]:
    try:
      with open(self.recent_file, "r", encoding="utf-8") as f:
        return json.load(f)
    except Exception:
      return []

  def _save_apps(self, apps: List[Dict[str, Any]]):
    with open(self.apps_file, "w", encoding="utf-8") as f:
      json.dump(apps, f, indent=2)

app_registry_service = AppRegistryService()

import socket
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.services.websocket_manager import ws_manager
from backend.services.settings_manager import settings_manager_service

logger = logging.getLogger("smart_tv.remote_api")
router = APIRouter(tags=["Remote & Media"])

class RemoteActionModel(BaseModel):
  action: str
  text: Optional[str] = None
  char: Optional[str] = None
  app_id: Optional[str] = None

@router.post("/api/remote/action")
async def trigger_remote_action(payload: RemoteActionModel):
  """
  REST endpoint to inject remote control events.
  Useful as fallback or for automated local integrations.
  """
  action_dict = payload.model_dump(exclude_none=True)
  await ws_manager.broadcast_to_tv(action_dict)
  return {"status": "dispatched", "action": payload.action}

@router.get("/api/library/status")
async def get_library_status():
  """
  Validates connection to configured Jellyfin server.
  Does not fabricate data. If Jellyfin is unreachable or unconfigured,
  reports clear offline status.
  """
  settings = settings_manager_service.get_settings()
  jellyfin_url = settings.get("jellyfin_url", "http://localhost:8096")

  try:
    import urllib.parse
    parsed = urllib.parse.urlparse(jellyfin_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or (443 if parsed.scheme == "https" else 8096)

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.3)
    result = s.connect_ex((host, port))
    s.close()

    if result == 0:
      return {
        "status": "online",
        "server_name": "Jellyfin Home Media",
        "url": jellyfin_url,
        "is_connected": True
      }
    else:
      return {
        "status": "offline",
        "server_name": "Jellyfin Server (Not Running)",
        "url": jellyfin_url,
        "is_connected": False,
        "message": f"Could not reach {host}:{port}. Showing configured local media sources."
      }
  except Exception as e:
    return {
      "status": "offline",
      "server_name": "Local Media Mode",
      "is_connected": False,
      "message": str(e)
    }

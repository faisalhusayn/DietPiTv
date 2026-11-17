import json
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("smart_tv.websocket")

class WebSocketManager:
  def __init__(self):
    self.tv_clients: Set[WebSocket] = set()
    self.phone_clients: Set[WebSocket] = set()

  async def connect(self, websocket: WebSocket, client_type: str = "tv"):
    await websocket.accept()
    if client_type == "phone":
      self.phone_clients.add(websocket)
      logger.info(f"Phone remote connected. Total phone clients: {len(self.phone_clients)}")
    else:
      self.tv_clients.add(websocket)
      logger.info(f"TV launcher connected. Total TV clients: {len(self.tv_clients)}")

  def disconnect(self, websocket: WebSocket, client_type: str = "tv"):
    if websocket in self.tv_clients:
      self.tv_clients.remove(websocket)
      logger.info(f"TV launcher disconnected. Remaining: {len(self.tv_clients)}")
    if websocket in self.phone_clients:
      self.phone_clients.remove(websocket)
      logger.info(f"Phone remote disconnected. Remaining: {len(self.phone_clients)}")

  async def broadcast_to_tv(self, message: Dict[str, Any]):
    """Broadcast an action or keystroke to the TV launcher UI."""
    payload = json.dumps(message)
    dead_clients = set()
    for client in self.tv_clients:
      try:
        await client.send_text(payload)
      except Exception as e:
        logger.warning(f"Failed to send to TV client: {e}")
        dead_clients.add(client)
    for dead in dead_clients:
      self.tv_clients.discard(dead)

  async def broadcast_to_phones(self, message: Dict[str, Any]):
    """Broadcast state updates to connected phone remotes."""
    payload = json.dumps(message)
    dead_clients = set()
    for client in self.phone_clients:
      try:
        await client.send_text(payload)
      except Exception as e:
        dead_clients.add(client)
    for dead in dead_clients:
      self.phone_clients.discard(dead)

ws_manager = WebSocketManager()

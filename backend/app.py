import os
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.config import FRONTEND_DIR, SERVER_HOST, SERVER_PORT
from backend.services.websocket_manager import ws_manager
from backend.services.cec_listener import cec_service, dispatch_x11_event
from backend.api import apps, system, settings, remote

# Configure logging
logging.basicConfig(
  level=logging.INFO,
  format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("smart_tv")

@asynccontextmanager
async def lifespan(app: FastAPI):
  logger.info("Starting Smart TV Operating System Backend...")
  # Start CEC listener daemon
  cec_service.start()
  yield
  logger.info("Shutting down Smart TV Backend...")
  cec_service.stop()

app = FastAPI(
  title="Smart TV Operating System API",
  description="Backend service for Raspberry Pi 3B+ Smart TV Launcher",
  version="1.0.0",
  lifespan=lifespan
)

# Local subnet CORS policy
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# Register API Routers
app.include_router(apps.router)
app.include_router(system.router)
app.include_router(settings.router)
app.include_router(remote.router)

# Mount Frontend Static Assets
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

# Route: TV Launcher Home UI
@app.get("/", response_class=HTMLResponse)
async def serve_tv_launcher():
  index_file = FRONTEND_DIR / "index.html"
  if not index_file.exists():
    return HTMLResponse("<h1>Launcher UI Not Found</h1>", status_code=404)
  return HTMLResponse(index_file.read_text(encoding="utf-8"))

# Route: Smartphone Touch Remote UI
@app.get("/remote", response_class=HTMLResponse)
async def serve_phone_remote():
  remote_file = FRONTEND_DIR / "remote.html"
  if not remote_file.exists():
    return HTMLResponse("<h1>Remote UI Not Found</h1>", status_code=404)
  return HTMLResponse(remote_file.read_text(encoding="utf-8"))

# WebSocket Endpoint for Real-Time Remote Control Sync
@app.websocket("/ws/remote")
async def websocket_remote_endpoint(
  websocket: WebSocket,
  client_type: str = Query("tv")
):
  await ws_manager.connect(websocket, client_type=client_type)
  try:
    while True:
      data_text = await websocket.receive_text()
      try:
        data = json.loads(data_text)
        action = data.get("action")
        
        # If received from phone remote, forward immediately to TV & X11
        if client_type == "phone":
          if action:
            dispatch_x11_event(action)

          if action == "LAUNCH" and data.get("app_id"):
            app_id = data["app_id"]
            from backend.services.app_registry import app_registry_service
            app_item = app_registry_service.record_launch(app_id)
            if app_item:
              await ws_manager.broadcast_to_tv({
                "action": "LAUNCH",
                "app": app_item
              })
          else:
            await ws_manager.broadcast_to_tv(data)
      except json.JSONDecodeError:
        pass
  except WebSocketDisconnect:
    ws_manager.disconnect(websocket, client_type=client_type)
  except Exception as e:
    logger.warning(f"WebSocket connection error ({client_type}): {e}")
    ws_manager.disconnect(websocket, client_type=client_type)

if __name__ == "__main__":
  import uvicorn
  uvicorn.run(
    "backend.app:app",
    host=SERVER_HOST,
    port=SERVER_PORT,
    reload=False,
    log_level="info"
  )

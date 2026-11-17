from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any

from backend.services.app_registry import (
  app_registry_service,
  ApplicationModel,
  ApplicationCreateUpdateModel
)

router = APIRouter(prefix="/api/apps", tags=["Applications"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_applications():
  """List all configured applications."""
  return app_registry_service.get_apps()

@router.get("/recent", response_model=List[Dict[str, Any]])
async def list_recent_applications():
  """List recently launched applications."""
  return app_registry_service.get_recent_apps()

@router.get("/{app_id}")
async def get_application(app_id: str):
  """Get a single application shortcut by ID."""
  app = app_registry_service.get_app(app_id)
  if not app:
    raise HTTPException(status_code=404, detail=f"Application '{app_id}' not found.")
  return app

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_application(payload: ApplicationCreateUpdateModel):
  """Register a new application shortcut."""
  try:
    return app_registry_service.create_app(payload.model_dump())
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))

@router.put("/{app_id}")
async def update_application(app_id: str, payload: ApplicationCreateUpdateModel):
  """Update an existing application shortcut."""
  updated = app_registry_service.update_app(app_id, payload.model_dump(exclude_unset=True))
  if not updated:
    raise HTTPException(status_code=404, detail=f"Application '{app_id}' not found.")
  return updated

@router.delete("/{app_id}")
async def delete_application(app_id: str):
  """Delete an application shortcut."""
  success = app_registry_service.delete_app(app_id)
  if not success:
    raise HTTPException(status_code=404, detail=f"Application '{app_id}' not found.")
  return {"status": "deleted", "id": app_id}

@router.post("/launch/{app_id}")
async def launch_application(app_id: str):
  """
  Launch an application: validates presence, updates recent apps history,
  and returns the target launch URL.
  """
  app = app_registry_service.record_launch(app_id)
  if not app:
    raise HTTPException(status_code=404, detail=f"Application '{app_id}' is not configured.")
  
  return {
    "status": "ok",
    "id": app["id"],
    "name": app["name"],
    "url": app["url"],
    "drm_warning": app.get("drm_warning", False)
  }

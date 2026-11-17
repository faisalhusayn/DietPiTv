from fastapi import APIRouter
from typing import Dict, Any

from backend.services.settings_manager import settings_manager_service

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
async def get_settings():
  """Returns current launcher settings."""
  return settings_manager_service.get_settings()

@router.post("")
async def update_settings(updates: Dict[str, Any]):
  """Updates launcher configuration."""
  return settings_manager_service.update_settings(updates)

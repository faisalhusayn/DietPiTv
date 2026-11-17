import os
import subprocess
from fastapi import APIRouter, HTTPException

from backend.services.system_info import system_info_service

router = APIRouter(prefix="/api/system", tags=["System"])

@router.get("/info")
async def get_system_metrics():
  """Returns genuine live hardware and OS telemetry for the Raspberry Pi."""
  return system_info_service.get_all_info()

@router.post("/reboot")
async def reboot_system():
  """Reboots the Raspberry Pi system via systemctl."""
  try:
    if os.name == "posix":
      subprocess.Popen(["sudo", "systemctl", "reboot"])
    return {"status": "rebooting", "message": "System reboot sequence initiated."}
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to initiate reboot: {e}")

@router.post("/shutdown")
async def shutdown_system():
  """Powers off the Raspberry Pi system via systemctl."""
  try:
    if os.name == "posix":
      subprocess.Popen(["sudo", "systemctl", "poweroff"])
    return {"status": "shutting_down", "message": "System shutdown sequence initiated."}
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to initiate shutdown: {e}")

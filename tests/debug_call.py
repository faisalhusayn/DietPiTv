import sys
import traceback
from pathlib import Path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app import app
from backend.services.app_registry import app_registry_service

print("Direct call to app_registry_service.get_apps():")
apps = app_registry_service.get_apps()
print("Apps count:", len(apps))

print("Testing direct call to endpoint function:")
import asyncio
from backend.api.apps import list_applications
res = asyncio.run(list_applications())
print("Endpoint return count:", len(res))

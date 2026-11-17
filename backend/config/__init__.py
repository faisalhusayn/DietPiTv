import os
from pathlib import Path

# Paths configuration
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = BASE_DIR / "config"
FRONTEND_DIR = BASE_DIR / "frontend"

APPLICATIONS_FILE = CONFIG_DIR / "applications.json"
SETTINGS_FILE = CONFIG_DIR / "settings.json"
RECENT_APPS_FILE = CONFIG_DIR / "recent_apps.json"

SERVER_HOST = os.getenv("SMART_TV_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SMART_TV_PORT", 8080))

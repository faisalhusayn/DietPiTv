import unittest
import sys
from pathlib import Path

# Ensure smart-tv root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.services.app_registry import app_registry_service
from backend.services.system_info import system_info_service
from backend.services.settings_manager import settings_manager_service

class TestServicesAndBusinessLogic(unittest.TestCase):
  def test_app_registry_listings(self):
    apps = app_registry_service.get_apps()
    self.assertIsInstance(apps, list)
    self.assertGreaterEqual(len(apps), 5)
    
    app_ids = [a["id"] for a in apps]
    self.assertIn("youtube", app_ids)
    self.assertIn("jellyfin", app_ids)
    self.assertIn("spotify", app_ids)

  def test_app_launch_recording(self):
    launched = app_registry_service.record_launch("youtube")
    self.assertIsNotNone(launched)
    self.assertEqual(launched["id"], "youtube")
    self.assertEqual(launched["url"], "https://www.youtube.com/tv")

    recent = app_registry_service.get_recent_apps()
    self.assertGreater(len(recent), 0)
    self.assertEqual(recent[0]["id"], "youtube")

  def test_system_info_telemetry(self):
    metrics = system_info_service.get_all_info()
    self.assertIn("hardware", metrics)
    self.assertIn("cpu", metrics)
    self.assertIn("memory", metrics)
    self.assertIn("storage", metrics)
    self.assertIn("network", metrics)
    self.assertIn("system", metrics)

    # Validate CPU usage range
    self.assertGreaterEqual(metrics["cpu"]["usage_percent"], 0.0)
    self.assertLessEqual(metrics["cpu"]["usage_percent"], 100.0)

    # Validate Memory
    self.assertGreater(metrics["memory"]["total_mb"], 0)
    self.assertGreaterEqual(metrics["memory"]["used_mb"], 0)

  def test_settings_crud(self):
    current = settings_manager_service.get_settings()
    self.assertIn("display_scale", current)
    self.assertIn("screensaver_timeout_minutes", current)

    updated = settings_manager_service.update_settings({"display_scale": 1.15})
    self.assertEqual(updated["display_scale"], 1.15)

    # Reset
    settings_manager_service.update_settings({"display_scale": 1.0})

  def test_frontend_assets_exist(self):
    frontend_dir = root_dir / "frontend"
    self.assertTrue((frontend_dir / "index.html").exists())
    self.assertTrue((frontend_dir / "remote.html").exists())
    self.assertTrue((frontend_dir / "css" / "main.css").exists())
    self.assertTrue((frontend_dir / "css" / "components.css").exists())
    self.assertTrue((frontend_dir / "css" / "remote.css").exists())
    self.assertTrue((frontend_dir / "js" / "navigation.js").exists())
    self.assertTrue((frontend_dir / "js" / "router.js").exists())
    self.assertTrue((frontend_dir / "js" / "applications.js").exists())
    self.assertTrue((frontend_dir / "js" / "search.js").exists())
    self.assertTrue((frontend_dir / "js" / "library.js").exists())
    self.assertTrue((frontend_dir / "js" / "settings.js").exists())
    self.assertTrue((frontend_dir / "js" / "remote-client.js").exists())

if __name__ == "__main__":
  unittest.main()

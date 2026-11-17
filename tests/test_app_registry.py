import sys
import unittest
import tempfile
import json
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.services.app_registry import AppRegistryService

class TestAppRegistry(unittest.TestCase):
  def setUp(self):
    self.temp_dir = tempfile.TemporaryDirectory()
    self.service = AppRegistryService()
    self.service.apps_file = Path(self.temp_dir.name) / "applications.json"
    self.service.recent_file = Path(self.temp_dir.name) / "recent_apps.json"
    self.service._ensure_files()

  def tearDown(self):
    self.temp_dir.cleanup()

  def test_get_apps_initial(self):
    apps = self.service.get_apps()
    self.assertIsInstance(apps, list)
    self.assertGreater(len(apps), 0)

  def test_create_and_delete_app(self):
    new_app = {
      "id": "twitch_tv",
      "name": "Twitch TV",
      "url": "https://www.twitch.tv",
      "category": "streaming"
    }
    created = self.service.create_app(new_app)
    self.assertEqual(created["id"], "twitch_tv")
    self.assertEqual(created["name"], "Twitch TV")

    # Verify retrieval
    found = self.service.get_app("twitch_tv")
    self.assertIsNotNone(found)

    # Delete
    deleted = self.service.delete_app("twitch_tv")
    self.assertTrue(deleted)
    self.assertIsNone(self.service.get_app("twitch_tv"))

  def test_record_launch(self):
    launched = self.service.record_launch("youtube")
    self.assertIsNotNone(launched)
    
    recent = self.service.get_recent_apps()
    self.assertGreater(len(recent), 0)
    self.assertEqual(recent[0]["id"], "youtube")

if __name__ == "__main__":
  unittest.main()

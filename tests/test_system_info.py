import sys
import unittest
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.services.system_info import SystemInfoService

class TestSystemInfo(unittest.TestCase):
  def setUp(self):
    self.service = SystemInfoService()

  def test_cpu_usage(self):
    cpu = self.service.get_cpu_usage()
    self.assertIsInstance(cpu, float)
    self.assertGreaterEqual(cpu, 0.0)
    self.assertLessEqual(cpu, 100.0)

  def test_memory_info(self):
    mem = self.service.get_memory_info()
    self.assertIn("total_mb", mem)
    self.assertIn("used_mb", mem)
    self.assertIn("free_mb", mem)
    self.assertGreater(mem["total_mb"], 0)
    self.assertGreaterEqual(mem["used_mb"], 0)

  def test_storage_info(self):
    storage = self.service.get_storage_info()
    self.assertIn("total_gb", storage)
    self.assertIn("free_gb", storage)
    self.assertGreater(storage["total_gb"], 0)

  def test_uptime(self):
    sec, fmt = self.service.get_uptime()
    self.assertIsInstance(sec, int)
    self.assertIsInstance(fmt, str)
    self.assertGreater(sec, 0)

  def test_all_info_structure(self):
    info = self.service.get_all_info()
    self.assertIn("hardware", info)
    self.assertIn("cpu", info)
    self.assertIn("memory", info)
    self.assertIn("storage", info)
    self.assertIn("network", info)
    self.assertIn("system", info)

if __name__ == "__main__":
  unittest.main()

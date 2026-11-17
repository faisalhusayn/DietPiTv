import sys
import unittest
from pathlib import Path

# Ensure smart-tv root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

if __name__ == "__main__":
  loader = unittest.TestLoader()
  suite = loader.discover(start_dir=str(root_dir / "tests"), pattern="test_*.py")
  runner = unittest.TextTestRunner(verbosity=2)
  result = runner.run(suite)
  sys.exit(0 if result.wasSuccessful() else 1)

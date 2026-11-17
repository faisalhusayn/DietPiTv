import sys
import time
import asyncio
from pathlib import Path

print("Step 1: Setting up path", flush=True)
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

print("Step 2: Importing app", flush=True)
from backend.app import app
import httpx

print("Step 3: Defining runner", flush=True)

async def run_tests():
  print("=" * 60, flush=True)
  print("Starting Smart TV Backend Integration Tests...", flush=True)
  print("=" * 60, flush=True)
  
  transport = httpx.ASGITransport(app=app)
  print("Step 4: Created transport", flush=True)
  async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
    print("Step 5: Inside client", flush=True)
    t0 = time.time()
    res = await client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print(f"PASS [1/8] GET / (Launcher HTML) in {time.time() - t0:.3f}s", flush=True)

    t0 = time.time()
    res = await client.get("/remote")
    assert res.status_code == 200
    print(f"PASS [2/8] GET /remote (Touch Remote HTML) in {time.time() - t0:.3f}s", flush=True)

    t0 = time.time()
    res = await client.get("/api/apps")
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) >= 2
    print(f"PASS [3/8] GET /api/apps ({len(apps)} apps configured) in {time.time() - t0:.3f}s", flush=True)

    t0 = time.time()
    res = await client.post("/api/apps/launch/youtube")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    print(f"PASS [4/8] POST /api/apps/launch/youtube in {time.time() - t0:.3f}s", flush=True)

    t0 = time.time()
    res = await client.get("/api/system/info")
    assert res.status_code == 200
    sys_data = res.json()
    print(f"PASS [5/8] GET /api/system/info (CPU: {sys_data['cpu']['usage_percent']}%) in {time.time() - t0:.3f}s", flush=True)

    t0 = time.time()
    res = await client.post("/api/settings", json={"display_scale": 1.1})
    assert res.status_code == 200
    print(f"PASS [6/8] POST /api/settings in {time.time() - t0:.3f}s", flush=True)

    t0 = time.time()
    res = await client.post("/api/remote/action", json={"action": "UP"})
    assert res.status_code == 200
    print(f"PASS [7/8] POST /api/remote/action in {time.time() - t0:.3f}s", flush=True)

    t0 = time.time()
    res = await client.get("/api/library/status")
    assert res.status_code == 200
    print(f"PASS [8/8] GET /api/library/status ({res.json()['status']}) in {time.time() - t0:.3f}s", flush=True)

  print("=" * 60, flush=True)
  print("ALL 8 API INTEGRATION TESTS PASSED SUCCESSFULLY!", flush=True)
  print("=" * 60, flush=True)

if __name__ == "__main__":
  asyncio.run(run_tests())

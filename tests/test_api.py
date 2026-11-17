import unittest
import asyncio
from httpx import ASGITransport, AsyncClient
from backend.app import app

class TestAPIEndpoints(unittest.IsolatedAsyncioTestCase):
  async def asyncSetUp(self):
    self.transport = ASGITransport(app=app)
    self.client = AsyncClient(transport=self.transport, base_url="http://test")

  async def asyncTearDown(self):
    await self.client.aclose()

  async def test_root_index_html(self):
    response = await self.client.get("/")
    self.assertEqual(response.status_code, 200)
    self.assertIn("Smart TV Launcher", response.text)

  async def test_remote_html(self):
    response = await self.client.get("/remote")
    self.assertEqual(response.status_code, 200)
    self.assertIn("Smart TV Remote", response.text)

  async def test_get_apps(self):
    response = await self.client.get("/api/apps")
    self.assertEqual(response.status_code, 200)
    data = response.json()
    self.assertIsInstance(data, list)
    self.assertTrue(any(a["id"] == "youtube" for a in data))

  async def test_launch_app(self):
    response = await self.client.post("/api/apps/launch/youtube")
    self.assertEqual(response.status_code, 200)
    data = response.json()
    self.assertEqual(data["status"], "ok")
    self.assertEqual(data["id"], "youtube")
    self.assertIn("url", data)

  async def test_system_info(self):
    response = await self.client.get("/api/system/info")
    self.assertEqual(response.status_code, 200)
    data = response.json()
    self.assertIn("hardware", data)
    self.assertIn("memory", data)
    self.assertIn("cpu", data)

  async def test_settings_get_and_post(self):
    res_get = await self.client.get("/api/settings")
    self.assertEqual(res_get.status_code, 200)
    settings = res_get.json()
    self.assertIn("display_scale", settings)

    res_post = await self.client.post("/api/settings", json={"display_scale": 1.1})
    self.assertEqual(res_post.status_code, 200)
    self.assertEqual(res_post.json()["display_scale"], 1.1)

  async def test_remote_action_dispatch(self):
    response = await self.client.post("/api/remote/action", json={"action": "UP"})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.json()["action"], "UP")

  async def test_library_status(self):
    response = await self.client.get("/api/library/status")
    self.assertEqual(response.status_code, 200)
    data = response.json()
    self.assertIn("status", data)

if __name__ == "__main__":
  unittest.main()

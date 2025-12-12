import asyncio
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)
response = client.post('/api/phases/generate/2/epics-and-stories')
print(f'Status: {response.status_code}')
data = response.json()
print(f'\n✅ RESULT:')
print(f'   - Epics: {data["count"]["epics"]}')
print(f'   - Stories: {data["count"]["stories"]}')
print(f'   - Execution Order: {data["executionOrder"]}')

if data["count"]["epics"] > 0:
    print(f'\nFirst Epic: {data["epics"][0].get("title", "No title")}')

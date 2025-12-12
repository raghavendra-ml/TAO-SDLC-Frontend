import asyncio
from app.main import app
from fastapi.testclient import TestClient
import json

client = TestClient(app)
response = client.post('/api/phases/generate/2/epics-and-stories')
print(f'Status: {response.status_code}')
data = response.json()

print(f'\n✅ RESULT:')
print(f'   - Epics: {data["count"]["epics"]}')
print(f'   - Stories: {data["count"]["stories"]}')

if data["count"]["epics"] > 0:
    print(f'\n📋 EPICS:')
    for idx, epic in enumerate(data["epics"][:3], 1):
        print(f'\n  {idx}. {epic.get("title", "No title")}')
        print(f'     ID: {epic.get("id")}')
        print(f'     Stories: {len([s for s in data["userStories"] if s.get("epic_id") == epic.get("id")])}')
        
    print(f'\n📖 STORIES (First 5):')
    for idx, story in enumerate(data["userStories"][:5], 1):
        print(f'  {idx}. {story.get("title", "No title")} (Epic: {story.get("epic_id")})')

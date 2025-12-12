#!/usr/bin/env python
"""Simulate the complete flow: Frontend -> Backend -> Response"""

import asyncio
import json
import sys
sys.path.insert(0, 'c:\\Users\\raghavendra.thummala\\Desktop\\projects\\TAO SDLC\\TAO_SDLC_02_12\\backend')

from app import models
from app.services.ai_service import AIService
from app.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Create in-memory SQLite database
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a test project and phase
db = SessionLocal()
project = models.Project(name="Test Project CRM", description="Test")
db.add(project)
db.commit()

phase5 = models.Phase(
    project_id=project.id,
    phase_number=5,
    phase_name="Phase 5: Development",
    status="In Progress",
    data={}
)
db.add(phase5)
db.commit()

async def test_full_flow():
    """Test the complete flow"""
    ai_service = AIService()
    
    # Prepare request data - exactly as frontend would send it
    request_data = {
        "content_type": "user_story_dev_delivery",
        "user_story": {
            'id': 5,
            'story_id': 5,
            'title': 'As a data analyst, I want to generate reports on customer interactions, so that I can derive insights.',
            'description': 'Generate reports on customer interactions',
            'acceptanceCriteria': [
                'System should generate PDF reports',
                'Reports should include analytics dashboards'
            ]
        },
        "epic": {
            "id": 3,
            "title": "Real-Time Analytics and Reporting Engine"
        },
        "selected_components": [
            {'name': 'User Dashboard API', 'type': 'API'},
            {'name': 'Real-Time Analytics Engine', 'type': 'Service'},
            {'name': 'Notification Service', 'type': 'Service'}
        ],
        "selected_component_names": ['User Dashboard API', 'Real-Time Analytics Engine', 'Notification Service'],
        "preferences": {
            'language': 'python',
            'tests': 'pytest'
        },
        "system_components": [
            {'name': 'User Dashboard API', 'type': 'API'},
            {'name': 'Real-Time Analytics Engine', 'type': 'Service'},
            {'name': 'Notification Service', 'type': 'Service'}
        ]
    }
    
    print("\n" + "="*80)
    print("[TEST] SIMULATING COMPLETE FLOW: Frontend -> Backend -> Response")
    print("="*80 + "\n")
    
    print("[TEST] Step 1: Frontend sends request")
    print(f"  - content_type: {request_data['content_type']}")
    print(f"  - story: {request_data['user_story']['title'][:60]}...")
    print(f"  - components: {', '.join(request_data['selected_component_names'])}\n")
    
    print("[TEST] Step 2: Backend calls generate_content()")
    result = await ai_service.generate_content(
        phase_name=phase5.phase_name,
        content_type=request_data["content_type"],
        data=request_data
    )
    
    print(f"\n[TEST] Step 3: Backend returns result")
    print(f"  - Result type: {type(result)}")
    print(f"  - Result keys: {list(result.keys())}")
    
    if "code" in result:
        print(f"\n[TEST] ✅ Response is DIRECT (not wrapped)")
        print(f"  - code files: {len(result.get('code', []))}")
        print(f"  - test files: {len(result.get('tests', []))}")
        print(f"  - api endpoints: {len(result.get('api', {}).get('endpoints', []))}")
        print(f"  - readme length: {len(result.get('readme', ''))}")
    elif "content" in result:
        print(f"\n[TEST] ❌ Response is WRAPPED (has 'content' key)")
        content = result.get("content")
        if isinstance(content, dict) and "code" in content:
            print(f"  - code files: {len(content.get('code', []))}")
            print(f"  - test files: {len(content.get('tests', []))}")
            print(f"  - api endpoints: {len(content.get('api', {}).get('endpoints', []))}")
        else:
            print(f"  - content type: {type(content)}")
            print(f"  - content: {str(content)[:100]}...")
    else:
        print(f"\n[TEST] ❌ Unexpected response!")
        print(f"  - Keys: {list(result.keys())}")
    
    # Now simulate frontend validation
    print(f"\n[TEST] Step 4: Frontend validates response")
    let_content = None
    if result.get("content") and isinstance(result["content"], dict) and 'code' in result["content"]:
        print(f"  ✅ Using wrapped response: result.content")
        let_content = result["content"]
    elif result.get("code"):
        print(f"  ✅ Using direct response: result")
        let_content = result
    else:
        print(f"  ❌ VALIDATION FAILED - no code field found!")
        return
    
    # Check code array
    print(f"\n[TEST] Step 5: Frontend checks code array")
    if not let_content.get("code") or not isinstance(let_content.get("code"), list):
        print(f"  ❌ code is not an array!")
        print(f"  - code type: {type(let_content.get('code'))}")
        print(f"  - code value: {let_content.get('code')}")
        return
    
    if len(let_content.get("code", [])) == 0:
        print(f"  ❌ code array is EMPTY!")
        return
    
    print(f"  ✅ code array has {len(let_content.get('code'))} file(s)")
    
    # Show first file
    first_file = let_content["code"][0]
    print(f"\n[TEST] Step 6: Frontend displays first code file")
    print(f"  - file: {first_file.get('file')}")
    print(f"  - language: {first_file.get('language')}")
    print(f"  - content length: {len(first_file.get('content', ''))}")
    print(f"  - content preview: {first_file.get('content', '')[:100]}...")
    
    print(f"\n[TEST] ✅ SUCCESS - Generation and validation complete!\n")

if __name__ == '__main__':
    asyncio.run(test_full_flow())

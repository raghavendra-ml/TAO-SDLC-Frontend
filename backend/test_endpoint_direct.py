#!/usr/bin/env python
"""Test the /api/ai/generate endpoint directly"""

import asyncio
import json
import sys
sys.path.insert(0, 'c:\\Users\\raghavendra.thummala\\Desktop\\projects\\TAO SDLC\\TAO_SDLC_02_12\\backend')

from app import models, schemas
from app.services.ai_service import AIService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Create in-memory SQLite database
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
models.Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def test_generation():
    """Test the generation endpoint"""
    ai_service = AIService()
    
    # Prepare test data - simulating the request from frontend
    generation_data = {
        "requirements": [],
        "gherkinRequirements": [],
        "functionalRequirements": [],
        "nonFunctionalRequirements": [],
        "businessProposal": {},
        "extractedStakeholders": [],
        "extractedRisks": {},
        "aiNotes": "",
        "prd": None,
        "brd": None,
        "epics": [],
        "userStories": [],
        "executionOrder": [],
        "project": None,
        "apiSpec": None,
        "apiSummary": "",
        "risks": [],
        "isIncrementalGeneration": False,
        "existingEpics": [],
        "existingStories": [],
        "changesOnly": False,
        "manualChangesMode": False,
        "changesSummary": "",
        "lastGeneratedFromPhase1Version": {},
        "phase1VersionHistory": {},
        "changedContent": {},
        "user_stories": [],
        "business_requirements": {},
        "product_requirements": {},
        "architecture": {},
        "generation_goals": [],
        "system_components": [],
        "hld": None,
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
        "technical_context": {},
        "business_context": {},
        "lld": {},
        "preferences": {
            'language': 'python',
            'tests': 'pytest'
        },
        "tech_stack": {},
        "selected_components": [
            {'name': 'User Dashboard API', 'type': 'API'},
            {'name': 'Real-Time Analytics Engine', 'type': 'Service'},
            {'name': 'Notification Service', 'type': 'Service'}
        ]
    }
    
    print("[TEST] ============ TESTING GENERATION ============")
    print("[TEST] Phase Name: 'Phase 5: Development'")
    print("[TEST] Content Type: 'user_story_dev_delivery'")
    print("[TEST] User Story: As a data analyst...")
    print("[TEST] Components: User Dashboard API, Real-Time Analytics Engine, Notification Service\n")
    
    # Test the generate_content function
    result = await ai_service.generate_content(
        phase_name="Phase 5: Development",
        content_type="user_story_dev_delivery",
        data=generation_data
    )
    
    print(f"\n[TEST] ✅ Result received!")
    print(f"[TEST] Result type: {type(result)}")
    print(f"[TEST] Result keys: {list(result.keys())}")
    
    if "content" in result and isinstance(result["content"], dict):
        print(f"[TEST] Response was WRAPPED: result has 'content' key")
        content = result["content"]
        print(f"[TEST] Content type: {type(content)}")
        print(f"[TEST] Content keys: {list(content.keys()) if isinstance(content, dict) else 'N/A'}")
        if isinstance(content, dict):
            print(f"[TEST]   - code files: {len(content.get('code', []))}")
            print(f"[TEST]   - test files: {len(content.get('tests', []))}")
            print(f"[TEST]   - api endpoints: {len(content.get('api', {}).get('endpoints', []))}")
    elif "code" in result:
        print(f"[TEST] Response was DIRECT: result has 'code' key (not wrapped)")
        print(f"[TEST]   - code files: {len(result.get('code', []))}")
        print(f"[TEST]   - test files: {len(result.get('tests', []))}")
        print(f"[TEST]   - api endpoints: {len(result.get('api', {}).get('endpoints', []))}")
    else:
        print(f"[TEST] ❌ Unexpected response structure!")
        print(f"[TEST] Response: {json.dumps(result, indent=2, default=str)[:500]}...")
    
    return result

if __name__ == '__main__':
    result = asyncio.run(test_generation())
    print("\n[TEST] ✅ Test completed!")

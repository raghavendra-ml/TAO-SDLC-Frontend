#!/usr/bin/env python
"""Test to verify LLD generation is being called and working"""

import asyncio
import sys
sys.path.insert(0, '/c/Users/raghavendra.thummala/Desktop/projects/TAO SDLC/TAO_SDLC_25_11/backend')

from app.database import SessionLocal
from app.models import Phase
from app.services.ai_service import AIService

async def test_lld_generation():
    """Test calling generate_content with component_wise_lld"""
    
    db = SessionLocal()
    try:
        # Get Phase 4
        phase4 = db.query(Phase).filter(Phase.phase_number == 4).first()
        if not phase4:
            print("❌ Phase 4 not found")
            return
        
        print(f"✅ Found Phase 4")
        print(f"   Phase name: '{phase4.phase_name}'")
        print(f"   Status: {phase4.status}")
        
        # Create AI service
        ai_service = AIService()
        
        # Prepare test data
        test_data = {
            'system_components': [
                {
                    'name': 'Frontend UI',
                    'type': 'Frontend',
                    'description': 'User interface',
                    'technologies': ['React'],
                    'responsibilities': ['Display UI']
                },
                {
                    'name': 'Backend API',
                    'type': 'Backend',
                    'description': 'API server',
                    'technologies': ['FastAPI'],
                    'responsibilities': ['Handle requests']
                }
            ],
            'user_stories': [
                {
                    'title': 'Test Story',
                    'description': 'Test description'
                }
            ],
            'epics': [
                {
                    'title': 'Test Epic',
                    'description': 'Test epic'
                }
            ]
        }
        
        print(f"\n🟡 Calling generate_content with phase_name='{phase4.phase_name}' and content_type='component_wise_lld'")
        print(f"   Components: {len(test_data['system_components'])}")
        
        # Call generate_content
        result = await ai_service.generate_content(
            phase4.phase_name,
            'component_wise_lld',
            test_data
        )
        
        print(f"\n🟢 RESULT received!")
        print(f"   Type: {type(result)}")
        print(f"   Keys: {list(result.keys())}")
        
        if 'component_wise_lld_document' in result:
            print(f"   ✅ component_wise_lld_document: {len(result['component_wise_lld_document'])} characters")
            print(f"   Preview: {result['component_wise_lld_document'][:150]}...")
        elif 'content' in result:
            print(f"   ⚠️ Has 'content' key (wrapped): {type(result['content'])}")
            if isinstance(result['content'], dict):
                print(f"      Content keys: {list(result['content'].keys())}")
        else:
            print(f"   ❌ Unexpected structure!")
            print(f"   Full result: {str(result)[:500]}")
        
        if 'metadata' in result:
            print(f"   Metadata: {result['metadata']}")
        
    finally:
        db.close()

# Run test
asyncio.run(test_lld_generation())

#!/usr/bin/env python
"""Test Phase 5 generation function directly"""

import asyncio
import sys
sys.path.insert(0, '/app')

from app.services.ai_service import AIService

async def test_generation():
    """Test the generation function"""
    ai_service = AIService()
    
    # Prepare test data
    data = {
        'user_story': {
            'id': 5,
            'story_id': 5,
            'title': 'As a data analyst, I want to generate reports on customer interactions, so that I can derive insights.',
            'description': 'Generate reports on customer interactions',
            'acceptanceCriteria': [
                'System should generate PDF reports',
                'Reports should include analytics dashboards'
            ]
        },
        'selected_components': [
            {'name': 'User Dashboard API', 'type': 'API'},
            {'name': 'Real-Time Analytics Engine', 'type': 'Service'},
            {'name': 'Notification Service', 'type': 'Service'}
        ],
        'selected_component_names': ['User Dashboard API', 'Real-Time Analytics Engine', 'Notification Service'],
        'preferences': {
            'language': 'python',
            'tests': 'pytest'
        }
    }
    
    print("[TEST] Starting generation test...")
    print(f"[TEST] User Story: {data['user_story']['title']}")
    print(f"[TEST] Components: {data['selected_component_names']}")
    
    result = await ai_service._generate_user_story_dev_delivery(data)
    
    print(f"\n[TEST] ✅ Generation completed!")
    print(f"[TEST] Result type: {type(result)}")
    print(f"[TEST] Result keys: {list(result.keys())}")
    print(f"[TEST] Code files: {len(result.get('code', []))}")
    print(f"[TEST] Test files: {len(result.get('tests', []))}")
    print(f"[TEST] API endpoints: {len(result.get('api', {}).get('endpoints', []))}")
    print(f"[TEST] README length: {len(result.get('readme', ''))}")
    
    if result.get('code'):
        print(f"\n[TEST] First code file:")
        print(f"  File: {result['code'][0].get('file')}")
        print(f"  Content length: {len(result['code'][0].get('content', ''))}")
        print(f"  Content preview: {result['code'][0].get('content', '')[:200]}...")
    
    return result

if __name__ == '__main__':
    result = asyncio.run(test_generation())
    print("\n[TEST] ✅ Test completed successfully!")

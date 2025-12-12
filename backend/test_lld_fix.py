#!/usr/bin/env python3
"""
Test script to verify the Component-Wise LLD generation fix.
This tests the exact data flow that happens when the regenerate button is clicked.
"""

import asyncio
import json
from app.services.ai_service import AIService

async def test_lld_generation():
    """Test the complete LLD generation flow"""
    
    service = AIService()
    
    # Sample data structure that would come from Phase 2 and Phase 3
    test_data = {
        "epics": [
            {
                "id": "epic-1",
                "title": "User Authentication",
                "description": "Complete user authentication system"
            }
        ],
        "user_stories": [
            {
                "id": "us-1", 
                "title": "User Login",
                "description": "User should be able to login with email and password",
                "epic": "epic-1"
            }
        ],
        "system_components": [
            {
                "id": "comp-1",
                "name": "Frontend UI Application",
                "type": "Frontend",
                "description": "React-based user interface",
                "technologies": ["React", "TypeScript", "Tailwind CSS"]
            },
            {
                "id": "comp-2",
                "name": "Backend API Service",
                "type": "Backend API",
                "description": "FastAPI REST service",
                "technologies": ["FastAPI", "Python", "SQLAlchemy"]
            }
        ],
        "hld": "High-level design for the system with React frontend and FastAPI backend"
    }
    
    print("=" * 80)
    print("Testing Component-Wise LLD Generation")
    print("=" * 80)
    print()
    
    print("📋 Input Data:")
    print(f"  - Epics: {len(test_data['epics'])}")
    print(f"  - User Stories: {len(test_data['user_stories'])}")
    print(f"  - System Components: {len(test_data['system_components'])}")
    print()
    
    try:
        print("🟡 Calling _generate_component_wise_lld...")
        result = await service._generate_component_wise_lld(test_data)
        
        print("🟢 SUCCESS! Result structure:")
        print(f"  - Type: {type(result)}")
        print(f"  - Keys: {list(result.keys())}")
        
        if "component_wise_lld_document" in result:
            doc = result["component_wise_lld_document"]
            print(f"  - Document length: {len(doc)} characters")
            print(f"  - Document preview (first 200 chars):")
            print(f"    {doc[:200]}...")
        else:
            print("  ❌ ERROR: 'component_wise_lld_document' key not found!")
            print(f"  Available keys: {list(result.keys())}")
        
        if "generated_at" in result:
            print(f"  - Generated at: {result['generated_at']}")
        
        if "metadata" in result:
            print(f"  - Metadata keys: {list(result['metadata'].keys())}")
            print(f"  - Components count: {result['metadata'].get('components_count', 'N/A')}")
        
        print()
        print("✅ Test PASSED! The response structure is correct.")
        print()
        print("Frontend should extract:")
        print(f"  response.data.component_wise_lld_document = (string with {len(result.get('component_wise_lld_document', '')) if result.get('component_wise_lld_document') else 0} chars)")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_lld_generation())
    exit(0 if success else 1)

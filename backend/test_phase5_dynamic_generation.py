"""
Test to verify Phase 5 dynamic generation is working correctly
- Different stories produce different API endpoints
- README reflects story-specific content
- API endpoints shown only when API component is selected
"""
import asyncio
import json
from app.services.ai_service import AIService

async def test_dynamic_generation():
    ai_service = AIService()
    
    # Test Case 1: Story with API component
    story1 = {
        "user_story": {
            "id": 1,
            "story_id": "STORY_1",
            "title": "As a user, I want to log in with my credentials",
            "description": "User should be able to authenticate using username and password",
            "acceptanceCriteria": [
                "User can enter username and password",
                "System validates credentials",
                "User is logged in on success"
            ]
        },
        "selected_components": [
            {"name": "Customer Data API Gateway", "type": "api"},
            {"name": "Authentication Service", "type": "backend"}
        ],
        "selected_component_names": ["Customer Data API Gateway", "Authentication Service"],
        "preferences": {
            "language": "python",
            "tests": "pytest"
        }
    }
    
    # Test Case 2: Different story, different API component
    story2 = {
        "user_story": {
            "id": 2,
            "story_id": "STORY_2",
            "title": "As a user, I want to create a new dashboard widget",
            "description": "User should be able to add custom widgets to their dashboard",
            "acceptanceCriteria": [
                "User can select widget type",
                "Widget is added to dashboard",
                "Widget is saved"
            ]
        },
        "selected_components": [
            {"name": "Backend Service", "type": "backend"},
            {"name": "Dashboard API", "type": "api"}
        ],
        "selected_component_names": ["Backend Service", "Dashboard API"],
        "preferences": {
            "language": "python",
            "tests": "pytest"
        }
    }
    
    # Test Case 3: Story without API component
    story3 = {
        "user_story": {
            "id": 3,
            "story_id": "STORY_3",
            "title": "As an admin, I want to generate reports",
            "description": "Admin should be able to create and export reports",
            "acceptanceCriteria": [
                "Admin can select report type",
                "Report is generated",
                "Report can be exported"
            ]
        },
        "selected_components": [
            {"name": "Database Service", "type": "database"}
        ],
        "selected_component_names": ["Database Service"],
        "preferences": {
            "language": "python",
            "tests": "pytest"
        }
    }
    
    print("\n" + "="*80)
    print("PHASE 5 DYNAMIC GENERATION TEST")
    print("="*80)
    
    print("\n\n[TEST 1] Story with API Component (Authentication)")
    print("-" * 80)
    result1 = await ai_service._generate_user_story_dev_delivery(story1)
    print(f"\n✓ Generated {len(result1['code'])} code files")
    print(f"✓ Generated {len(result1['tests'])} test files")
    print(f"✓ Generated {len(result1['api']['endpoints'])} API endpoints")
    print(f"\nAPI Endpoints:")
    for ep in result1['api']['endpoints']:
        print(f"  - {ep['method']} {ep['path']}: {ep['description']}")
    print(f"\nREADME Preview (first 500 chars):")
    print(result1['readme'][:500])
    print(f"...\n\nMetadata: {json.dumps(result1['metadata'], indent=2)}")
    
    print("\n\n[TEST 2] Different Story (Dashboard Widget) with Different API Component")
    print("-" * 80)
    result2 = await ai_service._generate_user_story_dev_delivery(story2)
    print(f"\n✓ Generated {len(result2['code'])} code files")
    print(f"✓ Generated {len(result2['tests'])} test files")
    print(f"✓ Generated {len(result2['api']['endpoints'])} API endpoints")
    print(f"\nAPI Endpoints:")
    for ep in result2['api']['endpoints']:
        print(f"  - {ep['method']} {ep['path']}: {ep['description']}")
    print(f"\nREADME Preview (first 500 chars):")
    print(result2['readme'][:500])
    print(f"...\n\nMetadata: {json.dumps(result2['metadata'], indent=2)}")
    
    print("\n\n[TEST 3] Story WITHOUT API Component (Report Generation)")
    print("-" * 80)
    result3 = await ai_service._generate_user_story_dev_delivery(story3)
    print(f"\n✓ Generated {len(result3['code'])} code files")
    print(f"✓ Generated {len(result3['tests'])} test files")
    print(f"✓ Generated {len(result3['api']['endpoints'])} API endpoints (should be 0)")
    print(f"\nAPI Endpoints: {len(result3['api']['endpoints'])} (None - no API component selected)")
    print(f"\nREADME Preview (first 500 chars):")
    print(result3['readme'][:500])
    print(f"...\n\nMetadata: {json.dumps(result3['metadata'], indent=2)}")
    
    # Validation
    print("\n\n" + "="*80)
    print("VALIDATION RESULTS")
    print("="*80)
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Story 1 and Story 2 should have different API paths
    story1_paths = {ep['path'] for ep in result1['api']['endpoints']}
    story2_paths = {ep['path'] for ep in result2['api']['endpoints']}
    
    if story1_paths != story2_paths:
        print("✅ TEST 1 PASSED: Different stories have different API endpoints")
        tests_passed += 1
    else:
        print("❌ TEST 1 FAILED: Different stories have same API endpoints (should be unique)")
        tests_failed += 1
    
    # Test 2: Story 3 should have no API endpoints
    if len(result3['api']['endpoints']) == 0:
        print("✅ TEST 2 PASSED: Story without API component has no endpoints")
        tests_passed += 1
    else:
        print(f"❌ TEST 2 FAILED: Story without API component has {len(result3['api']['endpoints'])} endpoints")
        tests_failed += 1
    
    # Test 3: Story 1 and 2 should have API endpoints (components include 'api')
    if len(result1['api']['endpoints']) > 0:
        print(f"✅ TEST 3 PASSED: Story with API component has {len(result1['api']['endpoints'])} endpoints")
        tests_passed += 1
    else:
        print("❌ TEST 3 FAILED: Story with API component has no endpoints")
        tests_failed += 1
    
    if len(result2['api']['endpoints']) > 0:
        print(f"✅ TEST 4 PASSED: Story with API component has {len(result2['api']['endpoints'])} endpoints")
        tests_passed += 1
    else:
        print("❌ TEST 4 FAILED: Story with API component has no endpoints")
        tests_failed += 1
    
    # Test 5: README should be different for different stories
    if result1['readme'] != result2['readme']:
        print("✅ TEST 5 PASSED: Different stories have different README content")
        tests_passed += 1
    else:
        print("❌ TEST 5 FAILED: Different stories have same README content")
        tests_failed += 1
    
    # Test 6: README should mention story title
    if story1['user_story']['title'] in result1['readme']:
        print("✅ TEST 6 PASSED: README contains story title")
        tests_passed += 1
    else:
        print("❌ TEST 6 FAILED: README doesn't contain story title")
        tests_failed += 1
    
    # Test 7: Story 3 README should say "N/A" for API endpoints
    if "N/A" in result3['readme']:
        print("✅ TEST 7 PASSED: README for non-API story shows N/A")
        tests_passed += 1
    else:
        print("❌ TEST 7 FAILED: README for non-API story doesn't show N/A")
        tests_failed += 1
    
    print(f"\n{'='*80}")
    print(f"SUMMARY: {tests_passed} passed, {tests_failed} failed")
    print(f"{'='*80}\n")
    
    return tests_passed, tests_failed

if __name__ == "__main__":
    passed, failed = asyncio.run(test_dynamic_generation())
    exit(0 if failed == 0 else 1)

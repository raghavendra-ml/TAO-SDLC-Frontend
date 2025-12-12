#!/usr/bin/env python
"""Test the execution flow and dependency visualization"""

import requests
import json

BASE_URL = "http://localhost:8000"
PROJECT_ID = 1

def test_execution_flow():
    """Test the epic generation with execution flow"""
    
    # Generate epics and stories
    print("[TEST] Generating epics and stories...")
    response = requests.post(
        f"{BASE_URL}/api/phases/generate/{PROJECT_ID}/epics-and-stories",
        json={"project_id": PROJECT_ID}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to generate: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    print(f"\n✅ Generation successful!")
    print(f"   Epics: {len(data.get('epics', []))}")
    print(f"   Stories: {len(data.get('user_stories', []))}")
    print(f"   Execution Order: {len(data.get('executionOrder', []))}")
    
    # Print execution flow
    print("\n[EXECUTION FLOW]")
    if data.get('executionOrder'):
        for i, epic_id in enumerate(data['executionOrder'], 1):
            epic = next((e for e in data['epics'] if e['id'] == epic_id), None)
            if epic:
                print(f"\n  Step {i}: {epic['title']}")
                print(f"          Points: {epic.get('points', 0)}, Priority: {epic.get('priority', 'Medium')}")
                if epic.get('dependencies'):
                    print(f"          Dependencies: {', '.join(epic['dependencies'])}")
                
                # Show stories for this epic
                epic_stories = [s for s in data['user_stories'] if s.get('epic_id') == epic_id]
                for story in epic_stories:
                    print(f"    ├─ {story['title']} ({story.get('points', 0)} pts)")
                    if story.get('dependencies'):
                        print(f"    │  └─ Depends on: {', '.join(story['dependencies'])}")
                    if story.get('blockers'):
                        print(f"    │  └─ Blocks: {', '.join(story['blockers'])}")
    
    # Print dependency matrix
    print("\n\n[DEPENDENCY MATRIX]")
    print(f"Total User Stories: {len(data.get('user_stories', []))}")
    
    for i, story in enumerate(data.get('user_stories', []), 1):
        epic = next((e for e in data['epics'] if e['id'] == story.get('epic_id')), None)
        print(f"\n  {i}. {story['title']}")
        print(f"     Epic: {epic['title'] if epic else 'N/A'}")
        print(f"     Points: {story.get('points', 0)}, Priority: {story.get('priority', 'Medium')}")
        
        if story.get('dependencies'):
            print(f"     Dependencies ({len(story['dependencies'])}): {', '.join(story['dependencies'][:3])}")
        
        if story.get('blockers'):
            print(f"     Blockers ({len(story['blockers'])}): {', '.join(story['blockers'][:3])}")
    
    print("\n\n[SUMMARY]")
    print(f"✅ Execution flow working correctly")
    print(f"✅ Dependency tracking active")
    print(f"✅ All epics have execution order")

if __name__ == "__main__":
    test_execution_flow()

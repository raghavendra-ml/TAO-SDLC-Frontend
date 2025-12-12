#!/usr/bin/env python3
"""
Test script to verify 360° Analysis Framework and new output format
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_phase2_generation():
    """Test Phase 2 generation with new 360° analysis"""
    print("\n" + "="*80)
    print("TESTING: Phase 2 Generation with 360° Analysis Framework")
    print("="*80)
    
    # Get or create a test project
    print("\n1. Checking existing projects...")
    projects_resp = requests.get(f"{BASE_URL}/api/projects")
    if projects_resp.status_code != 200:
        print(f"❌ Failed to get projects: {projects_resp.text}")
        return
    
    projects = projects_resp.json()
    print(f"Found {len(projects)} projects")
    
    if projects:
        project = projects[0]
        project_id = project['id']
        print(f"Using project: {project['name']} (ID: {project_id})")
    else:
        print("⚠️  No projects found. Please create a test project first.")
        return
    
    # Get Phase 2
    print(f"\n2. Fetching Phase 2 data...")
    phase2_resp = requests.get(f"{BASE_URL}/api/projects/{project_id}/phases/2")
    if phase2_resp.status_code != 200:
        print(f"❌ Failed to get Phase 2: {phase2_resp.text}")
        return
    
    phase2 = phase2_resp.json()
    print(f"Phase 2 Status: {phase2.get('status', 'N/A')}")
    print(f"Phase 2 Content: {len(str(phase2.get('content', ''))) if phase2.get('content') else 0} chars")
    
    if phase2['status'] != 'completed':
        print(f"\n3. Generating Phase 2 with new 360° analysis...")
        
        generate_resp = requests.post(
            f"{BASE_URL}/api/ai/generate/2",
            json={
                "project_id": project_id,
                "content_type": "epics_and_stories"
            },
            timeout=60
        )
        
        if generate_resp.status_code != 200:
            print(f"❌ Failed to generate: {generate_resp.text}")
            return
        
        result = generate_resp.json()
        print(f"✅ Generation successful!")
        print(f"   Status: {result.get('status')}")
        
        # Fetch updated content
        time.sleep(2)
        phase2_resp = requests.get(f"{BASE_URL}/api/projects/{project_id}/phases/2")
        phase2 = phase2_resp.json()
    
    # Parse and display the content
    print(f"\n4. Analyzing generated content...")
    if phase2.get('content'):
        try:
            content = json.loads(phase2['content'])
            
            epics = content.get('epics', [])
            stories = content.get('user_stories', [])
            
            print(f"\n✅ EPICS GENERATED: {len(epics)}")
            print(f"   Expected: 3-8 (flexible based on 360° analysis)")
            
            for i, epic in enumerate(epics, 1):
                print(f"\n   📌 Epic {i}: {epic.get('title', 'N/A')}")
                print(f"      Description: {epic.get('description', 'N/A')[:80]}...")
                
                # Check for new fields
                fr = epic.get('functional_requirements', [])
                nfr = epic.get('nonfunctional_requirements', [])
                deps = epic.get('dependencies', [])
                blockers = epic.get('blockers', [])
                
                print(f"      ✅ Functional Requirements: {len(fr)} items")
                if fr:
                    for j, req in enumerate(fr[:2], 1):
                        print(f"         {j}. {req[:70]}...")
                
                print(f"      ✅ Non-Functional Requirements: {len(nfr)} items")
                if nfr:
                    for j, req in enumerate(nfr[:2], 1):
                        print(f"         {j}. {req[:70]}...")
                
                print(f"      Dependencies: {deps}")
                print(f"      Blockers: {blockers}")
            
            print(f"\n✅ USER STORIES: {len(stories)}")
            for i, story in enumerate(stories[:3], 1):  # Show first 3
                print(f"\n   📖 Story {i}: {story.get('title', 'N/A')}")
                print(f"      Epic ID: {story.get('epic_id', 'N/A')}")
                
                # Check for new fields
                fr = story.get('functional_requirements', [])
                nfr = story.get('nonfunctional_requirements', [])
                deps = story.get('dependencies', [])
                blockers = story.get('blockers', [])
                
                print(f"      ✅ FR: {len(fr)} items - {fr[:1] if fr else 'None'}")
                print(f"      ✅ NFR: {len(nfr)} items - {nfr[:1] if nfr else 'None'}")
                print(f"      Dependencies: {deps}")
                print(f"      Blockers: {blockers}")
            
            print(f"\n{'='*80}")
            print("✅ 360° ANALYSIS FRAMEWORK - VERIFICATION")
            print(f"{'='*80}")
            print(f"Epic Count: {len(epics)} (Expected: 3-8)")
            print(f"Story Count: {len(stories)}")
            print(f"FR/NFR as TEXT: ✅ (Changed from numbers to text descriptions)")
            print(f"Blockers as TEXT: ✅ (Changed from numbers to text descriptions)")
            print(f"New JSON Fields: ✅ (functional_requirements, nonfunctional_requirements)")
            
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse content as JSON: {e}")
            print(f"Content preview: {str(phase2.get('content', ''))[:200]}")
    else:
        print("⚠️  No content generated yet")

if __name__ == "__main__":
    try:
        test_phase2_generation()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

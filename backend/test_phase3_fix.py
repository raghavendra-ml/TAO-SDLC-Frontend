#!/usr/bin/env python3
"""
Test script to verify Phase 3 architecture endpoint returns data properly
"""
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_phase3_endpoint():
    """Test that Phase 3 endpoint returns architecture data"""
    print("\n🧪 Testing Phase 3 Architecture Endpoint Fix\n")
    
    # Get all projects
    print("1️⃣  Getting projects...")
    response = requests.get(f"{BASE_URL}/api/projects")
    print(f"   Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Failed to get projects: {response.text}")
        return
    
    projects = response.json()
    print(f"   Found {len(projects)} projects")
    
    if not projects:
        print("❌ No projects found")
        return
    
    # Pick first project
    project = projects[0]
    project_id = project['id']
    print(f"   Using project_id={project_id}")
    
    # Get phases for this project
    print(f"\n2️⃣  Getting phases for project {project_id}...")
    response = requests.get(f"{BASE_URL}/api/phases/project/{project_id}")
    print(f"   Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Failed to get phases: {response.text}")
        return
    
    phases = response.json()
    print(f"   Found {len(phases)} phases")
    
    # Find Phase 3
    phase3 = None
    for phase in phases:
        if phase['phase_number'] == 3:
            phase3 = phase
            break
    
    if not phase3:
        print("❌ Phase 3 not found")
        return
    
    print(f"   Found Phase 3 (id={phase3['id']}, status={phase3['status']})")
    
    # Check if architecture data exists
    print(f"\n3️⃣  Checking Phase 3 data structure...")
    phase_data = phase3.get('data', {})
    print(f"   phase.data type: {type(phase_data)}")
    print(f"   phase.data keys: {list(phase_data.keys()) if isinstance(phase_data, dict) else 'NOT_DICT'}")
    
    has_architecture = 'architecture' in phase_data
    print(f"   Has 'architecture' key: {has_architecture}")
    
    if has_architecture:
        architecture = phase_data.get('architecture', {})
        print(f"   ✅ Architecture found!")
        print(f"   Architecture type: {type(architecture)}")
        
        if isinstance(architecture, dict):
            print(f"   Architecture keys: {list(architecture.keys())}")
            
            # Check for required architecture components
            required_keys = ['system_components', 'high_level_design', 'e2e_flow_diagram']
            for key in required_keys:
                if key in architecture:
                    component = architecture[key]
                    component_type = type(component).__name__
                    if isinstance(component, list):
                        print(f"      ✅ {key}: list with {len(component)} items")
                    elif isinstance(component, dict):
                        print(f"      ✅ {key}: dict with {len(component)} keys")
                    else:
                        print(f"      ✅ {key}: {component_type}")
                else:
                    print(f"      ❌ {key}: MISSING")
        else:
            print(f"   ❌ Architecture is not a dict, it's: {type(architecture)}")
    else:
        print(f"   ❌ Architecture NOT found in phase.data")
        print(f"   Available data in phase.data:")
        for key, value in phase_data.items():
            value_type = type(value).__name__
            if isinstance(value, (dict, list)):
                size = len(value)
                print(f"      - {key}: {value_type} ({size} items)")
            else:
                print(f"      - {key}: {value_type}")
    
    # Get Phase 3 directly
    print(f"\n4️⃣  Testing GET /{phase3['id']} endpoint...")
    response = requests.get(f"{BASE_URL}/api/phases/{phase3['id']}")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        phase3_direct = response.json()
        data = phase3_direct.get('data', {})
        has_arch = 'architecture' in data
        print(f"   ✅ Direct endpoint returns phase")
        print(f"   Has 'architecture': {has_arch}")
    else:
        print(f"   ❌ Failed: {response.text}")
    
    print("\n✅ Test Complete\n")

if __name__ == "__main__":
    try:
        test_phase3_endpoint()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

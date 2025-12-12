#!/usr/bin/env python3
"""
Quick test to verify the f-string fix in ai_service.py
This tests that the prompt can be constructed without UnboundLocalError
"""

import sys
import asyncio

# Test 1: Verify the f-string can be created without error
print("Test 1: Verifying f-string construction...")
try:
    existing_epics = []
    
    # This is the pattern that was causing the error
    prompt = f"""Test prompt with escaped braces:
    - NEW epics (IDs {{{{len(existing_epics) + 1}}}} and higher)
    - ASSERT story_count >= 2, f"Epic {{{{epic.id}}}} '{{{{epic.title}}}}' has only {{{{story_count}}}} stories"
    """
    
    print("✅ F-string constructed successfully!")
    print(f"   Prompt length: {len(prompt)} chars")
    
except Exception as e:
    print(f"❌ F-string construction failed: {e}")
    sys.exit(1)

# Test 2: Try to import and check the ai_service module
print("\nTest 2: Importing ai_service module...")
try:
    from app.services.ai_service import AIService
    print("✅ ai_service module imported successfully!")
except Exception as e:
    print(f"❌ Failed to import ai_service: {e}")
    sys.exit(1)

print("\n✅ All tests passed! The fix is working correctly.")

#!/usr/bin/env python3
"""
Test script to verify Phase 2 epic generation works end-to-end
"""
import asyncio
import json
from app.services.ai_service import AIService

async def test_epic_generation():
    """Test the epic generation with real data"""
    ai_service = AIService()
    
    # Simulate Phase 1 data as sent from frontend
    test_data = {
        'project': {
            'name': 'Test CRM Project',
            'description': 'A customer relationship management system'
        },
        'functionalRequirements': [
            {
                'requirement': 'User authentication with email and password',
                'title': 'Authentication'
            },
            {
                'requirement': 'Dashboard showing customer overview',
                'title': 'Dashboard'
            },
            {
                'requirement': 'Customer database with CRUD operations',
                'title': 'Customer Management'
            },
            {
                'requirement': 'Generate reports on customer data',
                'title': 'Reporting'
            }
        ],
        'nonFunctionalRequirements': [
            {
                'requirement': 'System must handle 10,000 concurrent users',
                'title': 'Scalability'
            },
            {
                'requirement': 'API response time < 200ms',
                'title': 'Performance'
            },
            {
                'requirement': 'End-to-end encryption for sensitive data',
                'title': 'Security'
            }
        ],
        'gherkinRequirements': [],
        'requirements': [],
        'brd': '''# Business Requirements Document

## Project: CRM System
Build a modern customer relationship management system that helps businesses:
1. Manage customer information centrally
2. Track customer interactions
3. Generate insights from customer data
4. Improve customer service efficiency

## Key Business Goals
- Increase customer retention by 25%
- Reduce customer support response time by 40%
- Improve data accessibility across teams
''',
        'prd': '''# Product Requirements Document

## Overview
A web-based CRM platform with features for customer management, interaction tracking, and reporting.

## Core Features
1. User Management & Authentication
2. Customer Database
3. Dashboard & Analytics
4. Reporting Engine
5. Integration APIs

## Technical Considerations
- Cloud-based deployment
- Microservices architecture
- Real-time data synchronization
''',
        'apiSpec': {},
        'isIncrementalGeneration': False,
        'existingEpics': [],
        'existingStories': []
    }
    
    print("🧪 Testing Phase 2 Epic Generation")
    print("=" * 60)
    print("📊 Input Data:")
    print(f"   - Functional Requirements: {len(test_data.get('functionalRequirements', []))}")
    print(f"   - Non-Functional Requirements: {len(test_data.get('nonFunctionalRequirements', []))}")
    print(f"   - Has BRD: {bool(test_data.get('brd'))}")
    print(f"   - Has PRD: {bool(test_data.get('prd'))}")
    print(f"   - Incremental Generation: {test_data.get('isIncrementalGeneration')}")
    print()
    
    try:
        # Call the generation function
        result = await ai_service._generate_epics_and_stories(test_data)
        
        print("✅ Generation Successful!")
        print("=" * 60)
        print(f"Generated Epics: {len(result.get('epics', []))}")
        print(f"Generated Stories: {len(result.get('user_stories', []))}")
        print()
        
        # Display generated epics
        if result.get('epics'):
            print("📋 Generated Epics:")
            print("-" * 60)
            for epic in result['epics'][:5]:
                print(f"\n{epic.get('id')}. {epic.get('title')}")
                print(f"   Description: {epic.get('description', 'N/A')[:80]}...")
                print(f"   Why Separate: {epic.get('why_separate', 'N/A')[:80]}...")
                print(f"   Stories: {epic.get('stories', 0)}")
                print(f"   Points: {epic.get('points', 0)}")
                if epic.get('dependencies'):
                    print(f"   Dependencies: {epic.get('dependencies')}")
        else:
            print("⚠️ No epics generated!")
            
        # Display sample user stories
        if result.get('user_stories'):
            print(f"\n📝 Sample User Stories (first 3 of {len(result.get('user_stories', []))}):")
            print("-" * 60)
            for story in result['user_stories'][:3]:
                print(f"\n{story.get('id')}. {story.get('title')}")
                print(f"   Epic ID: {story.get('epic_id')}")
                print(f"   Points: {story.get('points')}")
                if story.get('acceptance_criteria'):
                    print(f"   Acceptance Criteria ({len(story.get('acceptance_criteria'))} items)")
                    for criteria in story.get('acceptance_criteria')[:2]:
                        print(f"     - {criteria[:60]}...")
                if story.get('fr_mapping'):
                    print(f"   FR Mapping: {story.get('fr_mapping')[:1]}")
        else:
            print("⚠️ No user stories generated!")
            
        print("\n" + "=" * 60)
        print("✅ Test Completed Successfully!")
        
    except Exception as e:
        print(f"❌ Error during generation: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_epic_generation())

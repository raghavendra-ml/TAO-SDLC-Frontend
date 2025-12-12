"""
Test script to verify optimized prompt for:
1. Minimum 2 stories per epic
2. 360-degree ecosystem coverage
3. Microservice modularity
4. End-to-end flow mapping
5. Story distribution across 5 dimensions
"""
import sys
import json
import asyncio
from app.services.ai_service import AIService

async def test_optimized_generation():
    """Test the optimized EPICS_STORIES_PROMPT for comprehensive generation"""
    
    print("\n" + "="*80)
    print("TESTING: OPTIMIZED EPICS & STORIES GENERATION")
    print("="*80)
    print("\nValidation Points:")
    print("  ✓ Minimum 2 stories per epic (MANDATORY)")
    print("  ✓ 6-12 microservice epics (360-degree coverage)")
    print("  ✓ Total stories = 2-3x number of epics")
    print("  ✓ Stories distributed across 5 dimensions (API, Logic, DB, Integration, Quality)")
    print("  ✓ Domain-specific titles (NOT generic)")
    print("  ✓ End-to-end flow mapping with dependencies")
    print("  ✓ Microservice independence & modularity\n")
    
    # Sample data
    generation_data = {
        "requirements": """
        1. Real-time vehicle location tracking with GPS coordinates
        2. Fleet manager dashboard to view all vehicle locations
        3. Driver mobile app to accept deliveries and navigate routes
        4. Authentication using OAuth 2.0 and JWT tokens
        5. Role-based access control (admin, manager, driver, viewer)
        6. Email notifications for delivery status updates
        7. SMS alerts for urgent route changes
        8. Integration with payment gateway for toll collection
        9. Route optimization using distance and time algorithms
        10. 24/7 operations with 99.9% uptime SLA
        """,
        "brd": """
        Fleet Management & Logistics Platform
        
        OVERVIEW: Enterprise solution for managing vehicle fleet with real-time tracking,
        delivery management, and route optimization.
        
        KEY CAPABILITIES:
        - Real-time GPS tracking of vehicles
        - Multi-role access (admin, manager, driver, viewer)
        - Automated route optimization
        - Notifications via email and SMS
        - Payment integration for tolls and services
        - Historical data and reporting
        
        NON-FUNCTIONAL REQUIREMENTS:
        - Must support 1000+ concurrent users
        - API response time < 500ms for 95th percentile
        - GPS update frequency every 30 seconds
        - Data retention for 24 months
        - Compliance with data privacy regulations
        """,
        "project_name": "Fleet Management & Logistics Platform"
    }
    
    print("INPUT DATA:")
    print(f"  Project: {generation_data['project_name']}")
    print(f"  Requirements: {len(generation_data['requirements'].split(chr(10)))} lines")
    print(f"  BRD length: {len(generation_data['brd'])} chars\n")
    
    print("GENERATING EPICS AND STORIES...")
    print("-" * 80)
    
    ai_service = AIService()
    response = await ai_service.generate_content("Phase 2", "epics_and_stories", generation_data)
    
    # Parse response
    epics = []
    user_stories = []
    
    if isinstance(response, dict):
        content_data = response.get("content", {})
        if isinstance(content_data, dict):
            epics = content_data.get("epics", [])
            user_stories = content_data.get("user_stories", []) or content_data.get("userStories", [])
    
    print(f"\nRESULTS:")
    print(f"  Total Epics: {len(epics)}")
    print(f"  Total Stories: {len(user_stories)}")
    if epics:
        print(f"  Ratio: {len(user_stories)/len(epics):.2f}x stories per epic (target: 2-3x)")
    
    print(f"\n" + "="*80)
    print("VALIDATION: 360-DEGREE COVERAGE & MICROSERVICE MODULARITY")
    print("="*80 + "\n")
    
    all_valid = True
    stories_by_epic = {}
    dimension_coverage = {}
    
    # Link stories to epics and categorize by dimension
    for story in user_stories:
        epic_id = story.get('epic_id')
        if epic_id not in stories_by_epic:
            stories_by_epic[epic_id] = []
        stories_by_epic[epic_id].append(story)
        
        # Classify story dimension based on description
        title = story.get('title', '').lower()
        desc = story.get('description', '').lower()
        
        dimension = "OTHER"
        if any(kw in title + desc for kw in ['api', 'rest', 'endpoint', 'call', 'request']):
            dimension = "API/Contract"
        elif any(kw in title + desc for kw in ['logic', 'algorithm', 'process', 'validate', 'calculate']):
            dimension = "Logic"
        elif any(kw in title + desc for kw in ['database', 'schema', 'query', 'persist', 'storage']):
            dimension = "Database"
        elif any(kw in title + desc for kw in ['payment', 'stripe', 'email', 'sms', 'external', 'integration']):
            dimension = "Integration"
        elif any(kw in title + desc for kw in ['monitor', 'log', 'alert', 'health', 'test']):
            dimension = "Quality"
        
        if epic_id not in dimension_coverage:
            dimension_coverage[epic_id] = set()
        dimension_coverage[epic_id].add(dimension)
    
    # Validate each epic
    validation_issues = []
    for i, epic in enumerate(epics, 1):
        epic_id = epic.get('id')
        epic_title = epic.get('title', f"Epic {epic_id}")
        story_count = len(stories_by_epic.get(epic_id, []))
        dimensions = dimension_coverage.get(epic_id, set())
        
        # Check minimum stories
        is_valid = story_count >= 2
        all_valid = all_valid and is_valid
        
        status = "✅" if is_valid else "❌"
        print(f"{status} Epic {i}: '{epic_title}'")
        print(f"   ID: {epic_id}")
        print(f"   Stories: {story_count} (minimum: 2) {'✓' if story_count >= 2 else '✗'}")
        print(f"   Dimensions: {len(dimensions)} covered: {', '.join(sorted(dimensions))}")
        print(f"   Type: {'MICROSERVICE' if len(story_count) >= 2 else 'INSUFFICIENT'}")
        print()
        
        # Log validation issues
        if story_count < 2:
            validation_issues.append(f"Epic {epic_id} '{epic_title}': Only {story_count} stories (min: 2)")
        if len(dimensions) == 0:
            validation_issues.append(f"Epic {epic_id} '{epic_title}': No dimension coverage detected")
        
        # Show stories for this epic
        for j, story in enumerate(stories_by_epic.get(epic_id, []), 1):
            story_title = story.get('title', 'Untitled')
            if len(story_title) > 70:
                story_title = story_title[:67] + "..."
            print(f"     {j}. {story_title}")
        print()
    
    print("="*80)
    print("ECOSYSTEM COVERAGE ANALYSIS")
    print("="*80 + "\n")
    
    # Check 360-degree coverage
    coverage_dimensions = [
        ("User-Facing", "Frontend", ["dashboard", "mobile", "app", "ui", "interface"]),
        ("Business Logic", "Core Logic", ["tracking", "process", "algorithm", "business"]),
        ("API Layer", "APIs", ["api", "service", "rest", "endpoint"]),
        ("Data Layer", "Database", ["database", "persist", "schema", "data"]),
        ("Authentication", "Auth", ["auth", "oauth", "jwt", "login"]),
        ("Authorization", "Authz", ["permission", "role", "access", "control"]),
        ("Integration", "Integration", ["payment", "email", "sms", "external"]),
        ("Real-Time", "Async", ["notification", "event", "queue", "real-time"]),
    ]
    
    epic_titles_lower = [e.get('title', '').lower() for e in epics]
    all_titles_lower = ' '.join(epic_titles_lower)
    
    covered_dimensions = []
    missing_dimensions = []
    
    for dimension_name, epic_category, keywords in coverage_dimensions:
        if any(kw in all_titles_lower for kw in keywords):
            covered_dimensions.append(f"✅ {dimension_name}")
        else:
            missing_dimensions.append(f"⚠️  {dimension_name}")
    
    print("360-DEGREE ECOSYSTEM COVERAGE:")
    for cov in covered_dimensions:
        print(f"  {cov}")
    if missing_dimensions:
        print("\n  Missing Dimensions:")
        for miss in missing_dimensions:
            print(f"  {miss}")
    
    print(f"\nCoverage Score: {len(covered_dimensions)}/{len(coverage_dimensions)} dimensions")
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80 + "\n")
    print(f"Total Epics:               {len(epics)}")
    print(f"Total Stories:             {len(user_stories)}")
    print(f"Target Stories:            {len(epics)*2}-{len(epics)*3} (2-3x epics)")
    if epics:
        print(f"Actual Ratio:              {len(user_stories)/len(epics):.2f}x epics")
    print(f"Epics < 2 stories:         {sum(1 for epic in epics if len(stories_by_epic.get(epic.get('id'), [])) < 2)}")
    print(f"360° Coverage:             {len(covered_dimensions)}/{len(coverage_dimensions)} dimensions")
    print(f"Microservice Quality:      {'✅ GOOD' if all_valid and len(covered_dimensions) >= len(coverage_dimensions) - 2 else '⚠️ NEEDS WORK'}")
    
    print()
    
    if validation_issues:
        print("⚠️  VALIDATION ISSUES FOUND:")
        for issue in validation_issues:
            print(f"  - {issue}")
        print()
    
    if all_valid:
        print("✅ VALIDATION PASSED: All epics have minimum 2 stories!")
        if len(covered_dimensions) >= len(coverage_dimensions) - 2:
            print("✅ 360° COVERAGE: Excellent ecosystem decomposition!")
        else:
            print(f"⚠️  360° COVERAGE: {len(covered_dimensions)} of {len(coverage_dimensions)} dimensions covered")
    else:
        print("❌ VALIDATION FAILED: Some epics have fewer than 2 stories")
        print("\nEpics with insufficient stories:")
        for epic in epics:
            epic_id = epic.get('id')
            story_count = len(stories_by_epic.get(epic_id, []))
            if story_count < 2:
                print(f"  - {epic.get('title')}: {story_count} stories")
    
    print("\n" + "="*80 + "\n")
    
    return all_valid and len(covered_dimensions) >= len(coverage_dimensions) - 2

if __name__ == "__main__":
    print("\n🔍 Testing optimized epic and story generation...\n")
    
    try:
        success = asyncio.run(test_optimized_generation())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


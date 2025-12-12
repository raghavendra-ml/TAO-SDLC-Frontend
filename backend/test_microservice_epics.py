#!/usr/bin/env python3
"""
Test script to verify the new microservice/360° epic generation
This tests the comprehensive prompt with explicit epic categories
"""

import asyncio
import json
import sys
from app.services.ai_service import AIService
from app.database import engine, SessionLocal
from sqlalchemy.orm import Session

async def test_microservice_epic_generation():
    """Test epic generation with comprehensive microservice framework"""
    
    # Create a test session
    db = SessionLocal()
    
    try:
        ai_service = AIService()
        
        # Test data: A sample requirement/BRD
        test_data = {
            "project_name": "E-Commerce Platform",
            "project_description": "Build a complete e-commerce platform with user management, product catalog, shopping cart, and payment processing",
            "brd": """
E-Commerce Platform - Business Requirements Document

Business Overview:
- Multi-vendor marketplace where vendors can list products
- Users can browse, search, and purchase products
- Payment processing with multiple payment methods
- Order management and tracking
- User reviews and ratings
- Admin dashboard for platform management

Key Features:
1. User Management: Registration, login, profile, address management
2. Product Catalog: Browse, search, filter, view details
3. Shopping Cart: Add/remove items, manage quantities
4. Checkout: Address entry, payment method selection, order confirmation
5. Payment Processing: Integrate with payment gateway (Stripe/PayPal)
6. Order Management: Track orders, view history, cancel orders
7. User Reviews: Rate products, write reviews
8. Admin Dashboard: Manage users, products, orders, disputes
9. Notifications: Email/SMS notifications for order updates
10. Reporting: Sales analytics, user analytics
            """,
            "requirements": [
                "User can register and login securely",
                "User can search and filter products",
                "User can add items to cart and checkout",
                "Payment processing must be secure and PCI compliant",
                "System must handle 10,000+ concurrent users",
                "Order data must be backed up daily",
                "System must integrate with Stripe and PayPal",
                "Admin can manage all system settings",
                "Real-time inventory updates",
                "Email notifications for order updates"
            ],
            "functional_requirements": [
                "User authentication (login/register)",
                "Product search and filtering",
                "Shopping cart management",
                "Secure payment processing",
                "Order management",
                "Admin dashboard",
                "Review and rating system",
                "Notification system"
            ],
            "nonfunctional_requirements": [
                "Handle 10,000 concurrent users",
                "Response time < 2 seconds",
                "99.9% uptime",
                "PCI DSS compliance for payments",
                "GDPR compliance for data",
                "Daily backups",
                "Load balancing and auto-scaling"
            ],
            "stakeholders": [
                "Platform Administrators",
                "Vendors",
                "End Users/Customers",
                "Payment Providers",
                "Support Team"
            ]
        }
        
        print("=" * 80)
        print("🧪 TESTING MICROSERVICE/360° EPIC GENERATION")
        print("=" * 80)
        print(f"\n📋 Project: {test_data['project_name']}")
        print(f"📝 Description: {test_data['project_description']}")
        print(f"\n🔍 Input Size:")
        print(f"  - Requirements: {len(test_data['requirements'])} items")
        print(f"  - Functional Reqs: {len(test_data['functional_requirements'])} items")
        print(f"  - Non-Functional Reqs: {len(test_data['nonfunctional_requirements'])} items")
        print(f"  - Stakeholders: {len(test_data['stakeholders'])} roles")
        
        print("\n🚀 Generating epics with comprehensive microservice framework...")
        print("   Looking for: API, Database, Frontend, Auth, RBAC, Integrations,")
        print("               Data Sync, Admin, Monitoring, Deployment, Docs, Testing")
        print("   And suggested epics for missing dimensions...")
        
        # Call the epic generation
        result = await ai_service._generate_epics_and_stories(test_data)
        
        print(f"\n✅ GENERATION COMPLETE")
        print(f"\n📊 Results:")
        print(f"  - Epics Generated: {len(result.get('epics', []))}")
        print(f"  - User Stories Generated: {len(result.get('user_stories', []))}")
        
        epics = result.get('epics', [])
        
        # Analyze epics
        suggested_count = sum(1 for e in epics if e.get('suggested', False))
        main_count = len(epics) - suggested_count
        
        print(f"\n📌 Epic Breakdown:")
        print(f"  - Main Epics (from Phase 1): {main_count}")
        print(f"  - Suggested Epics (recommendations): {suggested_count}")
        
        print(f"\n📋 EPICS GENERATED:")
        print("-" * 80)
        
        for epic in epics:
            epic_id = epic.get('id', '?')
            title = epic.get('title', 'Unknown')
            suggested = '💡 SUGGESTED' if epic.get('suggested') else 'MAIN'
            desc = epic.get('description', '')[:60] + ('...' if len(epic.get('description', '')) > 60 else '')
            points = epic.get('points', 0)
            stories = epic.get('stories', 0)
            priority = epic.get('priority', 'Medium')
            
            print(f"\n{epic_id}. [{suggested}] {title}")
            print(f"   Description: {desc}")
            print(f"   Stories: {stories} | Points: {points} | Priority: {priority}")
            
            # Show why separate
            if epic.get('why_separate'):
                print(f"   Why Separate: {epic['why_separate']}")
            
            # Show suggested reason if applicable
            if epic.get('suggested_reason'):
                print(f"   Recommendation: {epic['suggested_reason']}")
            
            # Show FR/NFR
            if epic.get('functional_requirements'):
                print(f"   Functional Requirements:")
                for fr in epic['functional_requirements'][:3]:
                    print(f"     • {fr}")
                if len(epic['functional_requirements']) > 3:
                    print(f"     • ... and {len(epic['functional_requirements']) - 3} more")
            
            if epic.get('nonfunctional_requirements'):
                print(f"   Non-Functional Requirements:")
                for nfr in epic['nonfunctional_requirements'][:2]:
                    print(f"     • {nfr}")
                if len(epic['nonfunctional_requirements']) > 2:
                    print(f"     • ... and {len(epic['nonfunctional_requirements']) - 2} more")
            
            # Show dependencies
            if epic.get('dependencies'):
                print(f"   Dependencies: {epic['dependencies']}")
            
            # Show blockers
            if epic.get('blockers'):
                print(f"   Blockers: {epic['blockers']}")
        
        print("\n" + "=" * 80)
        print("🎯 VERIFICATION CHECKLIST:")
        print("-" * 80)
        
        # Check for key microservice categories
        epic_titles = [e.get('title', '').lower() for e in epics]
        
        checks = {
            'API/Backend': any('api' in t or 'backend' in t or 'service' in t for t in epic_titles),
            'Database': any('database' in t or 'data' in t or 'persistence' in t for t in epic_titles),
            'Frontend': any('frontend' in t or 'ui' in t or 'interface' in t for t in epic_titles),
            'Authentication': any('auth' in t or 'login' in t or 'security' in t for t in epic_titles),
            'Role Management': any('role' in t or 'rbac' in t or 'permission' in t for t in epic_titles),
            'Integration': any('integration' in t or 'payment' in t or 'external' in t for t in epic_titles),
            'Monitoring/Logging': any('monitor' in t or 'log' in t or 'observability' in t for t in epic_titles),
            'Deployment': any('deploy' in t or 'ci/cd' in t or 'devops' in t for t in epic_titles),
        }
        
        passed = sum(1 for v in checks.values() if v)
        total = len(checks)
        
        for category, found in checks.items():
            status = '✅' if found else '❌'
            print(f"{status} {category}: {'Found' if found else 'NOT FOUND'}")
        
        print(f"\n📈 Coverage: {passed}/{total} categories found ({100*passed//total}%)")
        
        # Check text-based requirements
        has_text_fr = all(
            isinstance(e.get('functional_requirements', []), list) and
            all(isinstance(item, str) for item in e.get('functional_requirements', []))
            for e in epics if e.get('functional_requirements')
        )
        
        has_text_nfr = all(
            isinstance(e.get('nonfunctional_requirements', []), list) and
            all(isinstance(item, str) for item in e.get('nonfunctional_requirements', []))
            for e in epics if e.get('nonfunctional_requirements')
        )
        
        print(f"\n📋 Format Verification:")
        print(f"{'✅' if has_text_fr else '❌'} FR as TEXT: {has_text_fr}")
        print(f"{'✅' if has_text_nfr else '❌'} NFR as TEXT: {has_text_nfr}")
        print(f"{'✅' if suggested_count > 0 else '❌'} Suggested epics: {suggested_count} found")
        
        print("\n" + "=" * 80)
        print("✨ Test Complete!")
        print("=" * 80)
        
        # Save result to file for inspection
        with open('/tmp/microservice_epics_result.json', 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Full result saved to: /tmp/microservice_epics_result.json")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_microservice_epic_generation())
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
"""
Add dummy stakeholders to the users table for testing
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def add_dummy_stakeholders():
    db = SessionLocal()
    
    try:
        # Check if demo users already exist
        existing_demo_users = db.query(User).filter(User.email.like('demo%@example.com')).count()
        if existing_demo_users >= 5:
            print("✅ Dummy stakeholders already exist!")
            return
        
        # Define dummy stakeholders by role
        stakeholders = [
            # Product Managers
            {
                'email': 'demo.pm1@example.com',
                'username': 'demo_pm1',
                'full_name': 'Alice Johnson - Product Manager',
                'role': 'Product Manager'
            },
            {
                'email': 'demo.pm2@example.com',
                'username': 'demo_pm2',
                'full_name': 'Bob Smith - Senior Product Manager',
                'role': 'Product Manager'
            },
            # Business Analysts
            {
                'email': 'demo.ba1@example.com',
                'username': 'demo_ba1',
                'full_name': 'Carol Davis - Business Analyst',
                'role': 'Business Analyst'
            },
            {
                'email': 'demo.ba2@example.com',
                'username': 'demo_ba2',
                'full_name': 'David Wilson - Senior Business Analyst',
                'role': 'Business Analyst'
            },
            # Technical Leads
            {
                'email': 'demo.tl1@example.com',
                'username': 'demo_tl1',
                'full_name': 'Emma Taylor - Technical Lead',
                'role': 'Technical Lead'
            },
            {
                'email': 'demo.tl2@example.com',
                'username': 'demo_tl2',
                'full_name': 'Frank Miller - Architect',
                'role': 'Technical Lead'
            },
            # Project Managers
            {
                'email': 'demo.pm3@example.com',
                'username': 'demo_pm3',
                'full_name': 'Grace Lee - Project Manager',
                'role': 'Project Manager'
            },
            {
                'email': 'demo.pm4@example.com',
                'username': 'demo_pm4',
                'full_name': 'Henry Brown - Program Manager',
                'role': 'Project Manager'
            },
            # Stakeholders
            {
                'email': 'demo.sh1@example.com',
                'username': 'demo_sh1',
                'full_name': 'Iris Martinez - Stakeholder',
                'role': 'Stakeholder'
            },
            {
                'email': 'demo.sh2@example.com',
                'username': 'demo_sh2',
                'full_name': 'Jack Anderson - Executive Sponsor',
                'role': 'Stakeholder'
            },
            # QA/Testing
            {
                'email': 'demo.qa1@example.com',
                'username': 'demo_qa1',
                'full_name': 'Karen White - QA Lead',
                'role': 'QA Lead'
            },
            {
                'email': 'demo.qa2@example.com',
                'username': 'demo_qa2',
                'full_name': 'Leo Thompson - Test Engineer',
                'role': 'QA Lead'
            },
            # Operations
            {
                'email': 'demo.ops1@example.com',
                'username': 'demo_ops1',
                'full_name': 'Monica Garcia - Operations Manager',
                'role': 'Operations Manager'
            },
            {
                'email': 'demo.ops2@example.com',
                'username': 'demo_ops2',
                'full_name': 'Nathan Clark - DevOps Engineer',
                'role': 'Operations Manager'
            },
        ]
        
        password = hash_password('demo@123')
        added_count = 0
        
        for stakeholder_data in stakeholders:
            # Check if user already exists
            existing = db.query(User).filter(User.email == stakeholder_data['email']).first()
            if existing:
                print(f"⏭️  Skipping {stakeholder_data['full_name']} - already exists")
                continue
            
            # Create new user
            new_user = User(
                email=stakeholder_data['email'],
                username=stakeholder_data['username'],
                full_name=stakeholder_data['full_name'],
                role=stakeholder_data['role'],
                hashed_password=password
            )
            db.add(new_user)
            added_count += 1
            print(f"✅ Added: {stakeholder_data['full_name']} ({stakeholder_data['role']})")
        
        if added_count > 0:
            db.commit()
            print(f"\n✨ Successfully added {added_count} dummy stakeholders!")
        else:
            print("\nℹ️  All dummy stakeholders already exist")
        
        # Show summary
        roles = db.query(User.role).distinct().all()
        print(f"\n📊 Available roles: {', '.join([r[0] for r in roles if r[0]])}")
        
        for role in [r[0] for r in roles if r[0]]:
            count = db.query(User).filter(User.role == role).count()
            print(f"  • {role}: {count} users")
            
    except Exception as e:
        print(f"❌ Error adding stakeholders: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == '__main__':
    add_dummy_stakeholders()

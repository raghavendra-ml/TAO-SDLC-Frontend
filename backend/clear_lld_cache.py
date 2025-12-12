#!/usr/bin/env python
"""Clear cached LLD data from Phase 4 to force fresh generation"""

import sys
sys.path.insert(0, '/c/Users/raghavendra.thummala/Desktop/projects/TAO SDLC/TAO_SDLC_25_11/backend')

from app.database import SessionLocal
from app.models import Phase
import json

db = SessionLocal()
try:
    # Find Phase 4 for the project
    phase4 = db.query(Phase).filter(Phase.phase_number == 4).first()
    if phase4:
        print(f"✅ Found Phase 4: ID={phase4.id}")
        print(f"📋 Current data keys: {list(phase4.data.keys()) if phase4.data else 'None'}")
        
        # Clear component_wise_lld from data
        if phase4.data and 'component_wise_lld' in phase4.data:
            doc_len = len(phase4.data['component_wise_lld'].get('document', ''))
            print(f"🗑️  Removing cached component_wise_lld ({doc_len} chars)")
            del phase4.data['component_wise_lld']
            db.commit()
            print("✅ CLEARED cached LLD data from Phase 4")
            print(f"📋 Updated data keys: {list(phase4.data.keys())}")
        else:
            print("ℹ️  No component_wise_lld in Phase 4 data (already cleared or never set)")
    else:
        print("❌ Phase 4 not found in database")
        # List all phases
        phases = db.query(Phase).all()
        print(f"Available phases: {[(p.id, p.phase_number) for p in phases]}")
finally:
    db.close()

import json
from app.database import SessionLocal
from app import models

db = SessionLocal()
phase1 = db.query(models.Phase).filter(
    models.Phase.project_id == 2,
    models.Phase.phase_number == 1
).first()

if phase1:
    print('✅ Phase 1 found')
    if isinstance(phase1.data, str):
        try:
            data = json.loads(phase1.data)
        except:
            data = phase1.data
    else:
        data = phase1.data
    
    if isinstance(data, dict):
        print(f'Keys: {list(data.keys())}')
        print(f'Requirements: {len(data.get("requirements", []))} items')
        print(f'BRD: {len(str(data.get("brd", "")))} chars')
    else:
        print('Data is not a dict')
else:
    print('❌ Phase 1 not found for project 2')

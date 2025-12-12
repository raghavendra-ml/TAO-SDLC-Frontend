from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.services.ai_service import AIService

router = APIRouter()

@router.get("/project/{project_id}")
def get_project_phases(project_id: int, db: Session = Depends(get_db)):
    import json
    print(f"\n📥 [GET_PHASES] Querying phases for project_id={project_id}")
    
    # Get project details
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    project_name = project.name if project else f"Project {project_id}"
    
    phases = db.query(models.Phase).filter(
        models.Phase.project_id == project_id
    ).order_by(models.Phase.phase_number).all()
    
    print(f"📥 [GET_PHASES] Found {len(phases)} phases")

    # Convert to dicts to ensure proper JSON serialization
    result = []
    for phase in phases:
        print(f"📥 [GET_PHASES] Processing phase_id={phase.id}, phase_number={phase.phase_number}")
        
        # Convert string JSON to dict if needed
        phase_data = phase.data
        if isinstance(phase_data, str):
            try:
                phase_data = json.loads(phase_data)
                print(f"✅ [GET_PHASES] Converted phase {phase.id} data from string to dict")
            except Exception as e:
                print(f"❌ [GET_PHASES] Failed to parse phase.data: {e}")
                phase_data = {}
        
        if phase_data is None:
            phase_data = {}
        
        # Debug Phase 3
        if phase.phase_number == 3:
            print(f"🔍 [GET_PHASES] Phase 3 data keys: {list(phase_data.keys())}")
            print(f"🔍 [GET_PHASES] Phase 3 has architecture: {'architecture' in phase_data}")
            if 'architecture' in phase_data:
                arch = phase_data.get('architecture', {})
                print(f"🔍 [GET_PHASES] Phase 3 architecture keys: {list(arch.keys()) if isinstance(arch, dict) else 'NOT_DICT'}")
        
        # Create response dict
        phase_dict = {
            "id": phase.id,
            "project_id": phase.project_id,
            "project_name": project_name,
            "phase_number": phase.phase_number,
            "phase_name": phase.phase_name,
            "status": phase.status,
            "data": phase_data,
            "ai_confidence_score": phase.ai_confidence_score or 0,
            "created_at": phase.created_at.isoformat() if phase.created_at else None
        }
        result.append(phase_dict)

    print(f"✅ [GET_PHASES] Returning {len(result)} phases with project_name='{project_name}'\n")
    return result

@router.get("/{phase_id}")
def get_phase(phase_id: int, db: Session = Depends(get_db)):
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    # Return as dict to ensure proper JSON serialization
    return {
        "id": phase.id,
        "project_id": phase.project_id,
        "phase_number": phase.phase_number,
        "phase_name": phase.phase_name,
        "status": phase.status,
        "data": phase.data or {},
        "ai_confidence_score": phase.ai_confidence_score or 0,
        "created_at": phase.created_at.isoformat() if phase.created_at else None
    }

@router.put("/{phase_id}")
def update_phase(
    phase_id: int,
    phase_update: schemas.PhaseUpdate,
    db: Session = Depends(get_db)
):
    import json
    
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    print(f"\n🔄 [UPDATE_PHASE] ============ UPDATE STARTED ============")
    print(f"🔄 [UPDATE_PHASE] phase_id={phase_id}, status={phase.status}")
    
    # Track if this phase is being approved
    is_being_approved = phase_update.status == models.PhaseStatus.APPROVED and phase.status != models.PhaseStatus.APPROVED
    
    if phase_update.status:
        print(f"🔄 [UPDATE_PHASE] Setting status: {phase.status} → {phase_update.status}")
        phase.status = phase_update.status
    
    if phase_update.data:
        print(f"🔄 [UPDATE_PHASE] Updating phase data with keys: {list(phase_update.data.keys())}")
        print(f"🔄 [UPDATE_PHASE] Incoming data has 'architecture'? {'architecture' in phase_update.data}")
        print(f"🔄 [UPDATE_PHASE] Incoming architecture type: {type(phase_update.data.get('architecture'))}")
        
        # IMPORTANT: Always replace the entire data dict to ensure clean state
        phase.data = dict(phase_update.data)  # Create a copy
        
        print(f"✅ [UPDATE_PHASE] After set - phase.data has 'architecture': {'architecture' in phase.data if phase.data else False}")
        print(f"✅ [UPDATE_PHASE] After set - phase.data keys: {list(phase.data.keys()) if phase.data else 'NULL'}")
    
    if phase_update.ai_confidence_score is not None:
        print(f"🔄 [UPDATE_PHASE] Setting ai_confidence_score: {phase_update.ai_confidence_score}")
        phase.ai_confidence_score = phase_update.ai_confidence_score
    
    # If this phase is being approved, unlock the next phase
    if is_being_approved:
        next_phase = db.query(models.Phase).filter(
            models.Phase.project_id == phase.project_id,
            models.Phase.phase_number == phase.phase_number + 1
        ).first()
        
        if next_phase and next_phase.status == models.PhaseStatus.NOT_STARTED:
            next_phase.status = models.PhaseStatus.IN_PROGRESS
            print(f"✅ Phase {phase.phase_number} approved, unlocking Phase {next_phase.phase_number}")
    
    print(f"💾 [UPDATE_PHASE] Committing to database...")
    db.commit()
    db.refresh(phase)
    
    print(f"✅ [UPDATE_PHASE] After commit - phase.data has 'architecture': {'architecture' in phase.data if phase.data else False}")
    print(f"🔄 [UPDATE_PHASE] ============ UPDATE COMPLETED ============\n")
    
    # Return as dict to ensure proper JSON serialization
    return {
        "id": phase.id,
        "project_id": phase.project_id,
        "phase_number": phase.phase_number,
        "phase_name": phase.phase_name,
        "status": phase.status,
        "data": phase.data or {},
        "ai_confidence_score": phase.ai_confidence_score or 0,
        "created_at": phase.created_at
    }


@router.post("/generate/{project_id}/epics-and-stories")
async def generate_epics_and_stories(project_id: int, db: Session = Depends(get_db)):
    """
    Generate epics and user stories using EPICS_STORIES_PROMPT
    """
    print(f"\n[PHASE2] Starting epic generation for project_id={project_id}")
    
    try:
        # Get project
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        print(f"[PROJECT] {project.name}")
        
        # Get Phase 1 data
        phase1 = db.query(models.Phase).filter(
            models.Phase.project_id == project_id,
            models.Phase.phase_number == 1
        ).first()
        
        # Parse Phase 1 data
        import json
        phase1_data = {}
        if phase1 and phase1.data:
            if isinstance(phase1.data, str):
                try:
                    phase1_data = json.loads(phase1.data)
                except Exception as e:
                    print(f"[WARN] Failed to parse Phase 1 data: {e}")
                    phase1_data = {}
            else:
                phase1_data = phase1.data
        
        # Extract Requirements and BRD for EPICS_STORIES_PROMPT
        requirements_text = phase1_data.get("requirements", [])
        brd_text = phase1_data.get("brd", "")
        
        print(f"[DATA] Phase 1: {len(requirements_text)} requirements, BRD: {len(str(brd_text))} chars")
        
        # Format requirements as string
        if isinstance(requirements_text, list):
            requirements_str = "\n".join([str(r.get('requirement', r) if isinstance(r, dict) else r) for r in requirements_text])
        else:
            requirements_str = str(requirements_text)
        
        # Prepare minimal data for prompt
        generation_data = {
            "requirements": requirements_str,
            "brd": str(brd_text),
            "project_name": project.name,
        }
        
        print(f"[AI] Calling AI Service with EPICS_STORIES_PROMPT...")
        
        # Call AI service
        ai_service = AIService()
        response = await ai_service.generate_content("Phase 2", "epics_and_stories", generation_data)
        
        # Parse response - response is {"content": {...}, "confidence_score": ...}
        epics = []
        user_stories = []
        
        if isinstance(response, dict):
            # The actual epics/stories are in response['content']
            content_data = response.get("content", {})
            if isinstance(content_data, dict):
                epics = content_data.get("epics", [])
                user_stories = content_data.get("user_stories", []) or content_data.get("userStories", [])
        
        print(f"[RESULT] Generated: {len(epics)} epics, {len(user_stories)} stories")
        
        # Analyze execution flow
        print(f"[FLOW] Analyzing dependencies & execution flow...")
        epic_dict = {epic.get('id'): epic for epic in epics}
        execution_order = []
        visited = set()
        
        def topo_sort(epic_id, visited_set, order):
            if epic_id in visited_set:
                return
            visited_set.add(epic_id)
            epic = epic_dict.get(epic_id)
            if epic:
                for dep_id in epic.get('dependencies', []):
                    topo_sort(dep_id, visited_set, order)
                order.append(epic_id)
        
        for epic in epics:
            topo_sort(epic.get('id'), visited, execution_order)
        
        # Link stories to epics
        for story in user_stories:
            epic_id = story.get('epic_id')
            if epic_id in epic_dict:
                if 'stories' not in epic_dict[epic_id]:
                    epic_dict[epic_id]['stories'] = []
                epic_dict[epic_id]['stories'].append(story)
        
        # VALIDATION: Ensure minimum 2 stories per epic
        print(f"[VALIDATION] Checking minimum 2 stories per epic requirement...")
        validation_errors = []
        for epic in epics:
            epic_id = epic.get('id')
            story_count = len(epic.get('stories', []))
            print(f"[VALIDATION] Epic {epic_id} ({epic.get('title')}): {story_count} stories")
            if story_count < 2:
                validation_errors.append(f"Epic {epic_id} has only {story_count} stories (minimum: 2)")
        
        if validation_errors:
            print(f"[VALIDATION FAILED] Issues found:")
            for error in validation_errors:
                print(f"  - {error}")
            print(f"[VALIDATION] Total epics: {len(epics)}, Total stories: {len(user_stories)}")
            print(f"[VALIDATION] Average stories per epic: {len(user_stories) / len(epics):.1f}")
            print(f"[VALIDATION] Requirement: Total stories should be 2-3x number of epics")
            print(f"[VALIDATION] Requirement: {len(epics)} epics × 2-3 = {len(epics)*2}-{len(epics)*3} stories")
            # Log but continue - frontend will see incomplete data
            # In production, you might want to re-request from AI until this passes
        else:
            print(f"[VALIDATION PASSED] All {len(epics)} epics have minimum 2 stories")
            print(f"[VALIDATION] Total: {len(user_stories)} stories across {len(epics)} epics")
            print(f"[VALIDATION] Ratio: {len(user_stories) / len(epics):.1f} stories per epic (target: 2-3)")
        
        print(f"[ORDER] Execution order: {execution_order}")
        
        # Save to database
        from datetime import datetime
        phase2_data = {
            "epics": epics,
            "userStories": user_stories,
            "executionOrder": execution_order,
            "generatedAt": datetime.now().isoformat(),
        }
        
        phase2 = db.query(models.Phase).filter(
            models.Phase.project_id == project_id,
            models.Phase.phase_number == 2
        ).first()
        
        if not phase2:
            phase2 = models.Phase(
                project_id=project_id,
                phase_number=2,
                name="Phase 2: Planning & Product Backlog",
                status=models.PhaseStatus.IN_PROGRESS,
                data=phase2_data
            )
            db.add(phase2)
        else:
            phase2.data = phase2_data
        
        db.commit()
        print(f"[SUCCESS] Saved to database\n")
        
        return {
            "success": True,
            "epics": epics,
            "userStories": user_stories,
            "executionOrder": execution_order,
            "count": {
                "epics": len(epics),
                "stories": len(user_stories)
            }
        }
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


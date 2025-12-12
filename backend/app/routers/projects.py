from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.Project)
def create_project(
    project: schemas.ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        db_project = models.Project(
            name=project.name,
            description=project.description
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        
        # Create initial 6 phases with improved structure
        from app.models import PHASE_CONFIGS
        
        for phase_num, config in PHASE_CONFIGS.items():
            phase = models.Phase(
                project_id=db_project.id,
                phase_number=phase_num,
                phase_name=config["name"],
                status=models.PhaseStatus.NOT_STARTED if phase_num > 1 else models.PhaseStatus.IN_PROGRESS,
                data={
                    "description": config["description"],
                    "key_activities": config["key_activities"],
                    "deliverables": config["deliverables"],
                    "approvers": config["approvers"]
                }
            )
            db.add(phase)
        
        db.commit()
        print(f"✅ Project created successfully: {db_project.id} - {db_project.name}")
        return db_project
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.get("/", response_model=List[schemas.Project])
def get_projects(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    projects = db.query(models.Project).offset(skip).limit(limit).all()
    print(f"📋 Fetching projects for user {current_user.username}: Found {len(projects)} projects")
    
    # Enrich projects with computed phase counts
    enriched_projects = []
    for project in projects:
        # Query phases for this project
        phases = db.query(models.Phase).filter(
            models.Phase.project_id == project.id
        ).all()
        
        # Count completed/approved phases (normalize enum/string safely for linters)
        def _is_approved(status_val):
            sv = getattr(status_val, "value", status_val)
            return str(sv) == str(models.PhaseStatus.APPROVED.value)

        completed_count = 0
        for p in phases:
            if _is_approved(p.status):
                completed_count += 1
        
        # Create enriched project dict
        project_dict = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "current_phase": project.current_phase,
            "status": project.status,
            "created_at": project.created_at,
            "completed_phases": completed_count,
            "total_phases": 6
        }
        enriched_projects.append(schemas.Project(**project_dict))
    
    return enriched_projects

@router.get("/{project_id}", response_model=schemas.Project)
def get_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Query phases for this project
    phases = db.query(models.Phase).filter(
        models.Phase.project_id == project.id
    ).all()
    
    # Count completed/approved phases (normalize enum/string safely for linters)
    def _is_approved(status_val):
        sv = getattr(status_val, "value", status_val)
        return str(sv) == str(models.PhaseStatus.APPROVED.value)

    completed_count = 0
    for p in phases:
        if _is_approved(p.status):
            completed_count += 1
    
    # Create enriched project dict
    project_dict = {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "current_phase": project.current_phase,
        "status": project.status,
        "created_at": project.created_at,
        "completed_phases": completed_count,
        "total_phases": 6
    }
    
    return schemas.Project(**project_dict)

@router.delete("/{project_id}")
def delete_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a project and all its associated data"""
    try:
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Delete in correct order to avoid foreign key constraints
        # 1. Delete approvals first (approvals are linked to phases, not directly to projects)
        phases = db.query(models.Phase).filter(models.Phase.project_id == project_id).all()
        phase_ids = [phase.id for phase in phases]
        if phase_ids:
            db.query(models.Approval).filter(models.Approval.phase_id.in_(phase_ids)).delete(synchronize_session=False)
        
        # 2. Delete AI interactions
        from app.models import AIInteraction
        db.query(AIInteraction).filter(AIInteraction.project_id == project_id).delete(synchronize_session=False)
        
        # 3. Delete phases
        db.query(models.Phase).filter(models.Phase.project_id == project_id).delete(synchronize_session=False)
        
        # 4. Delete project stakeholders if exists
        try:
            from app.models import ProjectStakeholder
            db.query(ProjectStakeholder).filter(ProjectStakeholder.project_id == project_id).delete(synchronize_session=False)
        except:
            pass
        
        # 5. Finally delete the project
        db.delete(project)
        db.commit()
        
        return {"message": "Project deleted successfully", "project_id": project_id}
    except Exception as e:
        db.rollback()
        print(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

@router.post("/{project_id}/stakeholders")
def add_stakeholder(
    project_id: int,
    stakeholder: schemas.ProjectStakeholderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_stakeholder = models.ProjectStakeholder(
        project_id=project_id,
        user_id=stakeholder.user_id,
        role=stakeholder.role
    )
    db.add(db_stakeholder)
    db.commit()
    return {"message": "Stakeholder added successfully"}


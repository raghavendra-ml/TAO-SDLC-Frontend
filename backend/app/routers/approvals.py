from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Approval)
def create_approval(approval: schemas.ApprovalCreate, db: Session = Depends(get_db)):
    db_approval = models.Approval(
        phase_id=approval.phase_id,
        approver_id=approval.approver_id,
        status=models.ApprovalStatus.PENDING
    )
    db.add(db_approval)
    db.commit()
    db.refresh(db_approval)
    return db_approval

@router.get("/phase/{phase_id}", response_model=List[schemas.Approval])
def get_phase_approvals(phase_id: int, db: Session = Depends(get_db)):
    approvals = db.query(models.Approval).filter(models.Approval.phase_id == phase_id).all()
    return approvals

@router.get("/pending/{user_id}", response_model=List[schemas.Approval])
def get_pending_approvals(user_id: int, db: Session = Depends(get_db)):
    approvals = db.query(models.Approval).filter(
        models.Approval.approver_id == user_id,
        models.Approval.status == models.ApprovalStatus.PENDING
    ).all()
    return approvals

@router.put("/{approval_id}", response_model=schemas.Approval)
def update_approval(
    approval_id: int,
    approval_update: schemas.ApprovalUpdate,
    db: Session = Depends(get_db)
):
    approval = db.query(models.Approval).filter(models.Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    approval.status = approval_update.status
    if approval_update.comments:
        approval.comments = approval_update.comments
    approval.approved_at = datetime.now()
    
    # Update phase status if all approvals are complete
    phase = db.query(models.Phase).filter(models.Phase.id == approval.phase_id).first()
    all_approvals = db.query(models.Approval).filter(models.Approval.phase_id == approval.phase_id).all()
    
    if all(a.status in [models.ApprovalStatus.APPROVED, models.ApprovalStatus.CONDITIONAL] for a in all_approvals):
        phase.status = models.PhaseStatus.APPROVED
    elif any(a.status == models.ApprovalStatus.REJECTED for a in all_approvals):
        phase.status = models.PhaseStatus.REJECTED
    
    db.commit()
    db.refresh(approval)
    return approval


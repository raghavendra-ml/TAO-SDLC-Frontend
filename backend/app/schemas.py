from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models import PhaseStatus, ApprovalStatus

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserSignup(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    role: Optional[str] = "Developer"

class LoginRequest(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

# Project Schemas
class ProjectCreate(BaseModel):
    name: str
    description: str

class ProjectStakeholderCreate(BaseModel):
    user_id: int
    role: str

class Project(BaseModel):
    id: int
    name: str
    description: str
    current_phase: int
    status: str
    created_at: datetime
    completed_phases: int = 0
    total_phases: int = 6
    
    class Config:
        from_attributes = True

# Phase Schemas
class PhaseCreate(BaseModel):
    phase_number: int
    phase_name: str
    data: Optional[Dict[str, Any]] = {}

class PhaseUpdate(BaseModel):
    status: Optional[PhaseStatus] = None
    data: Optional[Dict[str, Any]] = None
    ai_confidence_score: Optional[int] = None

class Phase(BaseModel):
    id: int
    project_id: int
    phase_number: int
    phase_name: str
    status: PhaseStatus
    data: Optional[Dict[str, Any]] = {}
    ai_confidence_score: Optional[int] = 0
    created_at: datetime
    
    class Config:
        from_attributes = True

# Approval Schemas
class ApprovalCreate(BaseModel):
    phase_id: int
    approver_id: int

class ApprovalUpdate(BaseModel):
    status: ApprovalStatus
    comments: Optional[str] = None

class Approval(BaseModel):
    id: int
    phase_id: int
    approver_id: int
    status: ApprovalStatus
    comments: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# AI Copilot Schemas
class AIQuery(BaseModel):
    project_id: int
    phase_id: int
    query: str
    context: Optional[Dict[str, Any]] = {}

class AIResponse(BaseModel):
    response: str
    confidence_score: int
    alternatives: Optional[List[str]] = []
    explanation: Optional[str] = None


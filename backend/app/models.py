from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class PhaseStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLOCKED = "blocked"

class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CONDITIONAL = "conditional"

class IntegrationType(str, enum.Enum):
    JIRA = "jira"
    GITHUB = "github"
    GITLAB = "gitlab"
    CONFLUENCE = "confluence"
    SLACK = "slack"
    TEAMS = "teams"
    JENKINS = "jenkins"
    CIRCLECI = "circleci"

class WorkflowType(str, enum.Enum):
    CODE_GENERATION = "code_generation"
    TEST_GENERATION = "test_generation"
    DEPLOYMENT = "deployment"
    DOCUMENTATION = "documentation"
    CODE_REVIEW = "code_review"

# Phase configurations
PHASE_CONFIGS = {
    1: {
        "name": "Phase 1: Requirements & Business Analysis",
        "description": "Define what to build",
        "key_activities": ["Requirements Collection", "PRD/BRD Creation", "Feasibility Analysis", "Risk Assessment"],
        "deliverables": ["PRD", "BRD", "Risk Assessment"],
        "approvers": ["BR Owner", "Product Owner", "Business Stakeholders"]
    },
    2: {
        "name": "Phase 2: Planning & Product Backlog",
        "description": "Plan how much and when",
        "key_activities": ["Effort Estimation", "Backlog Creation", "Sprint Planning", "Resource Allocation"],
        "deliverables": ["Product Backlog", "Sprint Plan", "Release Roadmap"],
        "approvers": ["Project Manager", "Product Owner", "Technical Lead"]
    },
    3: {
        "name": "Phase 3: Architecture & High-Level Design (HLD)",
        "description": "System architecture, components, and high-level design",
        "key_activities": ["System Architecture Components", "High Level Design", "End-to-End Flow Diagram", "Component Design"],
        "deliverables": ["Architecture Document", "HLD Document", "E2E Flow Diagram", "Component Diagrams"],
        "approvers": ["Solution Architect", "Technical Architect", "Security Architect"]
    },
    4: {
        "name": "Phase 4: Detailed Technical Design (LLD)",
        "description": "Low-level design, database schemas, API specifications, and infrastructure",
        "key_activities": ["Database Design", "API Specifications", "Integration Design", "Infrastructure Design"],
        "deliverables": ["Database Schema", "API Documentation", "Integration Specs", "Infrastructure Design"],
        "approvers": ["Technical Architect", "Database Architect", "Integration Architect"]
    },
    5: {
        "name": "Phase 5: Development",
        "description": "Implementation and coding of the software",
        "key_activities": ["Backend Development", "Frontend Development", "API Implementation", "Database Setup", "Code Reviews"],
        "deliverables": ["Working Code", "API Endpoints", "Database Schema", "Code Documentation"],
        "approvers": ["Technical Lead", "Backend Lead", "Frontend Lead"]
    },
    6: {
        "name": "Phase 6: Testing & QA",
        "description": "Quality assurance and comprehensive testing",
        "key_activities": ["Unit Testing", "Integration Testing", "System Testing", "UAT", "Performance Testing", "Security Testing"],
        "deliverables": ["Test Reports", "Test Coverage Reports", "Bug Reports", "QA Sign-off"],
        "approvers": ["QA Lead", "Technical Lead", "Product Owner"]
    },
    7: {
        "name": "Phase 7: Deployment, Release & Operations",
        "description": "Release to production and monitor",
        "key_activities": ["Staging Deployment", "Production Deployment", "Monitoring Setup", "Documentation"],
        "deliverables": ["Deployed Application", "Monitoring Dashboard", "Documentation"],
        "approvers": ["DevOps Lead", "Technical Lead", "Product Owner"]
    }
}

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String)
    role = Column(String)  # BR-owner, Logical-Arc-owner, etc.
    hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    projects = relationship("ProjectStakeholder", back_populates="user")
    approvals = relationship("Approval", back_populates="approver")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    current_phase = Column(Integer, default=1)
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    stakeholders = relationship("ProjectStakeholder", back_populates="project")
    phases = relationship("Phase", back_populates="project")

class ProjectStakeholder(Base):
    __tablename__ = "project_stakeholders"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String)  # BR-owner, Logical-Arc-owner, Deployment-Arc-owner, etc.
    
    project = relationship("Project", back_populates="stakeholders")
    user = relationship("User", back_populates="projects")

class Phase(Base):
    __tablename__ = "phases"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    phase_number = Column(Integer)  # 1-7
    phase_name = Column(String)
    status = Column(String, default="not_started")  # Using String instead of Enum for flexibility
    data = Column(JSON)  # Store phase-specific data
    ai_confidence_score = Column(Integer, default=0)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    estimated_hours = Column(Integer)
    actual_hours = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    project = relationship("Project", back_populates="phases")
    approvals = relationship("Approval", back_populates="phase")
    # workflows = relationship("AutomationWorkflow", back_populates="phase")

class Approval(Base):
    __tablename__ = "approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("phases.id"))
    approver_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")  # Using String instead of Enum for flexibility
    comments = Column(Text)
    approved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    phase = relationship("Phase", back_populates="approvals")
    approver = relationship("User", back_populates="approvals")

class AIInteraction(Base):
    __tablename__ = "ai_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    phase_id = Column(Integer, ForeignKey("phases.id"))
    user_query = Column(Text)
    ai_response = Column(Text)
    confidence_score = Column(Integer)
    accepted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Phase5Deliverable(Base):
    """
    Persistence model for Phase 5 (Development) user story deliverables
    Stores generated code, tests, API endpoints, and README for each user story
    """
    __tablename__ = "phase5_deliverables"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    epic_id = Column(String, index=True)
    user_story_id = Column(String, index=True, unique=False)  # Composite index with project_id
    
    # Story metadata
    story_title = Column(String)
    story_description = Column(Text)
    
    # Code content - stored as JSON array with file objects
    code_content = Column(JSON)  # Array of {file, content, language}
    
    # Test content - stored as JSON array
    tests_content = Column(JSON)  # Array of {file, content, language}
    
    # API endpoints
    api_endpoints = Column(JSON)  # Array of {method, path, description}
    
    # README content
    readme_content = Column(Text)
    
    # Generation preferences
    language = Column(String)  # python, nodejs, typescript, java, go
    test_framework = Column(String)  # pytest, jest, etc.
    selected_components = Column(JSON)  # Array of component names used
    
    # Metadata
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    ai_enhanced = Column(Boolean, default=False)
    
    # Timestamps for tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GitHubIntegration(Base):
    """
    Stores GitHub integration details for a project
    Allows push/pull operations for generated code
    """
    __tablename__ = "github_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, index=True)
    
    # GitHub authentication
    github_token = Column(String)  # Encrypted token
    github_username = Column(String)
    github_org_name = Column(String, nullable=True)
    
    # Default repository
    default_repo_url = Column(String)  # https://github.com/owner/repo
    default_branch = Column(String, default="main")
    
    # Connection status
    is_connected = Column(Boolean, default=False)
    connection_error = Column(String, nullable=True)
    last_verified = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    project = relationship("Project")


class RepositoryMapping(Base):
    """
    Maps epics and user stories to specific GitHub repositories and branches
    Controls where generated code should be pushed
    """
    __tablename__ = "repository_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    epic_id = Column(String, index=True)
    user_story_id = Column(String, index=True, nullable=True)
    
    # Target repository
    repo_name = Column(String)  # e.g., "my-app" from https://github.com/owner/my-app
    repo_owner = Column(String)  # e.g., "owner"
    repo_full_url = Column(String)  # Full URL
    
    # Target branch strategy
    branch_name = Column(String)  # Auto-generated or manual: epic-2-auth/story-3-login
    auto_generate_branch = Column(Boolean, default=True)  # Use auto-generated naming
    
    # Folder structure
    target_folder = Column(String, default="")  # e.g., "src/modules/auth"
    
    # Configuration
    create_pr = Column(Boolean, default=True)  # Automatically create PR
    pr_template = Column(Text)  # Template for PR description
    
    # Status
    last_push_date = Column(DateTime(timezone=True))
    last_push_commit = Column(String)  # Commit SHA
    last_push_status = Column(String)  # success, failed
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    project = relationship("Project")


class GitHubCommitHistory(Base):
    """
    Tracks all commits pushed to GitHub from TAO SDLC
    Used for audit trail and to prevent duplicate pushes
    """
    __tablename__ = "github_commit_history"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    epic_id = Column(String, index=True)
    user_story_id = Column(String, index=True)
    
    # Commit details
    repo_owner = Column(String)
    repo_name = Column(String)
    branch_name = Column(String)
    commit_sha = Column(String, unique=True, index=True)
    commit_message = Column(Text)
    
    # Files pushed
    files_count = Column(Integer)
    files_list = Column(JSON)  # Array of file paths
    
    # PR information
    pr_number = Column(Integer, nullable=True)
    pr_url = Column(String, nullable=True)
    
    # Status
    status = Column(String)  # success, partial, failed
    error_message = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    project = relationship("Project")



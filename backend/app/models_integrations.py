from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class IntegrationConfig(Base):
    __tablename__ = "integration_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    integration_type = Column(String)  # jira, github, confluence, slack, etc.
    config = Column(JSON)  # Store integration-specific configuration
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AutomationWorkflow(Base):
    __tablename__ = "automation_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    phase_id = Column(Integer, ForeignKey("phases.id"))
    workflow_name = Column(String)
    workflow_type = Column(String)  # code_generation, test_generation, deployment, etc.
    trigger_event = Column(String)
    config = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # phase = relationship("Phase", back_populates="workflows")

class IntegrationLog(Base):
    __tablename__ = "integration_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    integration_type = Column(String)
    action = Column(String)
    status = Column(String)
    request_data = Column(JSON)
    response_data = Column(JSON)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


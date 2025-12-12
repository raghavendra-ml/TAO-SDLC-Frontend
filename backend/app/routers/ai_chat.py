"""
Enhanced AI Chat Assistant for All Phases
Supports FAQs, data queries, and phase-specific guidance including Phase 5 development tasks
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import json
from openai import AsyncOpenAI

from app.database import get_db
from app import models
from app.services.file_modification_service import FileModificationService
from app.services.simple_todo_service import SimpleTODOService

router = APIRouter(tags=["Enhanced AI Chat"])

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Phase 1 FAQs
PHASE1_FAQS = {
    "what_is_phase1": {
        "question": "What is Phase 1?",
        "answer": """Phase 1 is the Requirements & Business Analysis phase where you:
- Collect requirements through manual input or document upload
- Extract structured requirements with AI
- Identify stakeholders and their roles
- Analyze risks and mitigation strategies
- Generate PRD (Product Requirements Document)
- Generate BRD (Business Requirements Document)
- Set up approval workflows"""
    },
    "how_to_add_requirements": {
        "question": "How do I add requirements?",
        "answer": """You can add requirements in two ways:

1. **Manual Input**: Click '+ Add Manual Requirement' button, enter your requirement text (can be brief like 'user management system'), then click 'Extract with AI'. The AI will generate comprehensive requirements with objectives, steps, and summary.

2. **Document Upload**: Click 'Upload Documents', select Excel/Word/Text/CSV files containing requirements, then click 'Extract Requirements with AI'. The system will process and extract structured requirements."""
    },
    "requirement_format": {
        "question": "What format are requirements in?",
        "answer": """Requirements are in a structured format with:
- **Objective**: What needs to be built (1-2 sentences)
- **Requirements**: Detailed implementation steps (Step 1, Step 2, etc.)
- **Summary**: 2-line overview of all requirements
- **Priority**: Critical/High/Medium/Low
- **Category**: Functional/Integration/Security/Performance/UI/UX

The AI automatically generates 5-15 detailed steps based on your input."""
    },
    "how_to_edit": {
        "question": "How do I edit requirements?",
        "answer": """You can edit requirements through chat! Just tell me what you want to change:
- "Change the description of requirement 1"
- "Make the requirements shorter"
- "Optimize requirements to 5 steps"
- "Merge requirements 1 and 2"
- "Refine the user management requirement"

I'll update the requirements based on your instructions."""
    },
    "generate_brd_prd": {
        "question": "How do I generate BRD/PRD?",
        "answer": """To generate BRD or PRD:
1. First, add requirements in the Requirements Collection section
2. Extract them with AI
3. Scroll down to the BRD or PRD section
4. Click 'Generate with AI' button

The AI will create comprehensive documents based on your extracted requirements, not random content. The documents will include actual objectives, implementation steps, and business value from your requirements."""
    },
    "what_is_brd": {
        "question": "What is BRD?",
        "answer": """BRD (Business Requirements Document) focuses on:
- Executive Summary - business case and benefits
- Business Objectives - what the business wants to achieve
- Business Requirements - capabilities needed
- Scope - what's in and out of scope
- Success Criteria - how to measure success
- ROI and business value

It's written for business stakeholders to understand the 'why' and 'what' of the project."""
    },
    "what_is_prd": {
        "question": "What is PRD?",
        "answer": """PRD (Product Requirements Document) focuses on:
- Product Overview - what's being built
- User Personas - who will use it
- Feature Requirements - detailed features
- Functional Requirements - how it should work
- Non-Functional Requirements - performance, security, etc.
- Technical Considerations - architecture, integrations
- Success Metrics - KPIs to track

It's written for product managers and development teams to understand the 'how' and technical details."""
    },
    "add_stakeholders": {
        "question": "How do I add stakeholders?",
        "answer": """To add stakeholders:
1. Click 'Select from Database' to choose from existing stakeholders
2. Or manually add by entering Role and Name
3. Stakeholders can be: Project Manager, Business Analyst, Developer, Tester, Product Owner, etc.

Stakeholders are important for approval workflows and project communication."""
    },
    "analyze_risks": {
        "question": "How do I analyze risks?",
        "answer": """Click the 'Analyze Risks with AI' button in the Risks section. The AI will:
- Analyze your requirements
- Identify potential technical, business, and operational risks
- Provide severity levels (High/Medium/Low)
- Suggest mitigation strategies for each risk
- Consider dependencies and constraints

You can also manually add risks if you identify specific concerns."""
    },
    "approval_workflow": {
        "question": "What is the approval workflow?",
        "answer": """The approval workflow has 4 steps:
1. Requirements Collected - Initial data gathering
2. PRD & BRD Created - Documents generated
3. Awaiting Approvals - Stakeholders review
4. Approved - Phase complete, ready for Phase 2

You need to complete requirements and generate documents before submitting for approval."""
    }
}

# Phase 5 FAQs for Development
PHASE5_FAQS = {
    "what_is_phase5": {
        "question": "What is Phase 5?",
        "answer": """Phase 5 is the Development phase where you:
- Select epics and user stories for implementation
- Choose system components to develop
- Set development preferences (language, testing framework)
- Generate code deliverables (Code, Tests, API, README)
- Use AI Enhancement to improve code quality
- Implement TODO items with specific code
- Create production-ready development artifacts"""
    },
    "how_to_generate_deliverables": {
        "question": "How do I generate deliverables?",
        "answer": """To generate development deliverables:

1. **Select Epic & User Story**: Choose from available epics and user stories from Phase 2
2. **Pick Components**: Select relevant system components from Phase 3 architecture
3. **Set Preferences**: Choose your development preferences:
   - Language: Python, Node.js, etc.
   - Testing: pytest, jest, etc.
   - Authentication: JWT, OAuth, etc.
4. **Generate**: Click 'Generate Deliverables' to create:
   - Code files with implementations
   - Test files with unit tests
   - API specifications
   - README documentation
5. **AI Enhance**: Use AI enhancement to improve code quality and complete TODOs"""
    },
    "todo_implementation": {
        "question": "How do I implement TODO items?",
        "answer": """I can help you implement specific TODO items with actual code! 

**Just tell me:**
- What type of TODO: "authentication", "database", "API endpoint", "error handling"
- Specific context: "JWT token validation", "user creation", "password hashing"
- File details if you have them: "auth.py line 45", "models.py"

**I'll provide complete, working code implementations that you can copy-paste directly into your files.**

**Examples:**
- "Help with authentication TODO" → Complete JWT implementation
- "Database connection TODO" → Full database setup code  
- "API endpoint TODO" → Complete FastAPI route implementation
- "Error handling TODO" → Comprehensive exception handling

What specific TODO are you working on?"""
    },
    "ai_enhance": {
        "question": "What does AI Enhancement do?",
        "answer": """AI Enhancement improves your generated code by:

**Code Quality Improvements:**
- Completes all TODO comments with proper implementations
- Adds comprehensive error handling and validation
- Improves code structure and follows best practices
- Adds proper logging and monitoring
- Optimizes performance and security

**Documentation:**
- Adds detailed docstrings and comments
- Creates comprehensive README files
- Generates API documentation
- Adds inline code explanations

**Testing:**
- Enhances test coverage
- Adds edge case testing
- Creates integration tests
- Adds test fixtures and mocks

**How to use:** Generate initial deliverables first, then click 'AI Enhance' to get production-ready code."""
    },
    "development_workflow": {
        "question": "What's the development workflow?",
        "answer": """Phase 5 Development Workflow:

**1. Planning & Selection**
- Review epics and user stories from Phase 2
- Select components from Phase 3 architecture
- Choose development preferences

**2. Generation**
- Generate initial code deliverables
- Review generated files (Code, Tests, API, README)
- Check TODO items that need implementation

**3. Implementation**
- Ask AI for help with specific TODO items
- Get actual code implementations
- Copy-paste working solutions

**4. Enhancement**
- Use AI Enhancement for production-ready code
- Review improved implementations
- Test enhanced deliverables

**5. Iteration**
- Generate deliverables for additional user stories
- Continuously improve with AI assistance
- Build comprehensive project codebase"""
    }
}
PHASE5_FAQS = {
    "what_is_phase5": {
        "question": "What is Phase 5?",
        "answer": """Phase 5 is the Development phase where you:
- Generate development deliverables for user stories
- Create code files, tests, API endpoints, and documentation
- Work with specific epics and user stories from Phase 2
- Map components from Phase 3 architecture
- Choose development preferences (language, testing framework, etc.)
- AI-enhance code for better quality and completeness"""
    },
    "how_to_generate_deliverables": {
        "question": "How do I generate development deliverables?",
        "answer": """To generate deliverables:
1. **Select Epic**: Choose from Phase 2 epics
2. **Select User Story**: Pick a specific story to implement
3. **Choose Components**: Select relevant system components from Phase 3
4. **Set Preferences**: Configure language (Python/Node.js), tests (pytest/jest), auth type
5. **Click Generate**: AI creates code, tests, API endpoints, and README

The AI will generate comprehensive development artifacts based on your selections."""
    },
    "what_are_deliverables": {
        "question": "What deliverables are generated?",
        "answer": """Phase 5 generates 4 types of deliverables:
- **Code**: Implementation files with complete business logic
- **Tests**: Unit tests with comprehensive test cases
- **API**: REST endpoints with proper request/response handling  
- **README**: Documentation with setup instructions and usage guides

Each deliverable is tailored to your selected user story and technical preferences."""
    },
    "how_to_fill_todos": {
        "question": "How do I fill TODO items?",
        "answer": """To handle TODO items in your code:
1. **Identify TODOs**: Look for `# TODO:` or `// TODO:` comments in generated code
2. **Ask Specific Questions**: Use this chat to ask about specific TODO items
   - "Fill the TODO in authentication.py line 45"
   - "How do I implement the user validation TODO?"
   - "Complete the database connection TODO"
3. **Get AI Help**: I can provide specific implementation details for each TODO
4. **Enhance with AI**: Use the "AI Enhance" button to automatically improve code quality

Be specific about which file and TODO you need help with!"""
    },
    "ai_enhance_code": {
        "question": "What does AI Enhance do?",
        "answer": """AI Enhance analyzes your generated deliverables and:
- Improves code structure and readability
- Adds missing error handling and validation
- Completes TODO items with proper implementations
- Adds comprehensive documentation and comments
- Optimizes performance and security
- Ensures best practices and coding standards

Use it after initial generation to get production-ready code."""
    },
    "development_workflow": {
        "question": "What's the development workflow?",
        "answer": """Phase 5 Development Workflow:
1. **Epic Selection** - Choose business capability to implement
2. **Story Selection** - Pick specific user story
3. **Component Mapping** - Select relevant architecture components
4. **Preference Setting** - Configure tech stack preferences
5. **Generation** - AI creates initial deliverables
6. **Enhancement** - Use AI Enhance for code improvement
7. **TODO Completion** - Fill remaining TODO items via chat
8. **Testing** - Review generated tests and run them
9. **Documentation** - Check README for deployment instructions"""
    }
}

class ChatQuery(BaseModel):
    query: str
    context_type: str = "project"
    project_id: Optional[int] = None
    phase_id: Optional[int] = None
    conversation_history: List[Dict[str, str]] = []
    enhanced_context: Optional[Dict[str, Any]] = {}

class ChatResponse(BaseModel):
    response: str
    confidence_score: int
    sources: List[str]
    action: Optional[str] = None
    action_data: Optional[Dict[str, Any]] = None

class CodeModificationRequest(BaseModel):
    project_id: int
    phase_id: int
    story_id: str
    file_name: str
    instruction: str
    selected_text: Optional[str] = ""
    context: Optional[Dict[str, Any]] = {}

class CodeModificationResponse(BaseModel):
    success: bool
    message: str
    modified_code: Optional[str] = None
    file_name: Optional[str] = None

class TODOImplementationRequest(BaseModel):
    project_id: int
    phase_id: int
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    todo_description: str

class TODOImplementationResponse(BaseModel):
    success: bool
    message: str
    implementation: Optional[str] = None
    modified_files: List[str] = []

class CodeAnalysisRequest(BaseModel):
    prompt: str
    file_name: str
    file_path: str
    code_content: str

class CodeAnalysisResponse(BaseModel):
    success: bool
    message: str
    analysis: Optional[str] = None

class FindTODOsRequest(BaseModel):
    project_id: int
    phase_id: int

class TODOInfo(BaseModel):
    file_path: str
    relative_path: str
    line_number: int
    content: str
    context: Dict[str, Any]

class FindTODOsResponse(BaseModel):
    todos: List[TODOInfo]
    total_count: int

def get_phase1_context(db: Session, project_id: int, phase_id: int) -> Dict[str, Any]:
    """Get Phase 1 context from database"""
    try:
        # Get phase data
        phase = db.query(models.Phase).filter(
            models.Phase.id == phase_id,
            models.Phase.project_id == project_id
        ).first()
        
        if not phase:
            return {}
        
        # Get project
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        
        # Parse phase data
        phase_data = phase.data or {}
        
        requirements = phase_data.get('gherkinRequirements', [])
        stakeholders = phase_data.get('stakeholders', [])
        risks = phase_data.get('risks', [])
        
        # Add new comprehensive fields
        business_proposal = phase_data.get('businessProposal', {})
        risks_categorized = phase_data.get('risksCategorized', {})
        stakeholders_extracted = phase_data.get('stakeholdersExtracted', [])
        ai_notes = phase_data.get('aiNotes', '')

        context = {
            "project_name": project.name if project else "Unknown",
            "project_description": project.description if project else "",
            "phase_number": phase.phase_number,
            "phase_status": phase.status,
            "requirements_count": len(requirements),
            "requirements": requirements,
            "stakeholders_count": len(stakeholders) + len(stakeholders_extracted), # Combine counts
            "stakeholders": stakeholders + stakeholders_extracted, # Combine lists
            "risks_count": len(risks) + (len(risks_categorized) if isinstance(risks_categorized, dict) else 0),
            "risks": risks,
            "risks_categorized": risks_categorized,
            "has_prd": bool(phase_data.get('prd')),
            "has_brd": bool(phase_data.get('brd')),
            "business_proposal": business_proposal,
            "ai_notes": ai_notes
        }
        
        return context
    except Exception as e:
        print(f"Error getting context: {e}")
        return {}

def get_phase5_context(db: Session, project_id: int, phase_id: int) -> Dict[str, Any]:
    """Get Phase 5 context from database"""
    try:
        # Get phase data
        phase = db.query(models.Phase).filter(
            models.Phase.id == phase_id,
            models.Phase.project_id == project_id
        ).first()
        
        if not phase:
            return {}
        
        # Get project
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        
        # Get Phase 2 (epics/stories) and Phase 3 (architecture) for context
        phase2 = db.query(models.Phase).filter(
            models.Phase.project_id == project_id,
            models.Phase.phase_number == 2
        ).first()
        
        phase3 = db.query(models.Phase).filter(
            models.Phase.project_id == project_id,
            models.Phase.phase_number == 3
        ).first()
        
        # Parse phase data
        phase_data = phase.data or {}
        phase2_data = phase2.data if phase2 else {}
        phase3_data = phase3.data if phase3 else {}
        
        deliverables = phase_data.get('user_story_development', {})
        epics = phase2_data.get('epics', [])
        user_stories = phase2_data.get('userStories', [])
        architecture = phase3_data.get('architecture', {})
        components = architecture.get('system_components', [])

        context = {
            "project_name": project.name if project else "Unknown",
            "project_description": project.description if project else "",
            "phase_number": phase.phase_number,
            "phase_status": phase.status,
            "epics_count": len(epics),
            "epics": epics,
            "user_stories_count": len(user_stories),
            "user_stories": user_stories,
            "components_count": len(components),
            "components": components,
            "deliverables_count": len(deliverables),
            "deliverables": deliverables,
            "has_code": any(d.get('code') for d in deliverables.values()),
            "has_tests": any(d.get('tests') for d in deliverables.values()),
            "has_api": any(d.get('api') for d in deliverables.values()),
            "has_readme": any(d.get('readme') for d in deliverables.values())
        }
        
        return context
    except Exception as e:
        print(f"Error getting Phase 5 context: {e}")
        return {}

def detect_intent(query: str, phase_id: Optional[int] = None) -> Dict[str, Any]:
    """Detect user intent from query with phase awareness"""
    query_lower = query.lower()
    
    # Phase 5 FAQ detection
    if phase_id == 5:
        for faq_id, faq in PHASE5_FAQS.items():
            if any(keyword in query_lower for keyword in faq["question"].lower().split()):
                return {"type": "phase5_faq", "faq_id": faq_id}
    
    # Phase 1 FAQ detection  
    for faq_id, faq in PHASE1_FAQS.items():
        if any(keyword in query_lower for keyword in faq["question"].lower().split()):
            return {"type": "faq", "faq_id": faq_id}
    
    # TODO-specific detection (enhanced for conversational patterns)
    todo_patterns = [
        "todo", "fill", "complete", "implement", "finish", "code", "help with",
        "authentication", "database", "api", "endpoint", "error handling",
        "jwt", "password", "user", "login", "signup", "crud", "connection",
        "model", "schema", "route", "handler", "validation", "exception"
    ]
    
    if any(pattern in query_lower for pattern in todo_patterns):
        # More specific TODO detection
        if any(word in query_lower for word in ["todo", "fill todo", "complete todo", "implement todo"]):
            return {"type": "todo_help", "subject": "todo_implementation"}
        elif any(word in query_lower for word in ["authentication", "auth", "jwt", "token", "password", "login"]):
            return {"type": "todo_help", "subject": "authentication"}
        elif any(word in query_lower for word in ["database", "db", "connection", "crud", "model", "schema"]):
            return {"type": "todo_help", "subject": "database"}
        elif any(word in query_lower for word in ["api", "endpoint", "route", "handler"]):
            return {"type": "todo_help", "subject": "api"}
        elif any(word in query_lower for word in ["error", "exception", "handling", "validation"]):
            return {"type": "todo_help", "subject": "error_handling"}
        else:
            return {"type": "todo_help", "subject": "todo_implementation"}
    
    # Phase 5 development queries
    if phase_id == 5:
        if any(word in query_lower for word in ["deliverable", "code", "generate", "enhancement"]):
            return {"type": "phase5_dev", "subject": "development"}
        if "enhance" in query_lower or "ai enhance" in query_lower:
            return {"type": "phase5_dev", "subject": "enhancement"}
    
    # Data query detection
    if any(word in query_lower for word in ["show", "list", "what are", "how many", "tell me"]):
        if "requirement" in query_lower:
            return {"type": "data_query", "subject": "requirements"}
        elif "stakeholder" in query_lower:
            return {"type": "data_query", "subject": "stakeholders"}
        elif "risk" in query_lower:
            return {"type": "data_query", "subject": "risks"}
        elif "business proposal" in query_lower or "vision" in query_lower or "goals" in query_lower:
            return {"type": "data_query", "subject": "business_proposal"}
        elif "ai notes" in query_lower or "assumptions" in query_lower:
            return {"type": "data_query", "subject": "ai_notes"}
        elif "status" in query_lower:
            return {"type": "data_query", "subject": "status"}
        elif phase_id == 5 and ("deliverable" in query_lower or "story" in query_lower or "epic" in query_lower):
            return {"type": "phase5_data", "subject": "deliverables"}
    
    # Requirement modification detection
    if any(word in query_lower for word in ["change", "update", "modify", "edit", "revise"]):
        return {"type": "modify_requirement", "action": "change"}
    
    if any(word in query_lower for word in ["optimize", "improve", "refine", "enhance"]):
        return {"type": "modify_requirement", "action": "optimize"}
    
    if any(word in query_lower for word in ["shorten", "reduce", "simplify", "condense"]):
        return {"type": "modify_requirement", "action": "shorten"}
    
    if any(word in query_lower for word in ["merge", "combine", "consolidate"]):
        return {"type": "modify_requirement", "action": "merge"}
    
    if any(word in query_lower for word in ["split", "break", "divide"]):
        return {"type": "modify_requirement", "action": "split"}
    
    # General guidance
    return {"type": "general", "subject": None}

@router.post("/query", response_model=ChatResponse)
async def chat_query(
    chat_query: ChatQuery,
    db: Session = Depends(get_db)
):
    """
    Enhanced AI chat endpoint with FAQ, data access, and requirement editing
    """
    try:
        query = chat_query.query
        
        # Detect intent with phase awareness
        intent = detect_intent(query, chat_query.phase_id)
        
        # Handle Phase 1 FAQ
        if intent["type"] == "faq":
            faq = PHASE1_FAQS[intent["faq_id"]]
            return ChatResponse(
                response=faq["answer"],
                confidence_score=100,
                sources=["Phase 1 FAQ"],
                action=None
            )
        
        # Handle Phase 5 FAQ
        if intent["type"] == "phase5_faq":
            faq = PHASE5_FAQS[intent["faq_id"]]
            return ChatResponse(
                response=faq["answer"],
                confidence_score=100,
                sources=["Phase 5 FAQ"],
                action=None
            )
        
        # Handle TODO-specific help
        if intent["type"] == "todo_help":
            subject = intent.get("subject", "todo_implementation")
            
            # Try to implement TODOs automatically if in Phase 5
            if chat_query.project_id and chat_query.phase_id == 5:
                try:
                    # Use the SimpleTODOService for actual TODO implementation
                    result = SimpleTODOService.find_and_replace_todos(
                        db, 
                        chat_query.project_id, 
                        chat_query.phase_id, 
                        query
                    )
                    
                    if result["success"]:
                        response_text = f"""✅ **TODO Implementation Complete!**

**{result.get('message', 'TODOs implemented successfully!')}**

**Modified Files:**
{chr(10).join(f'• {file}' for file in result.get('modified_files', []))}

**Implementation Applied:**
```python
{result.get('implementation', 'Implementation completed')}
```

**What was done:**
- Found TODO comments matching your request
- Replaced them with working code implementations  
- Updated the files in your project deliverables
- Saved changes to the database

**Next Steps:**
- Review the modified code in your deliverables
- Test the implementations
- Ask for help with any additional TODOs

The code has been **actually modified** in your project files! 🎉"""
                    else:
                        response_text = f"""🔍 **{result.get('message', 'No TODOs found')}**

**Generated Implementation for future use:**
```python
{result.get('implementation', 'No implementation generated')}
```

**To help me find and implement your TODOs:**
- Be more specific: "implement authentication TODO" or "database connection TODO"  
- Check if you have generated deliverables in Phase 5
- Make sure your TODO comments contain keywords like "authentication", "database", "validation"

**Available TODO Keywords:**
- Authentication/Auth/JWT/Login
- Database/DB/Connection/Query
- Validation/Validate/Check
- API/Endpoint/Route

{result.get('suggestion', 'Try asking for specific TODO implementations!')}"""
                    
                    return ChatResponse(
                        response=response_text,
                        confidence_score=100,
                        sources=["Phase 5 TODO Implementation Service"],
                        action="todo_implemented" if result["success"] else "todo_help"
                    )
                
                except Exception as e:
                    print(f"Error in TODO implementation: {e}")
                    # Fall back to providing code example
            
            # Provide specific implementations based on detected subject (fallback)
            if subject == "authentication" or "authentication" in query.lower() or "auth" in query.lower() or "jwt" in query.lower():
                response_text = """� **Authentication TODO Implementation**

Here's a complete JWT authentication implementation:

```python
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi import HTTPException, status

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, "your-secret-key", algorithm="HS256")
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, "your-secret-key", algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

**Need help with a specific auth TODO? Tell me the line number or specific requirement!**"""
            
            elif subject == "database" or "database" in query.lower() or "db" in query.lower() or "connection" in query.lower():
                response_text = """💾 **Database Connection TODO Implementation**

Here's a complete database setup implementation:

```python
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime

# Database Configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"  # Change as needed
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models Example
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CRUD Operations
def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_data: dict):
    db_user = User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
```

**Need help with specific database operations? Just ask!**"""
            
            elif subject == "error_handling" or "error" in query.lower() or "exception" in query.lower() or "handling" in query.lower():
                response_text = """⚠️ **Error Handling TODO Implementation**

Here's comprehensive error handling code:

```python
from fastapi import HTTPException, status
import logging
from typing import Any

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CustomException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

def handle_database_errors(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Database error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database operation failed"
            )
    return wrapper

def validate_input(data: dict, required_fields: list) -> dict:
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required fields: {', '.join(missing_fields)}"
        )
    return data

# API Error Handler Example
@app.exception_handler(CustomException)
async def custom_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "status": "error"}
    )
```

**Tell me about your specific error handling scenario!**"""
            
            elif subject == "api" or "api" in query.lower() or "endpoint" in query.lower() or "route" in query.lower():
                response_text = """🌐 **API Endpoint TODO Implementation**

Here's a complete API endpoint implementation:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1", tags=["API"])

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    
    class Config:
        orm_mode = True

# CRUD Endpoints
@router.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user.password)
    
    # Create user
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/users/", response_model=List[UserResponse])
async def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users
```

**What specific API endpoint do you need help with?**"""
            
            else:
                # Generic TODO help with more conversational approach
                response_text = """🔧 **TODO Implementation Assistant**

I'm here to help you implement specific TODO items! I can provide complete code implementations for:

**🔐 Authentication & Security:**
- JWT token handling: `"help with JWT TODO"`
- Password hashing: `"implement password hashing"`
- User authentication: `"authentication TODO help"`

**💾 Database Operations:**
- Database connections: `"database connection TODO"`
- CRUD operations: `"user CRUD TODO"`
- Data models: `"database model TODO"`

**⚠️ Error Handling:**
- Exception handling: `"error handling TODO"`
- Input validation: `"validation TODO"`
- API error responses: `"API error TODO"`

**🌐 API Development:**
- REST endpoints: `"API endpoint TODO"`
- Request/response models: `"pydantic model TODO"`
- Route handlers: `"route handler TODO"`

**Instead of just "fill TODO", try being specific like:**
- "Help me implement the JWT authentication TODO"
- "Show me the database connection code for the TODO"
- "I need error handling for the user creation TODO"

**What specific TODO are you working on? Describe what you're trying to implement!**"""

            return ChatResponse(
                response=response_text,
                confidence_score=100,
                sources=["Phase 5 Development Assistant"],
                action=None
            )
        
        # Handle Phase 5 development queries
        if intent["type"] == "phase5_dev":
            if intent["subject"] == "development":
                response_text = """🚀 **Phase 5 Development Assistant**

**Current Process:**
1. Select Epic → User Story → Components
2. Set preferences (Python/Node.js, testing framework)
3. Generate deliverables (Code, Tests, API, README)
4. AI Enhance for production-ready code

**Need Help With:**
- "How do I select components for my story?"
- "What preferences should I choose?"
- "Show me the generated deliverables"
- "How do I AI enhance my code?"

What specific development task can I help you with?"""
            elif intent["subject"] == "enhancement":
                response_text = """✨ **AI Enhancement Help**

**AI Enhance improves your code by:**
- Completing TODO items with proper implementations
- Adding error handling and validation
- Improving code structure and readability
- Adding comprehensive documentation
- Optimizing performance and security

**How to use:**
1. Generate initial deliverables
2. Click "AI Enhance" button
3. Wait for enhanced version
4. Review improvements

Want help with a specific enhancement or code improvement?"""
            
            return ChatResponse(
                response=response_text,
                confidence_score=100,
                sources=["Phase 5 Development Assistant"],
                action=None
            )
        
        # Get context if project/phase provided
        context = {}
        if chat_query.project_id and chat_query.phase_id:
            if chat_query.phase_id == 5:
                context = get_phase5_context(db, chat_query.project_id, chat_query.phase_id)
            else:
                context = get_phase1_context(db, chat_query.project_id, chat_query.phase_id)
        
        # Handle data queries
        if intent["type"] == "data_query":
            if intent["subject"] == "requirements":
                count = context.get("requirements_count", 0)
                requirements = context.get("requirements", [])
                
                if count == 0:
                    response_text = "📋 You haven't added any requirements yet.\n\n"
                    response_text += "**What should you do?**\n"
                    response_text += "- Click '+ Add Manual Requirement' and enter your requirement (e.g., 'user management system')\n"
                    response_text += "- Or click 'Upload Documents' to extract requirements from files\n"
                    response_text += "- After inputting, click 'Extract with AI' to process\n\n"
                    response_text += "Try saying: 'I want to implement a user management system'"
                else:
                    response_text = f"📋 You have **{count} requirement(s)**:\n\n"
                    for idx, req in enumerate(requirements[:5], 1):
                        objective = req.get('objective', req.get('feature', 'Requirement'))
                        priority = req.get('priority', 'Medium')
                        response_text += f"**{idx}. {objective}**\n"
                        response_text += f"   • Priority: {priority}\n"
                        if req.get('summary'):
                            summary = req['summary'][:100] + '...' if len(req['summary']) > 100 else req['summary']
                            response_text += f"   • {summary}\n"
                        response_text += "\n"
                    if count > 5:
                        response_text += f"... and {count - 5} more requirements.\n"
                
                return ChatResponse(
                    response=response_text,
                    confidence_score=100,
                    sources=["Database"],
                    action=None
                )
            
            elif intent["subject"] == "business_proposal":
                business_proposal = context.get("business_proposal", {})
                
                if not business_proposal or not business_proposal.get("Title"):
                    response_text = "📝 No Business Proposal or Vision & Goals found yet.\n\n"
                    response_text += "**What should you do?**\n"
                    response_text += "- Extract requirements from manual input or uploaded documents using 'Extract with AI'. The AI will automatically generate these details.\n\n"
                    response_text += "Try saying: 'Tell me about the business proposal'"
                else:
                    response_text = f"📝 **Business Proposal / Vision & Goals for {business_proposal.get('Title', 'Project')}**:\n\n"
                    if business_proposal.get("ProblemToSolve"):
                        response_text += f"**Problem to Solve**: {business_proposal['ProblemToSolve']}\n"
                    if business_proposal.get("Vision"):
                        response_text += f"**Vision**: {business_proposal['Vision']}\n"
                    if business_proposal.get("Goals"):
                        response_text += "**Goals**:\n"
                        for idx, goal in enumerate(business_proposal['Goals'], 1):
                            response_text += f"{idx}. {goal}\n"
                    if business_proposal.get("SuccessMetrics"):
                        response_text += "\n**Success Metrics**:\n"
                        for idx, metric in enumerate(business_proposal['SuccessMetrics'], 1):
                            response_text += f"{idx}. {metric}\n"
                    if business_proposal.get("Scope"):
                        scope = business_proposal['Scope']
                        response_text += "\n**Scope**:\n"
                        if scope.get("In-scope"):
                            response_text += "- **In-scope**:\n"
                            for item in scope['In-scope']:
                                response_text += f"  • {item}\n"
                        if scope.get("Out-of-scope"):
                            response_text += "- **Out-of-scope**:\n"
                            for item in scope['Out-of-scope']:
                                response_text += f"  • {item}\n"
                        if scope.get("IntegrationDetails"):
                            response_text += f"- **Integration Details**: {scope['IntegrationDetails']}\n"
                    if business_proposal.get("Risks"):
                        response_text += "\n**Categorized Risks (from Proposal)**:\n"
                        for category, description in business_proposal['Risks'].items():
                            response_text += f"- {category.replace('([A-Z])/g', ' $1').strip()}: {description}\n"
                    if business_proposal.get("Stakeholders"):
                        response_text += "\n**Stakeholders (from Proposal)**:\n"
                        for stakeholder in business_proposal['Stakeholders']:
                            role = stakeholder.get('Role', stakeholder.get('role'))
                            name = stakeholder.get('Name', stakeholder.get('name'))
                            if role and name:
                                response_text += f"- **{role}**: {name}\n"
                            elif role:
                                response_text += f"- **{role}**\n"

                return ChatResponse(
                    response=response_text,
                    confidence_score=100,
                    sources=["Database"],
                    action=None
                )
            
            elif intent["subject"] == "stakeholders":
                count = context.get("stakeholders_count", 0)
                stakeholders = context.get("stakeholders", [])
                
                if count == 0:
                    response_text = "👥 No stakeholders added yet.\n\n"
                    response_text += "**What should you do?**\n"
                    response_text += "- Click 'Select from Database' to choose existing stakeholders\n"
                    response_text += "- Or click '+ Add Custom Stakeholder' to add manually\n\n"
                    response_text += "Stakeholders are crucial for the approval workflow!"
                else:
                    response_text = f"👥 You have **{count} stakeholder(s)**:\n\n"
                    for stakeholder in stakeholders:
                        response_text += f"• **{stakeholder.get('role')}**: {stakeholder.get('name')}\n"
                
                return ChatResponse(
                    response=response_text,
                    confidence_score=100,
                    sources=["Database"],
                    action=None
                )
            
            elif intent["subject"] == "risks":
                count = context.get("risks_count", 0)
                risks = context.get("risks", []) # Legacy risks
                risks_categorized = context.get("risks_categorized", {}) # New categorized risks
                
                if (count == 0 or (len(risks) == 0 and len(risks_categorized) == 0)):
                    response_text = "⚠️ No risks identified yet.\n\n"
                    response_text += "**What should you do?**\n"
                    response_text += "- Click 'Analyze Risks with AI' in the Risks section to automatically identify risks from your requirements\n"
                    response_text += "- Or manually add risks if you have specific concerns\n\n"
                    response_text += "Identifying risks early helps in better project planning!"
                else:
                    response_text = f"⚠️ **{count} risk(s)** identified:\n\n"
                    
                    if risks_categorized and isinstance(risks_categorized, dict):
                        response_text += "**Categorized Risks:**\n"
                        for category, description in risks_categorized.items():
                            response_text += f"• **{category.replace('([A-Z])/g', ' $1').strip()}**: {description}\n"
                        response_text += "\n"

                    if risks:
                        response_text += "**Legacy Risks:**\n"
                        for risk in risks[:5]:
                            response_text += f"• **{risk.get('risk')}**\n"
                            response_text += f"  Severity: {risk.get('severity')}\n"
                            response_text += f"  Mitigation: {risk.get('mitigation', 'TBD')}\n\n"
                
                return ChatResponse(
                    response=response_text,
                    confidence_score=100,
                    sources=["Database"],
                    action=None
                )
            
            elif intent["subject"] == "ai_notes":
                ai_notes = context.get("ai_notes", '')
                
                if not ai_notes:
                    response_text = "🧠 No AI Notes or Inferred Assumptions found yet.\n\n"
                    response_text += "**What should you do?**\n"
                    response_text += "- Extract requirements from manual input or uploaded documents using 'Extract with AI'. The AI will automatically generate these notes based on its inferences.\n\n"
                    response_text += "Try saying: 'What are the AI notes?'"
                else:
                    response_text = f"🧠 **AI Notes / Inferred Assumptions**:\n\n{ai_notes}\n"
                
                return ChatResponse(
                    response=response_text,
                    confidence_score=100,
                    sources=["Database"],
                    action=None
                )
            
            elif intent["subject"] == "status":
                phase_status = context.get("phase_status", "draft")
                has_prd = context.get("has_prd", False)
                has_brd = context.get("has_brd", False)
                req_count = context.get("requirements_count", 0)
                
                response_text = f"📊 **Phase 1 Status**: {phase_status.upper()}\n\n"
                response_text += f"✅ Requirements: {req_count} collected\n"
                response_text += f"{'✅' if has_prd else '❌'} PRD: {'Generated' if has_prd else 'Not generated yet'}\n"
                response_text += f"{'✅' if has_brd else '❌'} BRD: {'Generated' if has_brd else 'Not generated yet'}\n\n"
                
                if req_count == 0:
                    response_text += "**Next Steps:**\n1. Add requirements\n2. Extract with AI\n3. Generate PRD and BRD"
                elif not has_prd or not has_brd:
                    response_text += "**Next Steps:**\n1. Generate PRD (scroll to PRD section)\n2. Generate BRD (scroll to BRD section)\n3. Submit for approval"
                else:
                    response_text += "**Next Steps:**\nSubmit for approval when ready!"
                
                return ChatResponse(
                    response=response_text,
                    confidence_score=100,
                    sources=["Database"],
                    action=None
                )
        
        # Handle Phase 5 data queries
        if intent["type"] == "phase5_data":
            if intent["subject"] == "deliverables":
                deliverables = context.get("deliverables", {})
                deliverables_count = context.get("deliverables_count", 0)
                epics_count = context.get("epics_count", 0)
                user_stories_count = context.get("user_stories_count", 0)
                
                if deliverables_count == 0:
                    response_text = "🚀 **No deliverables generated yet.**\n\n"
                    response_text += "**To get started:**\n"
                    response_text += f"- You have {epics_count} epic(s) and {user_stories_count} user story(ies) available\n"
                    response_text += "- Select an epic and user story from the dropdowns\n"
                    response_text += "- Choose relevant system components\n"
                    response_text += "- Set your development preferences\n"
                    response_text += "- Click 'Generate Deliverables' to create code, tests, API, and README\n\n"
                    response_text += "Try asking: 'How do I generate deliverables?' or 'Show me available user stories'"
                else:
                    response_text = f"🚀 **You have {deliverables_count} deliverable(s) generated:**\n\n"
                    
                    for story_key, deliverable in deliverables.items():
                        if isinstance(deliverable, dict):
                            response_text += f"**{story_key}:**\n"
                            if deliverable.get('code'):
                                code_count = len(deliverable['code']) if isinstance(deliverable['code'], list) else 1
                                response_text += f"  • Code files: {code_count}\n"
                            if deliverable.get('tests'):
                                test_count = len(deliverable['tests']) if isinstance(deliverable['tests'], list) else 1
                                response_text += f"  • Test files: {test_count}\n"
                            if deliverable.get('api'):
                                api_endpoints = len(deliverable['api'].get('endpoints', [])) if isinstance(deliverable.get('api'), dict) else 0
                                response_text += f"  • API endpoints: {api_endpoints}\n"
                            if deliverable.get('readme'):
                                response_text += f"  • README: Generated\n"
                            response_text += "\n"
                    
                    response_text += "**Available actions:**\n"
                    response_text += "- Use AI Enhance to improve code quality\n"
                    response_text += "- Ask for help with specific TODO items\n"
                    response_text += "- Generate deliverables for more user stories"
                
                return ChatResponse(
                    response=response_text,
                    confidence_score=100,
                    sources=["Phase 5 Database"],
                    action=None
                )
        
        # Handle requirement modifications
        if intent["type"] == "modify_requirement":
            if context.get("requirements_count", 0) == 0:
                return ChatResponse(
                    response="❌ No requirements to modify. Please add requirements first.",
                    confidence_score=100,
                    sources=["System"],
                    action=None
                )
            
            # Extract which requirement to modify
            requirements = context.get("requirements", [])
            
            # Use AI to understand the modification request
            modification_prompt = f"""You are an AI assistant helping to modify requirements.

User's request: "{query}"

Current requirements:
{chr(10).join([f"{i+1}. {req.get('objective', req.get('feature', 'Requirement'))}" for i, req in enumerate(requirements[:10])])}

Based on the user's request, provide:
1. Which requirement(s) to modify (by number)
2. What modification to make
3. The modified requirement(s) in the same format

Respond in JSON format:
{{
  "requirement_indices": [0, 1, ...],
  "modification_type": "change|optimize|shorten|merge|split",
  "instructions": "Clear instructions on what to change",
  "preview": "Brief preview of the changes"
}}"""
            
            try:
                ai_response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a requirements analysis expert."},
                        {"role": "user", "content": modification_prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1000
                )
                
                import json
                modification_plan = json.loads(ai_response.choices[0].message.content or "{}")
                
                response_text = f"✅ I understand you want to {intent['action']} the requirements.\n\n"
                response_text += f"**Planned Changes:**\n{modification_plan.get('preview', 'Processing...')}\n\n"
                response_text += "**To apply these changes**, I'll need database write access. "
                response_text += "For now, I can show you what the changes would look like, and you can manually update them, "
                response_text += "or I can prepare a new version for you to review."
                
                return ChatResponse(
                    response=response_text,
                    confidence_score=85,
                    sources=["AI Analysis"],
                    action="modify_requirement",
                    action_data=modification_plan
                )
                
            except Exception as e:
                print(f"Error processing modification: {e}")
                return ChatResponse(
                    response=f"I understand you want to {intent['action']} requirements. Could you be more specific about which requirement(s) and what changes you'd like?",
                    confidence_score=70,
                    sources=["AI"],
                    action=None
                )
        
        # General AI response with context
        phase_number = context.get('phase_number', 1)
        
        if phase_number == 5:
            # Enhanced context from frontend
            enhanced_ctx = chat_query.enhanced_context or {}
            phase5_context = enhanced_ctx.get('phase5_context', {})
            has_code_context = enhanced_ctx.get('has_code_context', False)
            has_selection = enhanced_ctx.get('has_selection', False)
            cursor_info = enhanced_ctx.get('cursor_info', {})
            
            context_summary = f"""
Phase 5 Development Context:
- Project: {context.get('project_name', 'N/A')}
- Phase: Phase 5 - Development ({context.get('phase_status', 'draft')})
- Epics Available: {context.get('epics_count', 0)}
- User Stories: {context.get('user_stories_count', 0)}
- System Components: {context.get('components_count', 0)}
- Generated Deliverables: {context.get('deliverables_count', 0)}
- Has Code: {context.get('has_code', False)}
- Has Tests: {context.get('has_tests', False)}
- Has API: {context.get('has_api', False)}
- Has README: {context.get('has_readme', False)}

CURRENT USER CONTEXT:
- Current Story: {phase5_context.get('title', 'None')}
- Active File: {phase5_context.get('currentFile', 'None')}
- Language: {phase5_context.get('language', 'python')}
- Has Text Selection: {has_selection}
- Selected Text: {len(phase5_context.get('selectedText', ''))} characters
- User is viewing: {"Code section with selection" if has_selection else "Generated code file" if has_code_context else "Phase 5 interface"}
"""
            
            enhanced_ctx = chat_query.enhanced_context or {}
            phase5_context = enhanced_ctx.get('phase5_context', {})
            has_code_context = enhanced_ctx.get('has_code_context', False)
            has_selection = enhanced_ctx.get('has_selection', False)
            current_file = phase5_context.get('currentFile', '')
            selected_text = phase5_context.get('selectedText', '')
            
            system_message = f"""You are an AI Copilot for Phase 5 (Development) of an SDLC project. You are conversational, helpful, and focused on providing ACTUAL CODE IMPLEMENTATIONS.

IMPORTANT GUIDELINES:
1. ALWAYS provide specific, complete code implementations
2. When users ask about TODO items, show the actual code to fill them
3. Be conversational and ask follow-up questions to understand their needs better
4. Provide working code examples, not just explanations
5. Remember previous conversation context and build upon it
6. If something is unclear, ask specific clarifying questions
7. CONTEXT AWARENESS: You can see what file they're viewing and any selected text

YOUR CORE CAPABILITIES:
🔧 **TODO Implementation**: Provide complete, working code for any TODO item
🚀 **Development Guidance**: Help with deliverables, epics, user stories, components
💾 **Database Code**: Complete CRUD operations, models, connections
🔐 **Authentication**: Full JWT, password hashing, user management implementations
🌐 **API Development**: Complete FastAPI endpoints with proper error handling
⚠️ **Error Handling**: Comprehensive exception handling and validation
🧪 **Testing**: Unit tests, integration tests, test fixtures
✏️ **Code Modification**: Help modify specific code sections based on what they're viewing

CURRENT CONTEXT AWARENESS:
{f"- The user is currently viewing: {current_file}" if current_file else "- No specific file is currently active"}
{f"- They have selected {len(selected_text)} characters of code" if has_selection else ""}
{f"- Selected text: {selected_text[:200]}{'...' if len(selected_text) > 200 else ''}" if has_selection and selected_text else ""}

CONVERSATION STYLE:
- Be friendly and approachable
- When they have text selected or are viewing a specific file, reference that context
- Ask "What would you like to do with this code?" if they have a selection
- Provide complete code blocks that users can copy-paste
- Explain the code briefly but focus on implementation
- Remember what the user asked before and build on that context
- If they ask about "this code" or "this file", use the current context

PROJECT CONTEXT:
{context_summary}

CONTEXT-AWARE RESPONSES:
- If user says "explain this code" → Explain the selected text or current file
- If user says "modify this" → Offer specific modifications for the selection
- If user says "add error handling" → Add it to the current file context
- If user says "optimize this function" → Focus on the selected code

EXAMPLE RESPONSES:
- User: "explain this code" (with selection)
- You: "I can see you've selected [brief description of selected code]. This code [explanation]. Would you like me to optimize it, add error handling, or explain any specific part?"

Always provide ACTUAL CODE that solves their problem, not just guidance. Use their current context to be more helpful."""
            
            sources = ["AI Copilot", "Phase 5 Development Assistant"]
        else:
            context_summary = f"""
Project Context:
- Project: {context.get('project_name', 'N/A')}
- Phase: Phase {context.get('phase_number', 1)} - {context.get('phase_status', 'draft')}
- Requirements: {context.get('requirements_count', 0)}
- Stakeholders: {context.get('stakeholders_count', 0)}
- Risks: {context.get('risks_count', 0)}
- Categorized Risks (AI): {len(context.get('risks_categorized', {}))}
- Business Proposal: {context.get('business_proposal', {}).get('Title', 'N/A')} (Goals: {len(context.get('business_proposal', {}).get('Goals', []))})
- AI Notes: {'Present' if context.get('ai_notes') else 'N/A'}
- PRD Generated: {context.get('has_prd', False)}
- BRD Generated: {context.get('has_brd', False)}
"""
            
            system_message = f"""You are an AI Copilot for Phase 1 (Requirements & Business Analysis) of an SDLC project.

Your capabilities:
- Answer questions about Phase 1 processes
- Provide guidance on requirements gathering
- Explain BRD and PRD generation
- Help with stakeholder management
- Assist with risk analysis
- Give suggestions for next steps

Use the following project context to inform your responses:
{context_summary}

Be helpful, concise, and actionable. Use bullet points and emojis where appropriate."""
            
            sources = ["AI Copilot", "Phase 1 Knowledge Base"]
        
        # Prepare conversation history
        conversation_messages = [
            {"role": "system", "content": system_message}
        ]
        
        # Add conversation history
        for msg in chat_query.conversation_history[-5:]:
            conversation_messages.append(msg)
        
        # Add current query
        conversation_messages.append({"role": "user", "content": query})
        
        # Call OpenAI
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=conversation_messages,
            temperature=0.7,
            max_tokens=800
        )
        
        ai_response = response.choices[0].message.content or ""
        
        return ChatResponse(
            response=ai_response,
            confidence_score=80,
            sources=sources,
            action=None
        )
        
    except Exception as e:
        print(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@router.post("/find-todos", response_model=FindTODOsResponse)
async def find_todos(
    request: FindTODOsRequest,
    db: Session = Depends(get_db)
):
    """Find all TODO items in generated code files for a project"""
    try:
        # Get phase data to find generated files
        phase = db.query(models.Phase).filter(
            models.Phase.project_id == request.project_id,
            models.Phase.phase_number == request.phase_id
        ).first()
        
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        # For Phase 5, look for generated deliverables
        if request.phase_id == 5:
            phase_data = phase.data or {}
            deliverables = phase_data.get('user_story_development', {})
            
            todos = []
            file_service = FileModificationService()
            
            # Create temporary files from deliverables data for analysis
            import tempfile
            temp_dir = tempfile.mkdtemp()
            
            try:
                for story_key, deliverable in deliverables.items():
                    if isinstance(deliverable, dict) and deliverable.get('code'):
                        code_files = deliverable['code']
                        if isinstance(code_files, list):
                            for code_file in code_files:
                                if isinstance(code_file, dict):
                                    file_name = code_file.get('file', f'{story_key}.py')
                                    content = code_file.get('content', '')
                                    
                                    # Create temp file
                                    temp_file_path = os.path.join(temp_dir, file_name)
                                    with open(temp_file_path, 'w') as f:
                                        f.write(content)
                                    
                                    # Find TODOs in this file
                                    file_todos = file_service.extract_todos_from_file(temp_file_path)
                                    for todo in file_todos:
                                        todos.append(TODOInfo(
                                            file_path=f"deliverables/{story_key}/{file_name}",
                                            relative_path=f"{story_key}/{file_name}",
                                            line_number=todo['line_number'],
                                            content=todo['content'],
                                            context=todo['context']
                                        ))
                
                return FindTODOsResponse(
                    todos=todos,
                    total_count=len(todos)
                )
                
            finally:
                # Cleanup temp files
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
        
        # For other phases, return empty for now
        return FindTODOsResponse(todos=[], total_count=0)
        
    except Exception as e:
        print(f"Error finding TODOs: {e}")
        raise HTTPException(status_code=500, detail=f"Error finding TODOs: {str(e)}")

@router.post("/implement-todo", response_model=TODOImplementationResponse)
async def implement_todo(
    request: TODOImplementationRequest,
    db: Session = Depends(get_db)
):
    """Implement a specific TODO item with actual code"""
    try:
        # Get phase data
        phase = db.query(models.Phase).filter(
            models.Phase.project_id == request.project_id,
            models.Phase.phase_number == request.phase_id
        ).first()
        
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        file_service = FileModificationService()
        
        # Generate implementation based on TODO description
        implementation = file_service.generate_implementation_for_todo(
            request.todo_description,
            {},  # Context can be enhanced later
            'python'  # Default to Python
        )
        
        # For Phase 5, update the deliverables in the database
        if request.phase_id == 5:
            phase_data = phase.data or {}
            deliverables = phase_data.get('user_story_development', {})
            modified_files = []
            
            if request.file_path and request.line_number:
                # Parse file path to find the correct deliverable and file
                path_parts = request.file_path.split('/')
                if len(path_parts) >= 2 and path_parts[0] == 'deliverables':
                    story_key = path_parts[1]
                    file_name = path_parts[2] if len(path_parts) > 2 else 'main.py'
                    
                    if story_key in deliverables:
                        deliverable = deliverables[story_key]
                        if isinstance(deliverable, dict) and deliverable.get('code'):
                            code_files = deliverable['code']
                            if isinstance(code_files, list):
                                for i, code_file in enumerate(code_files):
                                    if isinstance(code_file, dict) and code_file.get('file') == file_name:
                                        # Update the file content with TODO implementation
                                        content = code_file.get('content', '')
                                        lines = content.split('\n')
                                        
                                        if request.line_number <= len(lines):
                                            # Replace TODO line with implementation
                                            todo_line = lines[request.line_number - 1]
                                            if 'TODO' in todo_line:
                                                # Get indentation
                                                indentation = len(todo_line) - len(todo_line.lstrip())
                                                indent_str = ' ' * indentation
                                                
                                                # Format implementation
                                                impl_lines = implementation.split('\n')
                                                formatted_impl = []
                                                for impl_line in impl_lines:
                                                    if impl_line.strip():
                                                        formatted_impl.append(indent_str + impl_line)
                                                    else:
                                                        formatted_impl.append('')
                                                
                                                # Replace the TODO line
                                                lines[request.line_number - 1:request.line_number] = formatted_impl
                                                
                                                # Update content
                                                code_file['content'] = '\n'.join(lines)
                                                modified_files.append(request.file_path)
                                                
                                                # Save back to database
                                                phase.data = phase_data
                                                db.commit()
                                                
                                                break
            
            return TODOImplementationResponse(
                success=True,
                message=f"TODO implemented successfully in {len(modified_files)} file(s)",
                implementation=implementation,
                modified_files=modified_files
            )
        
        # For other phases or when no specific file is provided, just return the implementation
        return TODOImplementationResponse(
            success=True,
            message="Implementation generated (no files modified - Phase 5 required for file modification)",
            implementation=implementation,
            modified_files=[]
        )
        
    except Exception as e:
        print(f"Error implementing TODO: {e}")
        return TODOImplementationResponse(
            success=False,
            message=f"Error implementing TODO: {str(e)}",
            implementation=None,
            modified_files=[]
        )

@router.post("/quick-todo", response_model=dict)
def quick_implement_todo(
    project_id: int,
    phase_id: int,
    query: str,
    db: Session = Depends(get_db)
):
    """
    Quick TODO implementation without complex ORM handling
    """
    try:
        result = SimpleTODOService.find_and_replace_todos(db, project_id, phase_id, query)
        return result
    except Exception as e:
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }

@router.post("/modify-code", response_model=CodeModificationResponse)
async def modify_code(
    request: CodeModificationRequest,
    db: Session = Depends(get_db)
):
    """
    Modify specific code sections based on user instructions and context
    """
    try:
        # Debug: Log the received request in detail
        print(f"[DEBUG] ===== CODE MODIFICATION REQUEST =====")
        print(f"[DEBUG] Request type: {type(request)}")
        print(f"[DEBUG] Request dict: {request.model_dump()}")
        print(f"[DEBUG] Project ID: {request.project_id} (type: {type(request.project_id)})")
        print(f"[DEBUG] Phase ID: {request.phase_id} (type: {type(request.phase_id)})")
        print(f"[DEBUG] Story ID: {request.story_id} (type: {type(request.story_id)})")
        print(f"[DEBUG] File: {request.file_name} (type: {type(request.file_name)})")
        print(f"[DEBUG] Instruction: {request.instruction}")
        print(f"[DEBUG] Selected text: {request.selected_text}")
        print(f"[DEBUG] Context: {request.context}")
        print(f"[DEBUG] =======================================")
        
        # Get phase data
        phase = db.query(models.Phase).filter(
            models.Phase.project_id == request.project_id,
            models.Phase.phase_number == request.phase_id
        ).first()
        
        print(f"[DEBUG] Phase query result: {phase}")
        if phase:
            print(f"[DEBUG] Phase ID: {phase.id}, Phase number: {phase.phase_number}, Project ID: {phase.project_id}")
        else:
            print(f"[DEBUG] No phase found for project {request.project_id} and phase number {request.phase_id}")
        
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        phase_data = phase.data or {}
        deliverables = phase_data.get('user_story_development', {})
        
        if request.story_id not in deliverables:
            return CodeModificationResponse(
                success=False,
                message=f"Story {request.story_id} not found in deliverables"
            )
        
        deliverable = deliverables[request.story_id]
        if not isinstance(deliverable, dict) or not deliverable.get('code'):
            return CodeModificationResponse(
                success=False,
                message="No code files found for this story"
            )
        
        # Find the specific file
        code_files = deliverable['code']
        target_file = None
        target_index = -1
        
        for i, code_file in enumerate(code_files):
            if isinstance(code_file, dict) and code_file.get('file') == request.file_name:
                target_file = code_file
                target_index = i
                break
        
        if not target_file:
            return CodeModificationResponse(
                success=False,
                message=f"File {request.file_name} not found in deliverables"
            )
        
        current_code = target_file.get('content', '')
        
        # Build context for AI modification
        context_text = f"""
File: {request.file_name}
Language: {request.context.get('language', 'python')}
Story: {request.context.get('story', {}).get('title', 'Unknown')}

Current Code:
```
{current_code}
```

User Instruction: {request.instruction}
"""
        
        if request.selected_text:
            context_text += f"\nSelected Text:\n```\n{request.selected_text}\n```\n"
            context_text += "Please focus modifications on the selected text area."
        
        # Use OpenAI to generate the modified code
        ai_prompt = f"""You are an expert code modifier. Given the context and user instruction, please modify the code accordingly.

{context_text}

IMPORTANT REQUIREMENTS:
1. Return ONLY the complete modified code content (no explanations, no markdown markers)
2. Fix ALL syntax errors (missing commas, typos, incorrect variable names)
3. Complete ALL TODO items with proper implementation
4. Replace placeholder comments with actual working code
5. Ensure all imports are correct and properly formatted
6. Follow Python best practices and proper error handling
7. Make sure all methods have complete implementations
8. Preserve the original structure and functionality
9. Add proper type hints and docstrings where missing
10. Ensure the code is production-ready and fully functional

SPECIFIC TASKS TO COMPLETE:
- Fix any syntax errors in the code
- Implement all TODO placeholder functions with proper logic
- Complete any incomplete class definitions
- Add proper error handling where needed
- Ensure all methods return appropriate values
- Add proper database integration code if needed

Return the complete, working, syntax-error-free code:"""

        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert code modifier who completes TODO items, fixes syntax errors, and returns complete, production-ready code."},
                    {"role": "user", "content": ai_prompt}
                ],
                temperature=0.1,
                max_tokens=4000
            )
            
            modified_code = response.choices[0].message.content or ""
            
            # Debug logging
            print(f"[DEBUG] Raw AI response length: {len(modified_code)} characters")
            print(f"[DEBUG] AI response starts with: {modified_code[:100]}...")
            
            # Clean up the response (remove code block markers if present)
            if modified_code.startswith('```'):
                lines = modified_code.split('\n')
                # Remove first line (```)
                if lines and lines[0].startswith('```'):
                    lines = lines[1:]
                # Remove last line if it's just ```
                if lines and lines[-1].strip() == '```':
                    lines = lines[:-1]
                modified_code = '\n'.join(lines)
                print(f"[DEBUG] Cleaned code length: {len(modified_code)} characters")
            
            # Validate that we have actual code content
            if not modified_code or modified_code.strip() == "":
                print("[ERROR] Modified code is empty after processing")
                return CodeModificationResponse(
                    success=False,
                    message="AI returned empty code content"
                )
            
            print(f"[DEBUG] Final modified code preview:")
            print(f"[DEBUG] {modified_code[:200]}...")
            
            # Update the file content in deliverables
            target_file['content'] = modified_code
            deliverables[request.story_id] = deliverable
            phase_data['user_story_development'] = deliverables
            phase.data = phase_data
            
            # Commit to database
            db.commit()
            print(f"[DEBUG] Database commit successful")
            
            return CodeModificationResponse(
                success=True,
                message=f"Code modified successfully in {request.file_name}",
                modified_code=modified_code,
                file_name=request.file_name
            )
            
        except Exception as ai_error:
            print(f"AI modification error: {ai_error}")
            return CodeModificationResponse(
                success=False,
                message=f"Failed to generate code modifications: {str(ai_error)}"
            )
        
    except Exception as e:
        print(f"Code modification error: {e}")
        return CodeModificationResponse(
            success=False,
            message=f"Error modifying code: {str(e)}"
        )

@router.post("/analyze-code", response_model=CodeAnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest):
    """
    Perform comprehensive AI code analysis including documentation, quality review, 
    bug detection, test generation, and architecture suggestions
    """
    try:
        print(f"[DEBUG] ===== AI CODE ANALYSIS REQUEST =====")
        print(f"[DEBUG] File: {request.file_name}")
        print(f"[DEBUG] File Path: {request.file_path}")
        print(f"[DEBUG] Code length: {len(request.code_content)} characters")
        print(f"[DEBUG] =====================================")
        
        # Use the provided prompt directly
        analysis_prompt = request.prompt
        
        # Call OpenAI API for code analysis
        try:
            response = await client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system", 
                        "content": """You are an expert code analysis AI. Provide comprehensive, actionable insights about code quality, security, testing, and architecture. 
                        Format your response with clear sections and practical recommendations."""
                    },
                    {
                        "role": "user", 
                        "content": analysis_prompt
                    }
                ],
                max_tokens=4000,
                temperature=0.3
            )
            
            analysis_result = response.choices[0].message.content.strip()
            
            print(f"[DEBUG] AI Analysis completed successfully")
            print(f"[DEBUG] Analysis length: {len(analysis_result)} characters")
            
            return CodeAnalysisResponse(
                success=True,
                message="Code analysis completed successfully",
                analysis=analysis_result
            )
            
        except Exception as ai_error:
            print(f"AI analysis error: {ai_error}")
            return CodeAnalysisResponse(
                success=False,
                message=f"Failed to generate code analysis: {str(ai_error)}"
            )
            
    except Exception as e:
        print(f"Code analysis error: {e}")
        return CodeAnalysisResponse(
            success=False,
            message=f"Error analyzing code: {str(e)}"
        )
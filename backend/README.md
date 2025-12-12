# TAO SDLC Backend - FastAPI

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Setup PostgreSQL database:
```bash
# Install PostgreSQL if not already installed
# Create database
createdb tao_sdlc
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run the application:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Models

- **User**: System users with roles
- **Project**: SDLC projects
- **ProjectStakeholder**: Project stakeholder assignments
- **Phase**: Project phases (1-5)
- **Approval**: Approval workflow
- **AIInteraction**: AI copilot interactions

## API Endpoints

### Users
- POST `/api/users/` - Create user
- GET `/api/users/` - List users
- GET `/api/users/{user_id}` - Get user

### Projects
- POST `/api/projects/` - Create project
- GET `/api/projects/` - List projects
- GET `/api/projects/{project_id}` - Get project
- POST `/api/projects/{project_id}/stakeholders` - Add stakeholder

### Phases
- GET `/api/phases/project/{project_id}` - Get project phases
- GET `/api/phases/{phase_id}` - Get phase
- PUT `/api/phases/{phase_id}` - Update phase

### Approvals
- POST `/api/approvals/` - Create approval
- GET `/api/approvals/phase/{phase_id}` - Get phase approvals
- GET `/api/approvals/pending/{user_id}` - Get pending approvals
- PUT `/api/approvals/{approval_id}` - Update approval

### AI Copilot
- POST `/api/ai/query` - Query AI copilot
- POST `/api/ai/generate/{phase_id}` - Generate content


# TAO SDLC - Quick Start Guide

## ✅ Your System is Ready!

The OpenAI integration has been successfully configured and tested. Your TAO SDLC system can now intelligently generate **Epics** and **User Stories** based on actual requirements.

---

## 🚀 Start the Backend Server

```bash
cd backend
python run_server.py
```

The server will start on `http://localhost:8000`

---

## 🧪 Test the Integration (Optional)

To verify OpenAI is working:

```bash
cd backend
python test_openai_integration.py
```

Expected output:
```
[SUCCESS] OpenAI Integration Test PASSED!
Your system is ready to generate epics and user stories!
```

---

## 📝 How to Use

### Step 1: Complete Phase 1 (Requirements Gathering)
1. Create a new project
2. Navigate to Phase 1
3. Add **Gherkin Requirements** (Feature, User Stories, Scenarios)
4. Generate or write **BRD** (Business Requirements Document)
5. Generate or write **PRD** (Product Requirements Document)
6. Complete Phase 1

### Step 2: Generate Epics in Phase 2 (Planning & Backlog)
1. Navigate to Phase 2
2. Click **"Generate Epics"** button
3. Wait 2-5 seconds
4. OpenAI analyzes ALL Phase 1 data:
   - Requirements
   - BRD content
   - PRD content
   - Gherkin scenarios
5. View generated epics with:
   - Meaningful titles based on your requirements
   - Descriptions from actual features
   - Realistic story counts (2-10 per epic)
   - Story points estimates (10-50 per epic)
   - Priority based on business value
   - Requirements mapped to each epic

### Step 3: Generate User Stories
1. After epics are generated
2. Click **"Generate User Stories"** button
3. Wait 3-8 seconds
4. OpenAI creates detailed user stories:
   - "As a [role], I want [goal], so that [benefit]" format
   - Acceptance criteria from Gherkin scenarios
   - Story points using Fibonacci scale (1, 2, 3, 5, 8, 13)
   - Stories cover: functionality, UI/UX, testing, security
5. Drag-drop stories to sprints
6. Assign to team members
7. Start development!

---

## ⚙️ Configuration

### OpenAI API Key
Your API key is stored in `backend/.env`:
```
OPENAI_API_KEY=sk-proj-xTiG8SWCioU72aqCyWJo...
```

**To update the key:**
1. Edit `backend/.env`
2. Replace the `OPENAI_API_KEY` value
3. Restart the backend server

### Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=your-api-key-here

# Database
DATABASE_URL=sqlite:///./sdlc.db

# JWT Authentication
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## 💡 What Makes This Intelligent?

Unlike template-based generation, OpenAI:

✓ **Understands Context**: Reads and comprehends your BRD, PRD, and requirements  
✓ **Groups Logically**: Creates epics that make business sense  
✓ **Maps Everything**: Every requirement is tracked to an epic  
✓ **Estimates Realistically**: Story counts and points based on actual complexity  
✓ **Generates Acceptance Criteria**: Uses your Gherkin scenarios  
✓ **Comprehensive Coverage**: Includes dev, testing, security, documentation  

---

## 🔍 Example Output

### Generated Epic
```json
{
  "id": 1,
  "title": "User Authentication & Access Control",
  "description": "Implement secure user login, registration, password reset, and role-based access control",
  "stories": 8,
  "points": 40,
  "priority": "High",
  "requirements_mapped": ["req-1", "req-2", "req-3", "req-4"]
}
```

### Generated User Story
```json
{
  "id": 1,
  "epic": "User Authentication & Access Control",
  "epic_id": 1,
  "title": "As a user, I want to login with email and password",
  "description": "Implement secure login functionality with email validation and password encryption",
  "acceptance_criteria": [
    "**Valid Login**: Given user is on login page, When user enters valid credentials, Then user is logged in",
    "**Invalid Login**: Given user is on login page, When user enters invalid credentials, Then error message is displayed",
    "Email format is validated",
    "Password is securely hashed",
    "Session token is generated",
    "User is redirected to dashboard"
  ],
  "points": 5,
  "priority": "High",
  "sprint": null,
  "status": "backlog"
}
```

---

## 💰 Cost

**Model**: GPT-4o-mini (very cost-effective)

**Per Project**:
- Epic Generation: ~$0.0003-$0.0009
- User Story Generation: ~$0.0006-$0.0015
- **Total: Less than $0.003 per project** (a fraction of a penny!)

---

## 🛠️ Troubleshooting

### Server won't start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Or start on different port
python run_server.py --port 8001
```

### "OpenAI API key not found"
```bash
# Verify .env file exists
dir .env

# Check if key is loaded
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('Key:', 'Found' if os.getenv('OPENAI_API_KEY') else 'Not Found')"
```

### OpenAI rate limit exceeded
- Wait a few minutes
- System automatically falls back to template generation
- Check your OpenAI account at https://platform.openai.com

### Generated content doesn't match expectations
- Add more detail to Phase 1 requirements
- Write comprehensive Gherkin scenarios
- Include specific acceptance criteria
- OpenAI quality improves with better input data

---

## 📚 Additional Documentation

- **Full Documentation**: `docs/OPENAI_INTEGRATION.md`
- **Document Extraction**: `docs/DOCUMENT_EXTRACTION_IMPLEMENTATION.md`
- **Completion Report**: `docs/COMPLETION_REPORT.md`

---

## 🎯 Summary

Your TAO SDLC system now has AI-powered Phase 2 generation:

1. ✅ OpenAI API key configured
2. ✅ Epic generation working
3. ✅ User story generation working
4. ✅ Fallback mechanism in place
5. ✅ Full context sent to AI (requirements + BRD + PRD)
6. ✅ Output format compatible with existing UI

**You're ready to go! Start the server and create your first AI-powered project plan! 🚀**


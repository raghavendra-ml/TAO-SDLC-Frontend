# 🚀 SETUP GUIDE FOR NEW SYSTEMS

**After cloning/pulling the code from GitHub, follow these steps to run the application.**

---

## ⚠️ IMPORTANT: What's NOT in Git (Due to `.gitignore`)

These files are intentionally excluded from Git for security:
- ❌ `backend/.env` - Contains actual API keys and tokens
- ❌ `backend/.config.json` - Configuration file with credentials
- ❌ `frontend/.env.local` - Frontend environment variables
- ❌ `node_modules/` - Dependencies (will be reinstalled)
- ❌ `__pycache__/` - Python cache files
- ❌ Database files (`.db`, `.sqlite`)

---

## 📋 SETUP CHECKLIST

### **Step 1: Clone/Pull the Repository**
```bash
git clone <repository-url>
cd TAO_SDLC_05_12
```

---

### **Step 2: Backend Setup**

#### **2.1: Create `.env` file from template**
```bash
cd backend
cp .env.example .env
```

#### **2.2: Edit `.env` with your credentials**
```bash
# Open backend/.env and add your actual values for:
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY
GITHUB_TOKEN=github_pat_YOUR_ACTUAL_TOKEN
JIRA_URL=https://your-instance.atlassian.net/
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN_1=YOUR_JIRA_TOKEN_1
JIRA_API_TOKEN_2=YOUR_JIRA_TOKEN_2
DATABASE_URL=sqlite:///./sdlc.db
SECRET_KEY=your-secret-key-here
```

#### **2.3: Install Python dependencies**
```bash
# Ensure you have Python 3.9+ installed
python --version

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

#### **2.4: Initialize Database (if needed)**
```bash
# If using PostgreSQL, create database first
# For SQLite, it will be created automatically

# Run migrations (if applicable)
# python alembic upgrade head  # Uncomment if you have Alembic migrations
```

#### **2.5: Run Backend Server**
```bash
python run_server.py
# OR
uvicorn app.main:app --reload

# Server will start on: http://localhost:8000
```

---

### **Step 3: Frontend Setup**

#### **3.1: Navigate to frontend directory**
```bash
cd frontend
```

#### **3.2: Create `.env.local` from template**
```bash
cp .env.example .env.local
```

#### **3.3: Edit `.env.local` with your values**
```bash
# Open frontend/.env.local and add:
VITE_API_BASE_URL=http://localhost:8000
VITE_JIRA_URL=https://your-instance.atlassian.net/
VITE_JIRA_EMAIL=your-email@example.com
VITE_JIRA_API_TOKEN_1=YOUR_JIRA_TOKEN_1
VITE_JIRA_API_TOKEN_2=YOUR_JIRA_TOKEN_2
VITE_APP_NAME=TAO SDLC Automaton
VITE_ENVIRONMENT=development
```

#### **3.4: Install Node dependencies**
```bash
# Ensure you have Node.js 16+ installed
node --version
npm --version

# Install dependencies
npm install
```

#### **3.5: Run Frontend Server**
```bash
npm run dev

# Frontend will start on: http://localhost:5173
```

---

## 📁 EXPECTED FILE STRUCTURE AFTER SETUP

```
TAO_SDLC_05_12/
├── .gitignore                    ✅ (from Git)
├── .env.example                  ✅ (from Git - template)
├── backend/
│   ├── .env                      ⚠️ (YOU CREATE - with real credentials)
│   ├── .env.example              ✅ (from Git - template)
│   ├── .config.json              ⚠️ (created at runtime if needed)
│   ├── app/
│   │   ├── config.py             ✅ (from Git)
│   │   └── ...
│   ├── requirements.txt           ✅ (from Git)
│   ├── run_server.py             ✅ (from Git)
│   └── venv/                     ⚠️ (YOU CREATE - virtual environment)
├── frontend/
│   ├── .env.local                ⚠️ (YOU CREATE - with real credentials)
│   ├── .env.example              ✅ (from Git - template)
│   ├── node_modules/             ⚠️ (YOU CREATE - npm install)
│   ├── package.json              ✅ (from Git)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Phase2Page.tsx     ✅ (from Git - uses env vars)
│   │   │   ├── Dashboard.tsx      ✅ (from Git - uses env vars)
│   │   │   └── ProjectsPage.tsx   ✅ (from Git - uses env vars)
│   │   └── ...
│   └── vite.config.ts            ✅ (from Git)
├── database/
│   └── schema.sql                ✅ (from Git)
└── ...

✅ = From Git (tracked)
⚠️ = You need to create
```

---

## 🔐 CREDENTIALS NEEDED

### **From Your Team/DevOps:**

1. **OpenAI API Key**
   - Get from: https://platform.openai.com/account/api-keys
   - Set in: `backend/.env` → `OPENAI_API_KEY`

2. **GitHub Personal Access Token**
   - Get from: https://github.com/settings/tokens
   - Set in: `backend/.env` → `GITHUB_TOKEN`

3. **JIRA Credentials**
   - Get from: https://id.atlassian.com/manage-profile/security/api-tokens
   - Set in:
     - `backend/.env` → `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN_1`, `JIRA_API_TOKEN_2`
     - `frontend/.env.local` → `VITE_JIRA_URL`, `VITE_JIRA_EMAIL`, `VITE_JIRA_API_TOKEN_1`, `VITE_JIRA_API_TOKEN_2`

4. **JWT Secret Key**
   - Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - Set in: `backend/.env` → `SECRET_KEY`

---

## ✅ VERIFICATION STEPS

### **Backend Check:**
```bash
cd backend

# Verify .env exists
ls -la | grep .env
# Should show: .env (not .env.example)

# Verify environment variables are loaded
python -c "import os; print('OPENAI_API_KEY set:', bool(os.getenv('OPENAI_API_KEY')))"

# Test server startup
python run_server.py
# Should output: "Uvicorn running on http://127.0.0.1:8000"
```

### **Frontend Check:**
```bash
cd frontend

# Verify .env.local exists
ls -la | grep .env
# Should show: .env.local (not .env.example)

# Verify environment variables
npm run dev
# Should output: "VITE v... ready in X ms"
```

### **Both Running:**
```bash
# Open in browser
http://localhost:5173  # Frontend
http://localhost:8000  # Backend (API)

# Try logging in with sample credentials or creating a project
```

---

## 🛑 COMMON ISSUES & SOLUTIONS

### **Issue 1: "ModuleNotFoundError: No module named 'app'"**
**Solution:**
```bash
cd backend
pip install -r requirements.txt
# Then restart: python run_server.py
```

### **Issue 2: "Cannot find module" in Frontend**
**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Issue 3: "OPENAI_API_KEY not found"**
**Solution:**
```bash
# Check .env file exists
ls backend/.env

# Check it has content
cat backend/.env | grep OPENAI_API_KEY

# If empty, update it with your actual key
```

### **Issue 4: "Port 8000/5173 already in use"**
**Solution:**
```bash
# Backend on different port:
uvicorn app.main:app --reload --port 8001

# Frontend on different port:
npm run dev -- --port 5174
```

### **Issue 5: "JIRA Connection Failed"**
**Solution:**
```bash
# Verify credentials in backend/.env
cat backend/.env | grep JIRA

# Verify credentials in frontend/.env.local
cat frontend/.env.local | grep VITE_JIRA

# Test JIRA connection from browser console
# Should show JIRA project data in dashboard
```

---

## 📝 QUICK START SCRIPT

Save this as `setup.sh` (Mac/Linux) or `setup.bat` (Windows):

### **Mac/Linux (`setup.sh`):**
```bash
#!/bin/bash

echo "📦 Setting up TAO SDLC Automaton..."

# Backend setup
echo "⚙️ Setting up Backend..."
cd backend
cp .env.example .env
echo "✅ Backend .env created. Edit it with your credentials!"
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
echo "⚙️ Setting up Frontend..."
cp .env.example .env.local
echo "✅ Frontend .env.local created. Edit it with your credentials!"
npm install

echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env with your actual credentials"
echo "2. Edit frontend/.env.local with your actual credentials"
echo "3. In one terminal: cd backend && source venv/bin/activate && python run_server.py"
echo "4. In another terminal: cd frontend && npm run dev"
echo ""
```

### **Windows (`setup.bat`):**
```batch
@echo off
echo 📦 Setting up TAO SDLC Automaton...

REM Backend setup
echo ⚙️ Setting up Backend...
cd backend
copy .env.example .env
echo ✅ Backend .env created. Edit it with your credentials!
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt

REM Frontend setup
cd ..\frontend
echo ⚙️ Setting up Frontend...
copy .env.example .env.local
echo ✅ Frontend .env.local created. Edit it with your credentials!
call npm install

echo.
echo ✨ Setup complete!
echo.
echo 📋 Next steps:
echo 1. Edit backend\.env with your actual credentials
echo 2. Edit frontend\.env.local with your actual credentials
echo 3. In one terminal: cd backend && venv\Scripts\activate.bat && python run_server.py
echo 4. In another terminal: cd frontend && npm run dev
echo.
```

---

## 🎯 FINAL CHECKLIST

- [ ] Cloned/pulled code from GitHub
- [ ] Created `backend/.env` from `.env.example`
- [ ] Created `frontend/.env.local` from `.env.example`
- [ ] Added all credentials (OpenAI, GitHub, JIRA, JWT Secret)
- [ ] Installed Python dependencies (`pip install -r requirements.txt`)
- [ ] Installed Node dependencies (`npm install`)
- [ ] Backend server running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:5173`
- [ ] Can access dashboard without errors
- [ ] JIRA integration working in Phase 2

---

## 📞 NEED HELP?

If you get stuck:
1. Check that `.env` and `.env.local` files exist
2. Verify all credentials are correctly entered
3. Check that Python 3.9+ and Node 16+ are installed
4. Try deleting `node_modules/` and `venv/` directories and reinstalling
5. Check application logs for specific error messages


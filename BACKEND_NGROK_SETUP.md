# Backend Setup with ngrok Port Tunneling

## Overview
The backend runs locally on port 8000, and ngrok creates a public URL tunnel for secure access from anywhere.

---

## Prerequisites
- Python 3.8+
- PostgreSQL running locally
- ngrok account (free at https://ngrok.com)

---

## Step 1: Install Dependencies

```powershell
cd backend
pip install -r requirements.txt
```

---

## Step 2: Setup Environment Variables

Create a `.env` file in the `backend` directory with:

```env
# Database Configuration
DATABASE_URL=postgresql://admin_user:password@localhost/sdlc

# API Keys (if using external services)
OPENAI_API_KEY=your_key_here
GITHUB_TOKEN=your_token_here
JIRA_API_TOKEN=your_token_here

# Application Settings
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
```

---

## Step 3: Start the Backend Server

```powershell
cd backend
python run_server.py
```

Expected output:
```
============================================================
TAO SDLC - Backend Server
============================================================
Database: sdlc
Username: admin_user
Current directory: ...
DATABASE_URL loaded: True
============================================================

INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

The server will be available at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

---

## Step 4: Install and Setup ngrok

### Option A: Using Chocolatey (Recommended)
```powershell
choco install ngrok
```

### Option B: Direct Download
1. Download from https://ngrok.com/download
2. Extract to a folder (e.g., `C:\ngrok`)
3. Add to PATH or run from the extracted location

### Authenticate ngrok
```powershell
ngrok authtoken YOUR_AUTH_TOKEN
```
Get your auth token from: https://dashboard.ngrok.com/auth/your-authtoken

---

## Step 5: Create ngrok Tunnel

Open a **new PowerShell window** and run:

```powershell
ngrok http 8000
```

**Expected Output:**
```
ngrok                                       (Ctrl+C to quit)

Session Status                online
Session Expires               1 hour 59 minutes
Version                       3.x.x
Region                        us (United States)
Forwarding                    https://abc123def456-us.ngrok.io -> http://localhost:8000
Forwarding                    http://abc123def456-us.ngro k.io -> http://localhost:8000
```

**Your public URL:** `https://abc123def456-us.ngrok.io`

---

## Step 6: Update Frontend to Use ngrok URL

### For Development (Local Testing with ngrok)

Update `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  // ... other config
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

Create `frontend/.env.local`:
```env
VITE_API_URL=https://abc123def456-us.ngrok.io
```

Or create `frontend/.env.development`:
```env
VITE_API_URL=https://abc123def456-us.ngrok.io
```

### Update API Service in Frontend

Check your API service file (likely in `src/services/` or `src/utils/`) and ensure it uses the environment variable:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});
```

---

## Step 7: Run Frontend

```powershell
cd frontend
npm install  # if not done yet
npm run dev
```

Frontend runs on: **http://localhost:3000**

---

## ngrok Considerations

### Static URL (Premium Feature)
ngrok free tier regenerates the URL every 2 hours. For a static URL:
1. Upgrade to ngrok paid plan
2. Reserve a static domain at https://dashboard.ngrok.com/cloud-edge/domains

### Disable ngrok Header Validation (if needed)
Add to ngrok command:
```powershell
ngrok http 8000 --host-header=localhost:8000
```

### ngrok Troubleshooting

**Issue:** Headers or CORS errors
```powershell
ngrok http 8000 --host-header=rewrite
```

**Issue:** Cannot connect
- Verify backend is running on port 8000
- Check firewall isn't blocking connections
- Verify ngrok is authenticated

---

## Complete Startup Sequence

### Terminal 1 - Backend
```powershell
cd backend
python run_server.py
```

### Terminal 2 - ngrok Tunnel
```powershell
ngrok http 8000
```
Copy the HTTPS URL shown here.

### Terminal 3 - Frontend
```powershell
cd frontend
# Update .env.local with ngrok URL from Terminal 2
npm run dev
```

---

## Testing the Setup

1. **Backend API directly:**
   - Local: `http://localhost:8000/docs`
   - ngrok: `https://your-ngrok-url/docs`

2. **From Frontend:**
   - Open `http://localhost:3000`
   - Check Network tab in DevTools
   - API calls should go to ngrok URL

3. **Check CORS is configured:**
   Add to `backend/app/main.py`:
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000", "https://*.ngrok.io"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

---

## Summary

| Component | Local URL | ngrok URL |
|-----------|-----------|-----------|
| Backend API | http://localhost:8000 | https://your-ngrok-url |
| Backend Docs | http://localhost:8000/docs | https://your-ngrok-url/docs |
| Frontend | http://localhost:3000 | (same, runs locally) |

**Frontend makes API calls to:** ngrok URL (for testing external access)

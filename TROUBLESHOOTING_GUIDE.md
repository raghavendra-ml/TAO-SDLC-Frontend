# Complete Troubleshooting Guide

## 🔴 Dashboard shows "Cannot connect to backend"

### Root Cause
The frontend cannot reach the API server because either:
1. The backend server is not running
2. The ngrok tunnel is not active
3. The ngrok URL in `.env.local` is wrong or expired

---

## ✅ Fix: Step by Step

### 1. Verify Backend is Running

**Check if backend is on port 8000:**

```powershell
# In a terminal, try to access the backend
curl http://localhost:8000/api/health/

# Or open in browser:
# http://localhost:8000/docs
```

If you see an error, start the backend:

```powershell
cd backend
python run_server.py
```

You should see:
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

### 2. Check ngrok Status

**If you see "JIRA 401 error" and ngrok is running**, the URL is correct but JIRA credentials are missing. This is **NOT A PROBLEM** - just configure JIRA or skip it.

**If backend won't connect at all**, ngrok might be down. Start it:

```powershell
ngrok http 8000
```

Look for the forwarding URL:
```
Forwarding                    https://abc123-def456.ngrok-free.dev -> http://localhost:8000
```

---

### 3. Update Frontend Configuration

**Copy the ngrok URL and update `frontend/.env.local`:**

```dotenv
VITE_API_URL=https://YOUR-NGROK-URL-HERE
```

**Example:**
```dotenv
VITE_API_URL=https://abc123-def456-ghi789.ngrok-free.dev
```

⚠️ **Important:** Every time you restart ngrok, you get a NEW URL. Update `.env.local` each time!

---

### 4. Restart Frontend

```powershell
# Kill running frontend (Ctrl+C)
# Then restart:
cd frontend
npm run dev
```

---

### 5. Test Connection

1. Go to `http://localhost:3000`
2. Click "Try Demo Account"
3. If successful, you're on the Dashboard
4. If still failing, go to `http://localhost:3000/diagnostics` to run system checks

---

## 🔧 Diagnostics Page

Access `/diagnostics` to check:
- ✅ Frontend environment
- ✅ Backend connectivity
- ✅ Auth token status
- ✅ API health

**URL:** `http://localhost:3000/diagnostics`

---

## 📋 Common Issues & Fixes

### Issue: "JIRA 401 Unauthorized"

**Expected behavior:** This is normal if you haven't configured JIRA credentials.

**Fix:**
1. Go to Settings page
2. Fill in JIRA URL, email, and API token
3. Save

Or skip if you don't need JIRA integration.

---

### Issue: "Network Error" in Console

**Possible causes:**
- Backend not running
- ngrok URL is wrong or expired
- CORS issue

**Fix:**
1. Check backend: `http://localhost:8000/docs`
2. Check ngrok: `ngrok http 8000`
3. Update `.env.local` with new ngrok URL
4. Restart frontend

---

### Issue: Dashboard loads but Projects section is empty/error

**Possible causes:**
- No projects created yet
- API connection is flaky
- Database issue

**Fix:**
1. Run diagnostics: `http://localhost:3000/diagnostics`
2. Click "Try again" on the error message
3. Create a new project from the Projects page

---

### Issue: ngrok URL Changes Every Time

**Free ngrok restarts every 2 hours with a new URL.**

**Solutions:**
- ✅ Use ngrok Pro (paid) for static URLs
- ✅ Update `.env.local` manually each time
- ✅ Use local development without ngrok

---

## 🚀 Development Modes

### Mode 1: Local Development (Recommended for Development)

No ngrok needed. Frontend and backend both run locally.

**Setup:**
```
# Terminal 1: Backend
cd backend
python run_server.py

# Terminal 2: Frontend (no VITE_API_URL in .env.local)
cd frontend
npm run dev
```

**Configure:** Remove `VITE_API_URL` from `.env.local` or leave it blank

**Access:** `http://localhost:3000`

---

### Mode 2: ngrok Tunnel (For Vercel Deployment Testing)

Frontend on localhost, backend accessible from anywhere via ngrok.

**Setup:**
```
# Terminal 1: Backend
cd backend
python run_server.py

# Terminal 2: ngrok
ngrok http 8000

# Terminal 3: Frontend (with VITE_API_URL set)
cd frontend
npm run dev
```

**Configure:** Update `.env.local` with ngrok URL

**Access:** `http://localhost:3000`

---

### Mode 3: Vercel Deployment (Production)

Frontend deployed on Vercel, backend accessible via ngrok.

**Setup:**
1. Push frontend to GitHub
2. Deploy to Vercel
3. In Vercel project settings, set environment variable:
   ```
   VITE_API_URL = https://your-ngrok-url
   ```
4. Redeploy

**Access:** `https://your-vercel-app.vercel.app`

---

## 🔍 Debug Tips

### Check Console Logs

Open browser DevTools (F12) and look for:
- `[Dashboard]` messages - showing load progress
- `[API]` messages - showing API calls
- Network tab - showing HTTP requests

### Check Backend Logs

The backend terminal should show:
```
GET /api/projects/
GET /api/health/
POST /api/auth/login
```

### Check ngrok Status

Go to `http://127.0.0.1:4040` while ngrok is running to see all requests/responses.

---

## 🎯 Quick Checklist

- [ ] Backend running: `python run_server.py`
- [ ] ngrok running: `ngrok http 8000`
- [ ] ngrok URL copied
- [ ] `.env.local` updated with new URL
- [ ] Frontend restarted: `npm run dev`
- [ ] Can access: `http://localhost:3000`
- [ ] Demo login works
- [ ] Dashboard displays
- [ ] Check `/diagnostics` if issues persist

---

## 📞 Still Having Issues?

1. Check the console (F12) for error messages
2. Run diagnostics page: `http://localhost:3000/diagnostics`
3. Check backend logs for errors
4. Check ngrok logs (visit `http://127.0.0.1:4040`)
5. Restart everything and try again

---

## 📚 Related Documentation

- [FRONTEND_SETUP_QUICK_START.md](./FRONTEND_SETUP_QUICK_START.md) - Setup guide
- [BACKEND_NGROK_SETUP.md](./BACKEND_NGROK_SETUP.md) - Backend setup
- [API_URL_CONFIGURATION.md](./API_URL_CONFIGURATION.md) - API configuration
- [SMART_API_CONFIG_SETUP.md](./SMART_API_CONFIG_SETUP.md) - Smart API setup


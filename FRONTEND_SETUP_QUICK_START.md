# Frontend Quick Start - Complete Setup Guide

## Problem: Dashboard shows "Cannot connect to backend"

**Reason:** The ngrok URL in `.env.local` is expired or the backend server is not running.

---

## ✅ SOLUTION: Step-by-Step Setup

### Step 1: Start the Backend Server (if not already running)

**Terminal 1 - Backend:**
```powershell
cd backend
python run_server.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

### Step 2: Start ngrok Tunnel

**Terminal 2 - ngrok:**

First, install ngrok if not already installed:
```powershell
# Windows
choco install ngrok
# OR download from https://ngrok.com

# Verify installation
ngrok --version
```

Start ngrok tunnel:
```powershell
ngrok http 8000
```

You should see:
```
Session Status                online
Account                       <your-email>@<domain>
Version                       3.x.x
Region                        United States (us)
Latency                       xx ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://XXXXXXX-XXXXXXX-XXXXXXX.ngrok-free.dev -> http://localhost:8000

Visit http://127.0.0.1:4040 to inspect and replay requests made to your tunnel.
```

**👉 COPY THE URL:** (e.g., `https://XXXXXXX-XXXXXXX-XXXXXXX.ngrok-free.dev`)

---

### Step 3: Update Frontend Environment

**Edit** `frontend/.env.local`:

```dotenv
VITE_API_URL=https://YOUR-NGROK-URL-HERE
```

Replace `YOUR-NGROK-URL-HERE` with the URL from Step 2.

**Example:**
```dotenv
VITE_API_URL=https://abc123-def456-ghi789.ngrok-free.dev
```

---

### Step 4: Start Frontend

**Terminal 3 - Frontend:**
```powershell
cd frontend
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:3000/
```

---

### Step 5: Test the Connection

1. Open browser: `http://localhost:3000`
2. Click **"Try Demo Account"**
3. You should now see the Dashboard with projects loading

---

## 🔧 Troubleshooting

### Dashboard shows "Cannot connect to backend"

**Possible causes:**
- ❌ ngrok is not running
- ❌ Backend server is not running  
- ❌ `VITE_API_URL` in `.env.local` is wrong or expired

**Fix:**
1. Check ngrok is running: `ngrok http 8000`
2. Check backend is running: Visit `http://localhost:8000/docs` in browser
3. Update `.env.local` with the NEW ngrok URL every time ngrok restarts

---

### Dashboard loads but JIRA section shows "Not Connected"

**This is expected!** JIRA integration requires:
1. Valid JIRA credentials
2. Configure in Settings page

To configure JIRA:
1. Go to Settings page
2. Fill in: JIRA URL, Email, API Token
3. Save and refresh

Or skip JIRA if not needed - the app works fine without it.

---

### ngrok URL keeps changing

**Yes, free ngrok restarts every 2 hours and generates a new URL.**

**Solutions:**
- ✅ Use ngrok Pro account (paid) for stable URLs
- ✅ Update `.env.local` each time you restart ngrok
- ✅ Use local development without ngrok (see below)

---

## 🏠 Local Development (Without ngrok)

If you want to run frontend and backend locally **without ngrok**:

### Option 1: Use Vite Proxy (Local Dev Only)

No need to set `VITE_API_URL`. The frontend will use the Vite proxy:
- Remove or comment out `VITE_API_URL` in `.env.local`
- Vite will proxy `/api` calls to `http://localhost:8000`
- This only works on `localhost:3000`

**Steps:**
1. Start backend: `python run_server.py`
2. In `frontend/.env.local`, remove `VITE_API_URL` or set it to empty
3. Start frontend: `npm run dev`

---

### Option 2: Explicit Local URL

**Edit** `frontend/.env.local`:
```dotenv
VITE_API_URL=http://localhost:8000
```

Then:
1. Start backend: `python run_server.py`
2. Start frontend: `npm run dev`

---

## 📱 Deployed on Vercel (Production)

When deployed to Vercel, set the environment variable in Vercel project settings:

**Project Settings → Environment Variables:**
```
VITE_API_URL = https://your-ngrok-url-here
```

Then redeploy the project.

---

## ✨ Summary Checklist

- [ ] Backend running on `http://localhost:8000`
- [ ] ngrok running: `ngrok http 8000`
- [ ] Copied ngrok URL (e.g., `https://abc123....ngrok-free.dev`)
- [ ] Updated `frontend/.env.local` with ngrok URL
- [ ] Frontend running on `http://localhost:3000`
- [ ] Can log in with demo account: `demo@tao.com / demo123`
- [ ] Dashboard displays with projects

---

## 🔗 Useful Links

- [ngrok Documentation](https://ngrok.com/docs)
- [Backend Docs](./BACKEND_NGROK_SETUP.md)
- [API Configuration](./API_URL_CONFIGURATION.md)
- [Smart API Config Setup](./SMART_API_CONFIG_SETUP.md)


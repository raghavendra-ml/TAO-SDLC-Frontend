# 🚀 TAO SDLC - Quick Reference Card

## Start Everything (3 Terminals)

```powershell
# Terminal 1: Backend
cd backend
python run_server.py
# Wait for: "Uvicorn running on http://0.0.0.0:8000"

# Terminal 2: ngrok
ngrok http 8000
# Copy the URL: https://XXXXXXX.ngrok-free.dev

# Terminal 3: Frontend
# Edit frontend/.env.local, set:
# VITE_API_URL=https://YOUR-NGROK-URL-FROM-TERMINAL-2

cd frontend
npm run dev
# Access: http://localhost:3000
```

---

## URLs & Access

| Component | URL | Credentials |
|-----------|-----|-------------|
| **Frontend** | http://localhost:3000 | demo@tao.com / demo123 |
| **Backend API Docs** | http://localhost:8000/docs | (no auth needed) |
| **ngrok Inspect** | http://127.0.0.1:4040 | (local only) |
| **Diagnostics** | http://localhost:3000/diagnostics | (no login required) |

---

## File Locations

| File | Purpose | Edit? |
|------|---------|-------|
| `frontend/.env.local` | ngrok URL configuration | ✅ YES - update with new ngrok URL |
| `frontend/.env.example` | Example configuration | ❌ NO - reference only |
| `backend/run_server.py` | Backend entry point | ❌ NO - don't edit |
| `frontend/src/services/api.ts` | API client configuration | ❌ NO - handled automatically |

---

## Most Common Issue

### Problem: "Cannot connect to backend" error

### Solution (3 steps):

1. **Copy ngrok URL from Terminal 2**
   ```
   Forwarding: https://abc123-def456.ngrok-free.dev -> http://localhost:8000
   ```

2. **Update `frontend/.env.local`**
   ```
   VITE_API_URL=https://abc123-def456.ngrok-free.dev
   ```

3. **Restart frontend (Terminal 3)**
   ```
   npm run dev
   ```

---

## Configuration Files

### `frontend/.env.local` (LOCAL DEVELOPMENT)
```dotenv
# ✅ Update this with ngrok URL
VITE_API_URL=https://your-ngrok-url.ngrok-free.dev

# ✅ Leave these if not using JIRA
# VITE_JIRA_URL=...
# VITE_JIRA_EMAIL=...
# VITE_JIRA_API_TOKEN_1=...
```

### `frontend/.env.production` (PRODUCTION/VERCEL)
```dotenv
# Set this in Vercel project settings instead
VITE_API_URL=https://your-ngrok-url.ngrok-free.dev
```

---

## Commands Cheat Sheet

```powershell
# Backend
cd backend
python run_server.py          # Start backend
pip install -r requirements.txt  # Install deps

# ngrok
ngrok http 8000               # Start tunnel on port 8000
ngrok --version               # Check if installed

# Frontend
cd frontend
npm install                   # Install dependencies
npm run dev                   # Start dev server
npm run build                 # Build for production
npm run preview               # Preview production build
```

---

## Verify Setup Works

```powershell
# Step 1: Check backend
curl http://localhost:8000/docs

# Step 2: Check ngrok
# Should see: Forwarding https://xxx.ngrok-free.dev -> http://localhost:8000

# Step 3: Check frontend
# Open http://localhost:3000/diagnostics
# All checks should be green ✅
```

---

## Environment Variables Explained

| Variable | Where | Purpose | Example |
|----------|-------|---------|---------|
| `VITE_API_URL` | `.env.local` | Backend API URL | `https://abc123.ngrok-free.dev` |
| `VITE_JIRA_URL` | `.env.local` | JIRA instance URL | `https://my-org.atlassian.net/` |
| `VITE_JIRA_EMAIL` | `.env.local` | JIRA email | `user@company.com` |
| `VITE_JIRA_API_TOKEN_1` | `.env.local` | JIRA API token | (keep secret!) |

---

## Demo Account

| Field | Value |
|-------|-------|
| Email | `demo@tao.com` |
| Password | `demo123` |

Click "Try Demo Account" on login page to use it.

---

## Troubleshooting Quick Links

- **Cannot connect to backend?** → See [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)
- **Full setup guide?** → See [FRONTEND_SETUP_QUICK_START.md](./FRONTEND_SETUP_QUICK_START.md)
- **Backend setup?** → See [BACKEND_NGROK_SETUP.md](./BACKEND_NGROK_SETUP.md)
- **System diagnostics?** → Go to http://localhost:3000/diagnostics

---

## ngrok - Important Notes

⚠️ **Free ngrok limitations:**
- URL changes every restart (get a new one each time)
- Session terminates after ~2 hours
- Limited to 40 connections/minute

✅ **Solution:** Update `.env.local` with new URL after each restart

---

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health/` | GET | Check API health |
| `/api/projects/` | GET | List projects |
| `/api/auth/login` | POST | Login |
| `/api/auth/demo-login` | POST | Demo login |
| `/api/jira/stats` | GET | Get JIRA stats |

---

## Browser DevTools Console

Look for these prefixes to debug:
- 🔵 `[API]` - API calls
- 🔴 `[Dashboard]` - Dashboard events
- ⚠️ `[AuthContext]` - Authentication
- 🟢 `[Success]` - Operations succeeded
- ❌ `[Error]` - Errors

---

## Performance Tips

1. **Clear browser cache** if seeing old errors
   - Dev Tools → Application → Clear storage

2. **Check network tab** to see actual API response

3. **Look at ngrok dashboard** (http://127.0.0.1:4040) to inspect requests

---

## Deployment to Vercel

1. Push frontend code to GitHub
2. Import repo in Vercel
3. Set environment variable:
   ```
   VITE_API_URL = https://your-ngrok-url.ngrok-free.dev
   ```
4. Deploy
5. Access at `https://your-project.vercel.app`

---

## Health Check

```powershell
# All should succeed:
curl http://localhost:8000/api/health/
curl http://localhost:3000/diagnostics
# Should show "System Status"
```

If any fails, see [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)
- [ ] Dashboard displays
- [ ] Projects list shows
- [ ] No JavaScript errors in console
- [ ] No blank screen

## 📍 Common API Indicators in Console

```javascript
// Good signs (look for these):
🔵 [API] Using ngrok/production URL: https://...
🔵 [API] Using relative proxy URL: /api
🔍 [Dashboard] Environment Check:
✅ [Dashboard] Projects loaded: [...]

// Bad signs (check browser console):
❌ CORS error
❌ 401 Unauthorized
❌ TypeError: Cannot read property of null
❌ Failed to load projects
```

## 🌐 For Vercel Deployment

1. **Set Environment Variable:**
   - Go to: https://vercel.com/dashboard
   - Project → Settings → Environment Variables
   - Add: `VITE_API_URL=https://historiographical-uninjuriously-doreatha.ngrok-free.dev`

2. **Redeploy:**
   - Click "Redeploy" button in Vercel dashboard
   - Wait for completion

3. **Test:**
   - Visit: https://tao-sdlc.vercel.app
   - Should load without blank screen

## 🛠 If Still Having Issues

### Check 1: Services Running
```bash
# Backend check
curl http://localhost:8000

# ngrok check (should show active session)
ngrok http 8000  # should be running

# Frontend check
curl http://localhost:3000
```

### Check 2: Environment Variables
```javascript
// In browser console:
console.log(import.meta.env.VITE_API_URL)
console.log(localStorage.getItem('token'))
```

### Check 3: Browser Console Errors
- Press F12
- Go to Console tab
- Look for red error messages
- Copy error and check FRONTEND_TROUBLESHOOTING.md

### Check 4: Network Tab
- Press F12
- Go to Network tab
- Look at `/api/projects/` request
- Check status (should be 200)
- Check CORS headers

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| FRONTEND_FIX_COMPLETE.md | Full summary of fixes |
| VERCEL_ENV_SETUP.md | Production deployment |
| FRONTEND_TROUBLESHOOTING.md | Debug guide |
| QUICK_VERIFICATION.md | Testing procedures |
| FRONTEND_FIX_SUMMARY.md | Detailed changes |
| VISUAL_FIX_SUMMARY.md | Visual diagrams |

## 🔑 Key Environment Variables

### Local Development
```
File: frontend/.env.local
VITE_API_URL=https://historiographical-uninjuriously-doreatha.ngrok-free.dev
```

### Vercel Production
```
Set in Vercel Dashboard → Settings → Environment Variables
VITE_API_URL=https://historiographical-uninjuriously-doreatha.ngrok-free.dev
```

## ⚠️ Important Notes

1. **ngrok URL changes**: Free tier URLs expire after 8 hours. If it stops working, restart ngrok and update `VITE_API_URL`

2. **Vercel requires env vars**: `.env.local` does NOT work in Vercel. Must set variables in Vercel dashboard.

3. **CORS is configured**: Backend already includes ngrok URL in CORS allowed origins. No backend changes needed.

4. **Hard refresh on deploy**: After deploying to Vercel, do a hard refresh (Ctrl+Shift+R)

## 📊 Expected Behavior

```
Timeline of a healthy user session:

0ms   → Browser loads app
        ↓
100ms → Frontend code executes
        ↓
500ms → Check auth status
        ├─ NOT authenticated → Redirect to login page
        └─ Authenticated → Load dashboard
        ↓
1000ms → If dashboard: Make API call for projects
        ↓
1500ms → API responds with projects
        ↓
2000ms → Display projects in dashboard
        ↓
Complete ✅
```

## 🎯 Success Criteria

All of these should be true:

- ✅ No blank white screen
- ✅ Login page or dashboard visible
- ✅ Can log in with valid credentials
- ✅ Projects display after login
- ✅ No red errors in browser console
- ✅ API requests show 200 status in network tab
- ✅ Can navigate between pages
- ✅ Error messages appear as toast notifications

## 📞 Still Need Help?

1. Read the detailed docs in the root folder
2. Check browser console (F12)
3. Verify all services are running
4. Check ngrok is still active
5. Verify environment variables are set correctly

**All issues should be resolved. This fix handles the null safety and error handling comprehensively.**

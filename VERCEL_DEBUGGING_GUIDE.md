# 🚀 Vercel Deployment - Debugging Guide

## Problem: Blank Dashboard or "Projects Not Loading" on Vercel

When deployed on Vercel, the app shows:
- ❌ Blank dashboard
- ❌ Projects not loading
- ❌ "Cannot connect to backend" errors

---

## ✅ Vercel Deployment Checklist

### Step 1: Environment Variables in Vercel ⭐ CRITICAL

1. Go to **Vercel Project Dashboard**
2. Click **Settings** → **Environment Variables**
3. Add this variable:

```
VITE_API_URL = https://historiographical-uninjuriously-doreatha.ngrok-free.dev
```

⚠️ **Replace with YOUR ngrok URL** (not the one above)

4. Make sure it's set for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Redeploy** the project (push to GitHub or click "Redeploy" in Vercel)

---

### Step 2: Verify Redeploy Worked

After redeploying:
1. Open the Vercel app in browser
2. Open **DevTools** (F12)
3. Go to **Console** tab
4. Look for logs like:
   ```
   🔍 [Dashboard] Environment Check:
     - VITE_API_URL: https://historiographical-uninjuriously-doreatha.ngrok-free.dev
   ```

If you see `(not set - using /api proxy)` → **Environment variable not set!**

---

### Step 3: Check Network Requests

Still in DevTools:
1. Go to **Network** tab
2. Try to log in with demo account
3. Look for requests to `/api/projects/`
4. Click on the request
5. Check:
   - **Status:** Should be 200 OK
   - **Headers:** Should have `Authorization: Bearer [token]`
   - **Response:** Should show projects data

---

## 🔍 Common Issues & Fixes

### Issue 1: `VITE_API_URL` Not Set

**Symptom:**
```
🔍 [Dashboard] Environment Check:
  - VITE_API_URL: (not set - using /api proxy)
```

**Cause:** Environment variable not added to Vercel

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Add: `VITE_API_URL = https://your-ngrok-url`
3. Redeploy
4. Clear browser cache (Ctrl+Shift+Del)
5. Refresh page

---

### Issue 2: CORS Error

**Symptom in Console:**
```
Access to XMLHttpRequest at 'https://abc123.ngrok-free.dev/api/projects/' 
from origin 'https://your-vercel-app.vercel.app' 
has been blocked by CORS policy
```

**Cause:** Backend doesn't allow Vercel domain

**Fix - Backend Side:**
Edit `backend/app/main.py`:
```python
origins = [
    "http://localhost:3000",
    "http://localhost",
    "http://127.0.0.1",
    "https://your-vercel-app.vercel.app",  # ADD THIS
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then:
1. Commit and push backend changes
2. Backend redeploys (if using Heroku/Railway/etc.)
3. Redeploy frontend on Vercel
4. Clear cache and refresh

---

### Issue 3: ngrok Session Expired

**Symptom:**
```
VITE_API_URL: https://historiographical-uninjuriously-doreatha.ngrok-free.dev
But still getting "Cannot connect"
```

**Cause:** ngrok URL changed (free version resets every 2 hours)

**Fix:**
1. Restart ngrok: `ngrok http 8000`
2. Copy **NEW** ngrok URL
3. Go to Vercel → Settings → Environment Variables
4. **Update** `VITE_API_URL` with new URL
5. Redeploy
6. Clear browser cache and refresh

---

### Issue 4: Mixed HTTPS/HTTP

**Symptom:**
```
🔴 [API Error] message: "Network Error"
```

**Cause:** Vercel (HTTPS) trying to call ngrok with mixed protocols

**Fix:** Both should be HTTPS (they are if using ngrok)

Verify:
- Vercel URL: `https://...` ✅
- ngrok URL: `https://...` ✅
- VITE_API_URL: `https://...` ✅

---

### Issue 5: Projects Loading but Blank

**Symptom:**
- No errors in console
- API calls returning 200 OK
- But dashboard shows nothing

**Cause:** Data structure mismatch or projects don't exist

**Fix:**
1. Check browser console: Look for data in response
2. Create a test project from dashboard (if it loads enough)
3. Or create via backend API:
   ```bash
   curl -X POST http://localhost:8000/api/projects/ \
     -H "Authorization: Bearer [token]" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","description":"Test project"}'
   ```

---

## 🛠️ Debug Steps

### Step 1: Check Console Logs

Open browser DevTools (F12) → Console

Look for:
- ✅ `🔍 [Dashboard] Environment Check:` - Should show VITE_API_URL
- ✅ `🔵 [API] Using ngrok/production URL:` - Shows it's using ngrok
- ❌ `🔴 [API Error]` - Shows what failed

### Step 2: Check Network Requests

DevTools → Network tab

Look for calls to:
- `/api/auth/demo-login` - Should be 200 OK
- `/api/projects/` - Should be 200 OK with data

If failing:
- Check Status (401? 403? 500?)
- Check Response (error message?)
- Check Headers (Authorization header present?)

### Step 3: Test Backend Directly

Try accessing backend directly from browser:
```
https://historiographical-uninjuriously-doreatha.ngrok-free.dev/docs
```

Should show:
- ✅ Swagger API docs
- ✅ Or JSON response

If blank or error → Backend issue, not frontend

---

## 📋 Vercel Environment Variables Template

Copy this to Vercel:

```
# Required - Replace with your ngrok URL
VITE_API_URL=https://your-ngrok-url-here.ngrok-free.dev

# Optional - JIRA Integration (if using JIRA)
VITE_JIRA_URL=https://your-org.atlassian.net/
VITE_JIRA_EMAIL=your-email@company.com
VITE_JIRA_API_TOKEN_1=your_api_token_here
```

---

## 🔑 Key Points for Vercel

1. **Environment variables are build-time** (mostly)
   - Changes require redeploy
   - Can't change at runtime

2. **ngrok URLs expire**
   - Free version: Every 2 hours
   - Need to update Vercel each time

3. **CORS can block requests**
   - Backend must allow Vercel domain
   - Add to `origins` list in backend

4. **Check console logs**
   - Enhanced logging helps debug
   - Look for `🔴` errors

---

## ✅ Full Vercel Deployment Steps

1. **Backend + ngrok running locally**
   ```bash
   # Terminal 1
   python run_server.py
   
   # Terminal 2
   ngrok http 8000
   ```

2. **Frontend code pushed to GitHub**
   ```bash
   git add .
   git commit -m "Fix: Enhanced error handling"
   git push
   ```

3. **Import project in Vercel** (if not already)
   - Go to vercel.com
   - Import GitHub repo

4. **Add Environment Variable**
   - Vercel Dashboard → Settings → Environment Variables
   - Add: `VITE_API_URL = https://your-ngrok-url`

5. **Redeploy**
   - Click "Redeploy" in Vercel
   - Wait for deployment
   - Check logs for errors

6. **Test**
   - Visit: `https://your-project.vercel.app`
   - Open DevTools (F12)
   - Check Console tab
   - Try logging in with demo account

7. **Debug if needed**
   - Check Environment Variables set? ✅
   - Check ngrok running? ✅
   - Check backend accessible? ✅
   - Check CORS enabled? ✅

---

## 📊 Debugging Checklist

- [ ] `VITE_API_URL` set in Vercel? (Check Settings → Env Vars)
- [ ] Vercel redeployed after setting env var?
- [ ] Browser cache cleared? (Ctrl+Shift+Del)
- [ ] ngrok still running? (Check ngrok terminal)
- [ ] Backend still running? (Check backend terminal)
- [ ] DevTools Console open? (F12 → Console)
- [ ] Seeing `VITE_API_URL` in logs? (Should show ngrok URL)
- [ ] Network requests going to ngrok? (DevTools → Network)
- [ ] Backend responding 200 OK? (Check Network responses)

---

## Still Stuck?

1. **Check console logs** (F12 → Console)
2. **Copy error message**
3. **Search in TROUBLESHOOTING_GUIDE.md**
4. **Ask for help** with:
   - Screenshot of console error
   - Network request response
   - VITE_API_URL value (without secrets)

---

## Quick Reference - Vercel vs Local

| Aspect | Local Dev | Vercel Production |
|--------|-----------|-------------------|
| Frontend URL | `localhost:3000` | `your-app.vercel.app` |
| Backend URL | `localhost:8000` | ngrok tunnel |
| API Proxy | Vite proxy works | Must use full URL |
| VITE_API_URL | Optional | **REQUIRED** |
| Env Vars | `.env.local` | Vercel Settings |
| Redeploy | Just restart | Push to GitHub |
| CORS | Not needed | **REQUIRED** |

---

## Resources

- [FRONTEND_SETUP_QUICK_START.md](./FRONTEND_SETUP_QUICK_START.md) - Full setup guide
- [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - General troubleshooting
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick commands


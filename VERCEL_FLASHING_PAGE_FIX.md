# Vercel Deployment - Pages Disappearing/Flashing Issue

## Problem
Pages show briefly and then immediately disappear on Vercel (https://tao-sdlc.vercel.app), but work fine on localhost.

## Root Cause Analysis

### Most Likely Causes (in order):

1. **Environment variables not picked up yet** (Most Common)
   - Cause: You set `VITE_API_URL` in Vercel but haven't redeployed
   - Result: App uses wrong API URL, authentication fails, redirect loop
   - Fix: Redeploy immediately

2. **localStorage not persisted between page loads** (Possible)
   - Cause: Auth token not saved or cleared unexpectedly
   - Result: Every page load redirects to login
   - Fix: Improved auth error handling

3. **API request failing** (Less likely)
   - Cause: ngrok URL expired or wrong URL in environment
   - Result: App crashes silently and redirects
   - Fix: Verify ngrok is running and URL is current

4. **Browser cache issue** (Possible)
   - Cause: Old version of app cached in browser
   - Result: Stale code causes redirect loops
   - Fix: Hard refresh browser cache

## 🚨 Immediate Fix (Do This Now!)

### Step 1: Redeploy Vercel ⚠️ CRITICAL
```
1. Go to https://vercel.com/dashboard
2. Click "tao-sdlc" project
3. Go to "Deployments" tab
4. Find your latest deployment
5. Click the three dots (...)
6. Click "Redeploy"
7. Wait for deployment to complete (look for "Ready" status)
```

### Step 2: Hard Refresh Browser
```
1. Visit https://tao-sdlc.vercel.app
2. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Or: DevTools (F12) → Application → Clear Site Data → Reload
```

### Step 3: Check Browser Console
```
1. Open DevTools (F12)
2. Go to "Console" tab
3. Look for these messages:
   ✅ Good: "🔵 [App] Initialized"
   ✅ Good: "✅ [AuthContext] Auth initialization complete"
   ❌ Bad: RED error messages
```

### Step 4: Log In
```
1. Try logging in with demo account or valid credentials
2. Should NOT see flash/disappear
3. Should stay on dashboard
```

## 🔍 Diagnostic Checklist

Check each of these in order:

### ✅ Vercel Deployment Status
```
1. Dashboard → Deployments
2. Most recent deployment should be "Ready" ✅
3. If it says "Building" or "Error", wait or check error
4. Timestamp should be recent (within last few minutes if you just deployed)
```

### ✅ Environment Variables Set
```
1. Settings → Environment Variables
2. Should see:
   - VITE_API_URL = https://historiographical-uninjuriously-doreatha.ngrok-free.dev
   - VITE_JIRA_URL = (your JIRA URL)
   - VITE_JIRA_EMAIL = (your email)
   - VITE_JIRA_API_TOKEN_2 = (your token)
3. All should have green checkmarks ✓
```

### ✅ App Initializes
Open browser console (F12 → Console) and look for:
```
✅ SHOULD SEE:
🔵 [App] Initialized
   - API URL: https://historiographical-uninjuriously-doreatha.ngrok-free.dev
   - Hostname: tao-sdlc.vercel.app
   - Environment: Production
   - localStorage available: true

✅ THEN SHOULD SEE:
✅ [AuthContext] Loaded user from localStorage
(OR)
⚠️ [AuthContext] No stored token/user found
```

### ✅ Auth Status
```javascript
// Run this in browser console:
console.log('Token:', localStorage.getItem('token') ? 'Present ✅' : 'Missing ❌')
console.log('User:', localStorage.getItem('user') ? 'Present ✅' : 'Missing ❌')
console.log('Authenticated:', localStorage.getItem('token') && localStorage.getItem('user') ? 'YES' : 'NO (need to log in)')
```

### ✅ Network Requests
1. Open DevTools (F12) → Network tab
2. Reload page
3. Look at requests:
   - Should see `projects/` request → Status 200 (or 401 if not authenticated)
   - Should NOT see CORS errors (blocked red requests)

## 🎯 Expected Behavior After Fix

```
Timeline:

1. Visit https://tao-sdlc.vercel.app
   ↓
2. See login page OR dashboard (if already logged in)
   (No flash, no disappear)
   ↓
3. Console shows "🔵 [App] Initialized"
   ↓
4. If not logged in: Can log in successfully
   ↓
5. Dashboard displays with projects
   ↓
6. Can navigate to other pages
   ↓
✅ SUCCESS - No more disappearing pages
```

## 🛠 Troubleshooting Steps

### If Still Seeing Flash/Disappear:

**Step 1: Clear Everything**
```
1. DevTools (F12) → Application → Clear site data (all)
2. Hard refresh: Ctrl+Shift+R
3. Check console again
```

**Step 2: Check Deployment**
```
1. Did Vercel deployment complete? (Check status)
2. Is it actually showing as "Ready"?
3. Try redeploying again if unsure
```

**Step 3: Check Environment Variables**
```
1. Did you SAVE the environment variable?
2. Does the value match exactly?
3. Are you looking at "All Environments"?
4. After changing: Did you redeploy?
```

**Step 4: Check API URL**
```
Run in console:
console.log('API URL:', import.meta.env.VITE_API_URL)

Should show:
https://historiographical-uninjuriously-doreatha.ngrok-free.dev

If it shows "undefined" or empty, environment variable not set
```

**Step 5: Check ngrok**
```
1. Is ngrok still running? (Check terminal)
2. Is the URL still valid? (Visit URL in browser, should show API response)
3. If ngrok stopped: Restart it and update VITE_API_URL

Current ngrok URL:
https://historiographical-uninjuriously-doreatha.ngrok-free.dev
```

**Step 6: Check Console for Errors**
```
1. DevTools (F12) → Console
2. Look for RED error messages
3. Take screenshot of any errors
4. Common errors:
   - "Failed to fetch" → API unreachable
   - "unauthorized" → Auth token invalid
   - "Cannot read property" → Code error (bug)
   - "CORS" → Backend not allowing requests
```

## 🚨 Common Issues & Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| Page flashes then gone | No redeploy after env vars | Redeploy in Vercel |
| Stuck on login page | Token not saved | Clear cache + hard refresh |
| Blank page | API unreachable | Check ngrok running + URL correct |
| Redirect loop | API failed | Check ngrok URL, check logs |
| CSS broken | Build issue | Redeploy or check build logs |

## 📋 Final Checklist

- [ ] Vercel deployment status is "Ready"
- [ ] `VITE_API_URL` environment variable is set
- [ ] Redeployed after setting environment variable
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Cleared browser cache
- [ ] Console shows no RED errors
- [ ] Console shows "🔵 [App] Initialized"
- [ ] ngrok is running and active
- [ ] Can visit ngrok URL directly in browser
- [ ] Can log in successfully
- [ ] Dashboard displays without disappearing
- [ ] Can navigate to other pages

## 📞 If Still Not Working

1. **Check browser console** - Take screenshot of any errors
2. **Check Vercel build logs** - Click deployment → scroll down to see build output
3. **Check backend logs** - Look at uvicorn terminal output
4. **Verify ngrok** - Make sure ngrok is still running with correct URL
5. **Try fresh deploy** - Redeploy from scratch in Vercel

---

**Remember:** Environment variables require a REDEPLOY to take effect in Vercel. This is the #1 reason for issues after setting variables!

# Frontend Troubleshooting - Blank Screen Issue

## Problem: Frontend shows a blank screen

### Root Causes and Solutions:

## 1. Authentication Not Loading
**Symptom:** Redirected to login but login page doesn't render

**Solutions:**
- Clear browser localStorage: Open DevTools (F12) → Application → LocalStorage → Clear all
- Check browser console for errors
- Ensure backend is running and accessible

## 2. API URL Not Configured (CRITICAL)
**Symptom:** Network requests fail or API URL shows as `/api`

**For Local Development:**
- `VITE_API_URL` in `.env.local` is correctly set to ngrok URL
- Current value: `https://historiographical-uninjuriously-doreatha.ngrok-free.dev`

**For Vercel Production:**
- Must set `VITE_API_URL` in Vercel Environment Variables
- Steps:
  1. Go to https://vercel.com/dashboard
  2. Select project → Settings → Environment Variables
  3. Add `VITE_API_URL` with value: `https://historiographical-uninjuriously-doreatha.ngrok-free.dev`
  4. Redeploy the project

## 3. Backend Not Accessible
**Symptom:** API requests fail with network errors

**Checks:**
- Is ngrok running? Command: `ngrok http 8000`
- Is backend running? Port 8000 should have uvicorn process
- Is ngrok URL still valid? (Free tier URLs expire after 8 hours)
- Check backend logs for errors

## 4. CORS Issues
**Symptom:** Network tab shows CORS errors

**Already Fixed in Backend:**
- CORS middleware includes all required origins
- ngrok URL is in the allowed origins list
- Vercel production URL is in the allowed origins list

## 5. Project Loading Error
**Symptom:** Dashboard loads but shows "Failed to load projects"

**Check:**
- Verify authentication token exists: `localStorage.getItem('token')` in console
- Check `/api/projects/` endpoint responds with data
- Look at backend logs for any errors

## Debug Steps:

### In Browser Console (F12):

```javascript
// Check API base URL
console.log(import.meta.env.VITE_API_URL)

// Check if token exists
console.log('Token:', localStorage.getItem('token'))
console.log('User:', localStorage.getItem('user'))

// Check if user is authenticated
console.log('Auth check:', localStorage.getItem('token') && localStorage.getItem('user'))
```

### Check Network Tab:

1. Look for requests to `/api/projects/`
2. Check response status (should be 200)
3. Check response headers for CORS errors
4. Check if Authorization header is present

### Backend Logs:

Look for any error messages in the backend terminal running uvicorn:
- 401/403 errors indicate authentication issues
- 404 errors indicate wrong endpoint
- 500 errors indicate server error

## Fresh Start Procedure:

1. Clear browser cache and localStorage
2. Restart backend: Stop uvicorn and run again
3. Restart ngrok tunnel: Stop and start ngrok
4. Restart frontend dev server: `npm run dev`
5. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Key Environment Variables:

**Development (`.env.local`):**
```
VITE_API_URL=https://historiographical-uninjuriously-doreatha.ngrok-free.dev
```

**Vercel Production (Dashboard Environment Variables):**
```
VITE_API_URL=https://historiographical-uninjuriously-doreatha.ngrok-free.dev
VITE_JIRA_URL=<your-jira-url>
VITE_JIRA_EMAIL=<your-email>
VITE_JIRA_API_TOKEN_2=<your-token>
```

## Recent Fixes Applied:

1. ✅ Fixed `recentProjects` useMemo to handle null/undefined projects
2. ✅ Fixed `loadDocActivity` to validate projects array before spreading
3. ✅ Improved ProtectedRoute to prevent blank screen while redirecting
4. ✅ Changed Dashboard loading check from `!projects` to `loadingProjects` flag
5. ✅ Added better error logging and toast notifications
6. ✅ Enhanced API logging to show which URL is being used

## If Still Not Working:

1. Check browser console for JavaScript errors (red messages)
2. Check Network tab for failed requests (red status codes)
3. Verify all 3 services are running:
   - Backend: `uvicorn app.main:app --reload`
   - ngrok: `ngrok http 8000`
   - Frontend: `npm run dev`
4. Verify CORS configuration in `backend/app/main.py`
5. Check that ngrok URL in `.env.local` matches the active ngrok tunnel

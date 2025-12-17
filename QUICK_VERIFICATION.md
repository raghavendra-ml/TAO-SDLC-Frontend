# Quick Verification - Frontend Fix Working

## How to Verify the Frontend Blank Screen Issue is Fixed

### Local Development Testing (Fastest)

**Prerequisites:**
- Backend running: `uvicorn app.main:app --reload` (port 8000)
- ngrok running: `ngrok http 8000`
- Frontend running: `npm run dev` (port 3000)

**Test Steps:**

1. **Open browser:** http://localhost:3000
2. **Expected result:** Should see login page OR dashboard (if previously logged in)
3. **Check browser console:** `F12` → Console tab
   - Should see: `🔍 [Dashboard] Environment Check:`
   - Should see: `🔵 [API] Using relative proxy URL: /api`
   - Should NOT see any red error messages

4. **Try logging in:**
   - Use demo login or valid credentials
   - Should redirect to dashboard
   - Should load and display projects

5. **Check Dashboard:**
   - Should see "Projects Overview" section
   - Should show project count (Total, In Progress, Completed)
   - Should show "Recent projects" list with actual projects
   - Should NOT show blank screen or hanging loading state

### Production Testing (Vercel)

**Prerequisites:**
- Vercel environment variables configured (see VERCEL_ENV_SETUP.md)
- ngrok running with URL: `https://historiographical-uninjuriously-doreatha.ngrok-free.dev`

**Test Steps:**

1. **Visit:** https://tao-sdlc.vercel.app
2. **Check browser console:** `F12` → Console tab
   - Should see: `🔵 [API] Using ngrok/production URL: https://historiographical-uninjuriously-doreatha.ngrok-free.dev`
3. **Verify login works**
4. **Verify dashboard loads**
5. **Check for any errors in console**

### What to Look For

✅ **Good Signs (Fix Working):**
- Login page loads immediately on first visit
- Can successfully log in with valid credentials
- Dashboard loads with projects displayed
- Console shows proper API URL being used
- No blank screen after login
- Error handling shows proper toast messages

❌ **Bad Signs (Issue Persists):**
- Blank white screen
- Infinite loading spinner
- Console shows JavaScript errors (red messages)
- API URL shows as "undefined" or empty
- CORS errors in console
- Projects don't load (error toast appears)

### Troubleshooting Specific Issues

#### Issue: Still seeing blank screen

1. **Clear cache:**
   ```
   - DevTools → Application → Clear site data
   - Hard refresh: Ctrl+Shift+R (Win) or Cmd+Shift+R (Mac)
   ```

2. **Check browser console:**
   ```
   - F12 → Console tab
   - Look for red error messages
   - Copy error and check FRONTEND_TROUBLESHOOTING.md
   ```

3. **Verify services running:**
   ```
   - Backend: http://localhost:8000 should respond
   - ngrok: Should show "Session Status online"
   - Frontend: http://localhost:3000 should load
   ```

#### Issue: Projects not loading after login

1. **Check API URL:**
   ```javascript
   // In browser console:
   console.log(import.meta.env.VITE_API_URL)
   ```
   - Should show ngrok URL or be empty (using proxy)

2. **Check backend logs:**
   - Look for 200 OK responses for `/api/projects/`
   - If you see 401/403, authentication issue
   - If you see 500, backend error

3. **Check token:**
   ```javascript
   // In browser console:
   console.log(localStorage.getItem('token'))
   ```
   - Should show a token string if logged in

#### Issue: Vercel deployment shows blank screen

1. **Verify environment variables:** Go to Vercel dashboard
   - Settings → Environment Variables
   - Check `VITE_API_URL` is set correctly
   - Should be: `https://historiographical-uninjuriously-doreatha.ngrok-free.dev`

2. **Check ngrok URL is still active:**
   - Visit the ngrok URL directly in browser
   - Should show `{"message":"TAO SDLC API"...}`

3. **Force redeploy:**
   - Click "Redeploy" button in Vercel dashboard
   - Wait for deployment to complete
   - Hard refresh browser

### Performance Baseline

**Expected load times:**
- Login page: < 2 seconds
- Dashboard: < 3-5 seconds (depends on number of projects)
- API responses: < 1 second

If any endpoint takes > 10 seconds, check backend performance.

### Network Inspection

If you want to debug at network level:

1. Open DevTools → Network tab
2. Reload page
3. Look for requests:
   - `GET /api/projects/` - Should return 200 with project data
   - `POST /api/integrations/jira/stats` - May return 401 (JIRA not configured is OK)
4. Check Response headers for:
   - `access-control-allow-origin: *` (CORS header)
   - `content-type: application/json`

### Success Criteria

The fix is working when:

- ✅ No blank screen on login
- ✅ Dashboard loads without JavaScript errors
- ✅ Projects are displayed in the dashboard
- ✅ API URL is correctly determined (proxy or ngrok)
- ✅ Can navigate to different pages
- ✅ No CORS errors in console
- ✅ Authentication works properly

### Still Having Issues?

1. Check `FRONTEND_TROUBLESHOOTING.md` for detailed diagnosis
2. Check `FRONTEND_FIX_SUMMARY.md` to understand what was fixed
3. Verify all environment variables are correctly set
4. Ensure ngrok URL is current (doesn't expire)
5. Check backend logs for any API errors
6. Make sure CORS configuration is correct in backend

### Quick Debug Command

Run this in browser console to get all diagnostics at once:

```javascript
console.log('=== Frontend Diagnostics ===');
console.log('API URL:', import.meta.env.VITE_API_URL || 'using /api proxy');
console.log('Hostname:', window.location.hostname);
console.log('Token:', !!localStorage.getItem('token') ? 'Present' : 'Missing');
console.log('User:', localStorage.getItem('user') ? 'Stored' : 'Not stored');
console.log('=== End Diagnostics ===');
```

All items should be populated or say "using /api proxy". If any show "Missing", the app won't work properly.

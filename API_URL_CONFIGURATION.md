# API URL Configuration Guide

## Overview
The frontend now supports **both local development and production** scenarios with a single codebase. The API URL is dynamically determined based on the `VITE_API_URL` environment variable.

## How It Works

### Smart API URL Resolution
The `getFullApiUrl()` and `getApiBaseUrl()` helpers in `src/services/api.ts` automatically determine which API to use:

```typescript
// If VITE_API_URL is set (with value), use the remote/ngrok URL
if (viteApiUrl && viteApiUrl.trim()) {
  return `${viteApiUrl}/api`
}

// Otherwise, use relative path that proxies through Vite dev server
return '/api'
```

## Setup Instructions

### Option 1: Local Development (WITHOUT ngrok)

**When to use:** You're running the backend locally on `http://localhost:8000`

#### Step 1: Set up frontend `.env.local`
```bash
# Leave VITE_API_URL empty
VITE_API_URL=
```

#### Step 2: Verify Vite proxy configuration
Check `frontend/vite.config.ts` has this proxy setup:
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

#### Step 3: Start services
```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Frontend  
cd frontend
npm run dev
```

#### Step 4: Test locally
- Frontend runs on: `http://localhost:3000`
- API calls go to: `http://localhost:3000/api/*` → proxied → `http://localhost:8000/api/*`
- ✅ This works without any ngrok setup!

---

### Option 2: Production / Remote Backend (WITH ngrok)

**When to use:** Backend is deployed remotely or you're using ngrok tunneling

#### Step 1: Set up ngrok tunnel
```bash
# In backend directory
ngrok http 8000
# Copy the generated URL, e.g., https://historiographical-uninjuriously-doreatha.ngrok-free.dev
```

#### Step 2: Configure frontend `.env.local`
```bash
VITE_API_URL=https://historiographical-uninjuriously-doreatha.ngrok-free.dev
```

#### Step 3: Start frontend
```bash
cd frontend
npm run dev
```

#### Step 4: Test with ngrok
- Frontend runs on: `http://localhost:3000`
- API calls go to: `https://historiographical-uninjuriously-doreatha.ngrok-free.dev/api/*`
- ✅ Works with Vercel deployment!

---

## Testing Both Configurations

### Quick Test: Local Development

1. Make sure `.env.local` has empty `VITE_API_URL`:
```bash
VITE_API_URL=
```

2. Run backend locally:
```bash
cd backend
uvicorn app.main:app --reload
```

3. Run frontend:
```bash
cd frontend
npm run dev
```

4. Open browser and test any API call - should work through Vite proxy

### Quick Test: ngrok Production

1. Update `.env.local`:
```bash
VITE_API_URL=https://your-ngrok-url.ngrok-free.dev
```

2. Backend can run locally OR remotely (ngrok tunnels either way):
```bash
cd backend
uvicorn app.main:app --reload
```

3. Run frontend:
```bash
cd frontend
npm run dev
```

4. Open browser and test - all API calls go through ngrok URL

---

## Deployment to Vercel

When deploying to Vercel:

1. Set environment variable in Vercel dashboard:
   - Name: `VITE_API_URL`
   - Value: Your ngrok URL (e.g., `https://historiographical-uninjuriously-doreatha.ngrok-free.dev`)

2. No need for relative paths - all API calls will use the full ngrok URL

3. If ngrok URL changes, update the Vercel environment variable

---

## Troubleshooting

### Getting 404 errors in production?
- ✅ Make sure `VITE_API_URL` is set in Vercel environment variables
- ✅ Verify the ngrok URL is still active (ngrok URLs expire after a while)
- ✅ Check browser Network tab to confirm requests go to the right domain

### Getting 404 errors locally?
- ✅ Make sure `VITE_API_URL` is empty in `.env.local`
- ✅ Verify backend is running on `http://localhost:8000`
- ✅ Check `vite.config.ts` proxy configuration

### Using wrong API URL?
- ✅ Check browser DevTools → Application → Environment Variables
- ✅ Check `import.meta.env.VITE_API_URL` in browser console
- ✅ Verify `.env.local` file exists and has correct value

---

## Code Changes Summary

### Updated Files:
- ✅ `src/services/api.ts` - Added `getApiBaseUrl()` and `getFullApiUrl()` helpers
- ✅ `src/pages/Phase1Page.tsx` - Uses `getFullApiUrl()` for fetch calls
- ✅ `src/pages/Phase4Page.tsx` - Uses `getFullApiUrl()` for OpenAPI specs
- ✅ `src/pages/Phase5Page.tsx` - Uses `getFullApiUrl()` for deliverables
- ✅ `src/pages/SettingsPage.tsx` - Uses `getFullApiUrl()` for JIRA tests
- ✅ `src/components/DocumentUpload/RequirementUploader.tsx` - Uses `getFullApiUrl()` for file uploads
- ✅ `src/components/modals/SelectStakeholderModal.tsx` - Uses `getFullApiUrl()` for user lookups
- ✅ `.env.local.example` - Added configuration reference

### How It Works:
All fetch/axios calls now use `getFullApiUrl()` which:
1. Checks if `VITE_API_URL` is set
2. If set → returns full ngrok URL with `/api` appended
3. If not set → returns relative path `/api` for Vite proxy

---

## Questions?

- **Why both approaches?** Flexibility - develop locally without ngrok, deploy to production with ngrok
- **Can I switch between them?** Yes! Just edit `.env.local` and restart dev server
- **Does this affect Vercel builds?** No - Vercel will use the environment variables you set in the dashboard

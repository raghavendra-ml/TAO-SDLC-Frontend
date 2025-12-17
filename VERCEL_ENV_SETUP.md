# Vercel Environment Setup Guide

## Important: Frontend Environment Variables for Vercel Deployment

### Required Environment Variables in Vercel Dashboard

Go to your Vercel project settings and add these environment variables:

1. **VITE_API_URL** (Production)
   - Value: Your ngrok URL or backend API URL
   - Example: `https://historiographical-uninjuriously-doreatha.ngrok-free.dev`
   - **This is CRITICAL** - Without this, the frontend will fail to communicate with the backend

2. **VITE_JIRA_URL** (Optional - if using JIRA integration)
   - Value: Your Jira instance URL
   - Example: `https://your-company.atlassian.net`

3. **VITE_JIRA_EMAIL** (Optional - if using JIRA integration)
   - Your Jira email

4. **VITE_JIRA_API_TOKEN_2** (Optional - if using JIRA integration)
   - Your Jira API token

### Steps to Set in Vercel:

1. Go to https://vercel.com/dashboard
2. Select your project (tao-sdlc)
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Name: `VITE_API_URL`
   - Value: `https://historiographical-uninjuriously-doreatha.ngrok-free.dev`
   - Environments: Check all (Production, Preview, Development)
5. Click "Save"
6. **Redeploy** your project for changes to take effect

### Why This is Important:

- The `.env.local` file only works for local development
- Vercel doesn't use `.env` files from your repository (security feature)
- During build time, Vite will use these environment variables to build the correct API URLs
- If `VITE_API_URL` is not set, the frontend will try to use `/api` proxy which won't work on Vercel

### Troubleshooting:

If you still see a blank screen after setting environment variables:

1. Check browser console (F12) for errors
2. Ensure `VITE_API_URL` matches your actual backend URL
3. Verify the backend is accessible from the frontend (check CORS headers)
4. Check that the ngrok URL is still active (ngrok URLs expire after 8 hours if using free tier)
5. Force a new deployment: Click "Redeploy" in Vercel dashboard

### Current ngrok URL:

```
https://historiographical-uninjuriously-doreatha.ngrok-free.dev
```

**Note:** This ngrok URL will expire. When it does, start ngrok again and update this environment variable in Vercel.

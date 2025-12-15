# Vercel Deployment Setup Guide

## Problem
When deployed to Vercel, the frontend shows "Failed to load projects" because it can't connect to the backend API.

## Solution: Set Environment Variables in Vercel

### Step 1: Get Your Backend URL
You need a publicly accessible backend URL. Options:
- **Using ngrok** (recommended for development):
  ```bash
  ngrok http 8000
  # Copy the HTTPS URL, e.g., https://abc-123-def.ngrok.io
  ```
- **Using your deployed backend** (if you have a production backend)

### Step 2: Add Environment Variable to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **TAO-SDLC-Frontend**
3. Click **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-ngrok-url.ngrok.io` (replace with your actual ngrok URL)
   - **Environments:** Select "Production" (and "Preview" if needed)
5. Click **Save**

### Step 3: Redeploy

After setting the environment variable:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Redeploy** button
4. Wait for deployment to complete
5. Visit your Vercel app - it should now load projects!

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API URL for production | `https://abc-123-def.ngrok.io` |
| `VITE_JIRA_URL` | JIRA instance URL (optional) | `https://your-org.atlassian.net/` |
| `VITE_JIRA_EMAIL` | JIRA email (optional) | `you@example.com` |
| `VITE_JIRA_API_TOKEN_1` | JIRA API token (optional) | Your token |
| `VITE_JIRA_API_TOKEN_2` | JIRA API token (optional) | Your token |

## How It Works

- **localhost (dev):** Uses Vite proxy → `http://localhost:8000`
- **Vercel (prod):** Uses `VITE_API_URL` environment variable → your backend URL

## Troubleshooting

### Still getting "Failed to load projects"?

1. **Check network tab in browser DevTools:**
   - Open DevTools (F12) → Network tab
   - Try to load projects
   - Look for failed requests to `/api/projects`
   - Check the error message

2. **Verify backend is accessible:**
   ```bash
   curl https://your-ngrok-url.ngrok.io/api/projects
   # Should return 401 (needs auth) or 200 (with auth)
   ```

3. **Check Vercel build logs:**
   - Go to Deployments → Click latest → View Function Logs
   - Look for any errors about environment variables

### ngrok URL keeps changing?

Use ngrok's static domain feature:
- Sign up for ngrok account
- Use command: `ngrok http 8000 --domain your-static-domain.ngrok.io`

Or use a custom backend URL if you have one deployed.

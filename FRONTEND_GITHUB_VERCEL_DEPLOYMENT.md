# Frontend Deployment: GitHub + Vercel

## Overview
Push frontend code to GitHub and auto-deploy to Vercel for production hosting.

---

## Step 1: Prepare Frontend Repository

### 1.1 Create `.gitignore` for Frontend

Create `frontend/.gitignore`:
```
# Dependencies
node_modules
.pnp
.pnp.js

# Build
dist
build

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode
.idea
*.swp
*.swo
*~
.DS_Store

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Testing
coverage

# Cache
.eslintcache
.turbo
```

### 1.2 Create `.env.example` for Reference

Create `frontend/.env.example`:
```env
# API Configuration
VITE_API_URL=http://localhost:8000

# For Production (Vercel)
# VITE_API_URL=https://your-backend-api-url
```

### 1.3 Update `vite.config.ts` for Production

Update `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
})
```

### 1.4 Update `package.json` with Vercel Config

Ensure `frontend/package.json` has:
```json
{
  "name": "tao-sdlc-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## Step 2: Push to GitHub

### 2.1 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `TAO-SDLC-Frontend` (or your preference)
3. Description: "Frontend for TAO SDLC Application"
4. Choose **Public** (if you want, can be Private)
5. Initialize with README
6. Click "Create repository"

### 2.2 Initialize Git and Push

In your project root (one level up from `frontend`):

```powershell
# Initialize git (if not already done)
git init

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/TAO-SDLC-Frontend.git

# Configure git
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create a .gitignore at project root (if needed)
# Add backend/ and other folders you don't want to push:
```

Create `.gitignore` at root:
```
backend/
database/
*.md
!README.md
.env*
.vscode
.DS_Store
```

### 2.3 Push Frontend Only

```powershell
# Stage only frontend directory
git add frontend/
git commit -m "Initial commit: Frontend code for TAO SDLC"
git branch -M main
git push -u origin main
```

### 2.4 Verify on GitHub

1. Go to your repository: `https://github.com/YOUR_USERNAME/TAO-SDLC-Frontend`
2. Verify only frontend files are pushed
3. Check that `.env` files are NOT included (secure!)

---

## Step 3: Deploy to Vercel

### 3.1 Create Vercel Account

1. Go to https://vercel.com/signup
2. Sign up with GitHub (recommended - easier integration)
3. Follow setup wizard

### 3.2 Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Search and select `TAO-SDLC-Frontend`
5. Click "Import"

### 3.3 Configure Build Settings

**Project Settings:**

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `./` (or `frontend/` if separate) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 3.4 Set Environment Variables

On Vercel Dashboard → Project Settings → Environment Variables:

Add variable:
```
Name: VITE_API_URL
Value: https://your-backend-ngrok-url-or-production-api
```

⚠️ **Important:** Use your actual backend URL (ngrok for testing, production API for live)

Click "Save"

### 3.5 Deploy

1. Click "Deploy" button
2. Wait for build to complete (usually 1-3 minutes)
3. You'll get a production URL: `https://your-app.vercel.app`

---

## Step 4: Configure Backend for Production

### 4.1 Update CORS in Backend

Edit `backend/app/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://your-app.vercel.app",  # Your Vercel domain
        "https://*.ngrok.io",  # ngrok tunnels
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4.2 Update API Client in Frontend

Ensure your API service uses environment variables:

Check files in `frontend/src/services/` or `frontend/src/utils/`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

## Step 5: Update and Redeploy

### Every time you make frontend changes:

```powershell
cd frontend

# Make your changes
# Test locally
npm run dev

# Build to verify
npm run build

# Commit and push
git add .
git commit -m "Feature: Description of changes"
git push origin main
```

**Vercel automatically redeploys** when you push to main branch!

Check deployment status: https://vercel.com/dashboard/projects

---

## Step 6: Custom Domain (Optional)

1. **Buy a domain** from Namecheap, GoDaddy, etc.
2. In Vercel Dashboard → Project Settings → Domains
3. Click "Add Domain"
4. Enter your domain
5. Follow DNS configuration steps

---

## Troubleshooting

### Issue: Build fails on Vercel

**Check:**
- Package.json has correct build script
- All dependencies in package.json
- No hardcoded localhost URLs in code

**Fix:**
```powershell
npm install  # verify locally
npm run build  # test build locally
```

### Issue: API calls fail after deployment

**Check:**
- `VITE_API_URL` environment variable is set in Vercel
- Backend URL is correct and accessible
- CORS is configured on backend

**Fix:**
```typescript
// Debug: Check what URL is being used
console.log('API URL:', import.meta.env.VITE_API_URL);
```

### Issue: Static files not loading

**Check Vercel Settings:**
- Output Directory: `dist`
- Build Command: `npm run build`

---

## Post-Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Vercel project created and deployed
- [ ] Environment variables set in Vercel
- [ ] Backend CORS configured
- [ ] Test API calls from Vercel domain
- [ ] Custom domain configured (optional)
- [ ] Monitoring setup (Vercel Analytics)

---

## Deployment Commands Summary

```powershell
# Development
npm run dev

# Build locally to verify
npm run build
npm run preview

# Deploy (automatic via git push)
git add .
git commit -m "message"
git push origin main
```

---

## Important Notes

✅ **What gets deployed:**
- Frontend React app (TypeScript/Vite)
- Static assets, images, CSS

❌ **What does NOT get deployed:**
- Backend Python code (runs locally with ngrok)
- Database (runs locally PostgreSQL)
- Environment variables (set separately in Vercel)

🔐 **Security:**
- Never commit `.env` files
- Use Vercel's secret management for sensitive data
- Keep GitHub repository visibility appropriate
- Rotate API keys regularly

---

## Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repository:** https://github.com/YOUR_USERNAME/TAO-SDLC-Frontend
- **Production URL:** https://your-app.vercel.app
- **Backend ngrok URL:** https://your-ngrok-url

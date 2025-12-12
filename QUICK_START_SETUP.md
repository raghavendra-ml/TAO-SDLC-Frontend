# Quick Start Guide: Local Backend + Vercel Frontend

## 🚀 Setup Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Development Setup                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Backend (Local)          Frontend (Local)                 │
│  Port: 8000              Port: 3000                        │
│  └─ ngrok tunnel         └─ connects to ngrok URL          │
│     ↓                                                       │
│  https://xxx-us.ngrok.io ← Public URL for testing         │
│                                                             │
│  Production: Vercel       Backend: Production API          │
│  https://app.vercel.app   https://api.yourdomain.com       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Quick Checklist

### Backend Setup (5 minutes)
- [ ] `pip install -r requirements.txt` in `backend/`
- [ ] Create `backend/.env` with DATABASE_URL
- [ ] Run `python run_server.py` → runs on localhost:8000
- [ ] Install ngrok: `choco install ngrok`
- [ ] Run `ngrok http 8000` in separate terminal
- [ ] Copy the HTTPS URL shown

### Frontend Setup (5 minutes)
- [ ] Create `frontend/.env.local` with ngrok URL
- [ ] `npm install` in `frontend/`
- [ ] `npm run dev` → runs on localhost:3000
- [ ] Test API calls work

### GitHub Setup (3 minutes)
- [ ] Create new repo: https://github.com/new
- [ ] Name: `TAO-SDLC-Frontend`
- [ ] Clone to local
- [ ] Copy frontend/ files into it
- [ ] `git push` to main branch

### Vercel Setup (3 minutes)
- [ ] Sign up: https://vercel.com/signup (use GitHub)
- [ ] Import project from GitHub
- [ ] Set `VITE_API_URL` environment variable
- [ ] Click Deploy → Done! ✅

---

## 🎯 Commands Cheat Sheet

### Terminal 1: Backend
```powershell
cd backend
python run_server.py
# Runs on http://localhost:8000
```

### Terminal 2: ngrok
```powershell
ngrok http 8000
# Copy HTTPS URL from output
```

### Terminal 3: Frontend
```powershell
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Push to GitHub
```powershell
git add frontend/
git commit -m "Initial commit"
git push origin main
```

---

## 🔑 Key Files to Update

### 1. `backend/.env`
```env
DATABASE_URL=postgresql://admin_user:password@localhost/sdlc
OPENAI_API_KEY=your_key
GITHUB_TOKEN=your_token
```

### 2. `frontend/.env.local`
```env
VITE_API_URL=https://abc123-us.ngrok.io
```

### 3. `frontend/vite.config.ts`
Proxy setting:
```typescript
proxy: {
  '/api': {
    target: process.env.VITE_API_URL || 'http://localhost:8000',
  },
}
```

### 4. Backend CORS (`backend/app/main.py`)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.ngrok.io"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📍 Access URLs

| Service | Local | Production |
|---------|-------|-----------|
| Backend API | http://localhost:8000 | Your backend URL |
| Backend Docs | http://localhost:8000/docs | Your backend URL/docs |
| Frontend | http://localhost:3000 | https://app.vercel.app |
| ngrok Tunnel | - | https://xxx-us.ngrok.io |

---

## ⚠️ Important Notes

1. **ngrok URL changes every 2 hours** (free tier)
   - Update `frontend/.env.local` when it changes
   - OR upgrade to paid plan for static URL

2. **Never commit .env files**
   - Git will ignore them (check `.gitignore`)
   - Only commit `.env.example`

3. **CORS must be configured**
   - Backend needs to allow frontend domain
   - Production: allow Vercel domain
   - Development: allow localhost:3000 and ngrok

4. **Environment variables for Vercel**
   - Set in Vercel Dashboard → Project Settings
   - Use `VITE_` prefix for frontend variables
   - Must restart deployment after changing

---

## 🐛 Troubleshooting

### "Cannot connect to backend"
- ✅ Backend running? Check terminal 1
- ✅ ngrok running? Check terminal 2
- ✅ ngrok URL in .env.local? Check frontend env

### "CORS error"
```
Access to XMLHttpRequest blocked by CORS policy
```
→ Add your frontend URL to backend CORS allowed_origins

### "ngrok URL not working"
- ngrok might have expired (2 hour limit on free)
- Re-run `ngrok http 8000` and update .env.local

### "Build fails on Vercel"
- Check build logs: Vercel Dashboard → Deployments
- Verify `npm run build` works locally
- Check package.json has all dependencies

---

## 📚 Full Documentation

- **Backend + ngrok:** See `BACKEND_NGROK_SETUP.md`
- **Frontend deployment:** See `FRONTEND_GITHUB_VERCEL_DEPLOYMENT.md`

---

## ✅ Success Indicators

1. Backend shows "Application startup complete"
2. ngrok shows "Forwarding https://..."
3. Frontend loads on localhost:3000
4. API calls appear in Network tab going to ngrok URL
5. GitHub repo shows frontend files
6. Vercel deployment shows "Ready"
7. https://app.vercel.app loads without errors

---

Last updated: December 12, 2025

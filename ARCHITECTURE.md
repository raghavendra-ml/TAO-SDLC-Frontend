# Frontend Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          User's Browser                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐          ┌──────────────────┐                      │
│  │  React App      │          │  localStorage    │                      │
│  │  (Port 3000)    │  ←────→  │  (tokens, config)│                      │
│  └─────────────────┘          └──────────────────┘                      │
│         │                                                                 │
│         ├─ LoginPage.tsx                                                │
│         ├─ Dashboard.tsx                                                │
│         ├─ DiagnosticsPage.tsx  ← NEW                                   │
│         └─ Other pages                                                  │
│                                                                           │
│  ┌──────────────────────────────────────────────────┐                   │
│  │ API Service Layer (src/services/api.ts)          │                   │
│  │  • getApiBaseUrl()                               │                   │
│  │  • healthCheck() ← NEW                           │                   │
│  │  • Request interceptors                          │                   │
│  │  • Response error handling ← IMPROVED             │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                           │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      │ HTTP/HTTPS
                                      │
                  ┌─────────────────────────────────────────┐
                  │                                          │
           ┌──────▼──────────┐                  ┌──────────▼────┐
           │  ngrok Tunnel   │                  │  Local Proxy  │
           │  (production)   │                  │  (localhost)  │
           └────────┬────────┘                  └───────┬───────┘
                    │                                   │
        ┌───────────┴───────────┬───────────────────────┘
        │                       │
        │                       │
   ┌────▼─────┐            ┌────▼─────┐
   │ ngrok     │            │ Localhost│
   │ URL       │            │:8000     │
   │           │            │(proxy)   │
   └────┬─────┘            └────┬─────┘
        │                       │
        └───────────┬───────────┘
                    │
              ┌─────▼──────┐
              │   Backend  │
              │  (Port 8000)
              │  (Flask/   │
              │   FastAPI) │
              └─────┬──────┘
                    │
              ┌─────▼──────┐
              │ Database   │
              │(PostgreSQL)│
              └────────────┘
```

---

## Request Flow - Login to Dashboard

```
USER CLICK: "Try Demo Account"
            │
            ▼
┌─────────────────────────────┐
│ handleDemoLogin()           │
│ (LoginPage.tsx)             │
└────────────┬────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Check VITE_API_URL env variable  │
└────────────┬─────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─ ngrok? ─┐  ┌─ Localhost? ─┐
│ Use that  │  │ Use /api      │
│ URL       │  │ proxy         │
└────┬──────┘  └────┬──────────┘
     │              │
     └──────┬───────┘
            │
            ▼
     API CALL: POST /api/auth/demo-login
     (with Authorization header)
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌─SUCCESS──┐  ┌─ERROR─────────────┐
│ 200 OK   │  │ Network Error ❌   │
└────┬─────┘  │ or 4xx/5xx ❌      │
     │        └────┬──────────────┘
     │             │
     ▼             ▼
 GET Token    ┌──────────────────────────┐
 SAVE to      │ Error Handler (IMPROVED) │
 localStorage │                          │
 REDIRECT to  │ Detects error type       │
 Dashboard    │ Shows specific message   │
              │ (instead of generic)     │
              │                          │
              │ "Cannot connect to       │
              │  backend at [URL].       │
              │  Make sure:              │
              │  1. Backend running      │
              │  2. ngrok running        │
              │  3. URL is correct"      │
              │                          │
              └────┬────────────────────┘
                   │
                   ▼
              toast.error(msg)
              User sees guidance
```

---

## Dashboard Initialization Flow

```
┌─ Dashboard Component Mounts
│
├─ Run Diagnostic: [Environment Check]
│  ├─ Check: VITE_API_URL set?
│  ├─ Check: Token in localStorage?
│  └─ Show: Which API URL being used
│
├─ Load Step 1: Projects
│  ├─ Try: GET /api/projects/
│  ├─ If error → Detect if network issue
│  ├─ If network error → Show helpful message
│  └─ Show: Loading spinner or error
│
├─ Load Step 2: JIRA Stats (from cache)
│  ├─ Try: Get from localStorage first
│  ├─ If missing → Use default
│  └─ Show: Cached/default JIRA stats
│
├─ Load Step 3: Connect to JIRA
│  ├─ Try: POST /api/jira/stats
│  ├─ If error → Set error state (NOT blocking)
│  ├─ If success → Update JIRA stats
│  └─ Show: Either stats or "not connected" message
│
└─ Render Dashboard
   ├─ If projects error → Show error card
   ├─ Projects list OR loading OR error
   ├─ JIRA stats OR loading OR "not connected"
   └─ All sections render safely (no crashes)
```

---

## Error Handling Architecture

```
┌─────────────────────────────────────┐
│   API Request Made                  │
│   (axios call)                      │
└────────────┬────────────────────────┘
             │
             ▼
    ┌──────────────────┐
    │ Request sent to: │
    │ • ngrok URL      │
    │ • Local proxy    │
    │ • Direct URL     │
    └────────┬─────────┘
             │
    ┌────────┴──────────┐
    │                   │
    ▼                   ▼
┌─RESPONSE──┐    ┌─ERROR─────────────────┐
│ 200 OK ✅  │    │ Network Error? ❌     │
│ Data      │    │ Timeout? ❌           │
│ returned  │    │ CORS? ❌              │
└────┬─────┘    │ Connection refused? ❌│
     │          └────┬──────────────────┘
     │               │
     └───────┬───────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Error Interceptor (IMPROVED) │
    ├──────────────────────────────┤
    │ Check error type:            │
    ├──────────────────────────────┤
    │ 401 → Clear auth, redirect   │
    │       to login               │
    │                              │
    │ Network → Show:              │
    │       "Cannot reach backend" │
    │       + suggestions          │
    │                              │
    │ 4xx/5xx → Show:              │
    │       API error message      │
    │       from server            │
    │                              │
    │ Other → Show:                │
    │       "Unknown error"        │
    │       + check console        │
    └──────────────┬───────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Route to caller:    │
        │ • toast.error()     │
        │ • console.error()   │
        │ • setError(state)   │
        │ • Render UI hint    │
        └─────────────────────┘
```

---

## Diagnostics Flow

```
USER: Visit /diagnostics
            │
            ▼
┌─────────────────────────────────────┐
│ DiagnosticsPage Component Mounts    │
└────────────┬────────────────────────┘
             │
    ┌────────┴───────┬───────────┬──────────────┐
    │                │           │              │
    ▼                ▼           ▼              ▼
┌─CHECK 1──┐  ┌─CHECK 2──┐  ┌─CHECK 3──┐  ┌─CHECK 4──┐
│Environment
│          │  │Backend   │  │Auth      │  │API       │
│          │  │          │  │Token     │  │Health    │
├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤
│• Read    │  │• Fetch   │  │• Check   │  │• Call    │
│  VITE_   │  │  /health/│  │  localStorage
│  API_URL │  │• Check   │  │  for     │  │• Check   │
│• Check   │  │  status  │  │  'token' │  │  status  │
│  Token   │  │• Network │  │• Show:   │  │• Show:   │
│• Show:   │  │  error?  │  │  Yes/No  │  │  Pass/   │
│  Env     │  │• Show:   │  │• Message │  │  Fail    │
│  URL     │  │  Pass/   │  └──────────┘  └──────────┘
│          │  │  Fail    │
└──────────┘  │  Message │
              └──────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─RENDER ALL──┐  ┌─SHOW TIPS──┐
│ Statuses    │  │ • Check if  │
│ with icons: │  │   backend   │
│ ✅ Pass     │  │   running   │
│ ❌ Fail     │  │ • ngrok     │
│ ⏳ Pending   │  │   running   │
└─────────────┘  │ • URL       │
                 │   correct   │
                 └─────────────┘
```

---

## Improved Error Messages

```
Before:
┌─────────────────────────────────┐
│ Network Error                   │
│ (User: "How do I fix this?")    │
└─────────────────────────────────┘

After:
┌───────────────────────────────────────────────────┐
│ Cannot connect to backend at                       │
│ https://abc123-def456.ngrok-free.dev              │
│                                                   │
│ Check that:                                       │
│ 1. Backend server is running                      │
│    → Start with: python run_server.py             │
│                                                   │
│ 2. ngrok is running and has that URL             │
│    → Start with: ngrok http 8000                  │
│                                                   │
│ 3. Your .env.local is correct                     │
│    → Set: VITE_API_URL=https://[ngrok-url]       │
│                                                   │
│ See: FRONTEND_SETUP_QUICK_START.md               │
│ Or visit: /diagnostics for system checks         │
└───────────────────────────────────────────────────┘
(User: "Now I know what to do!")
```

---

## Configuration Hierarchy

```
Priority Order (first match wins):

1. VITE_API_URL environment variable (highest priority)
   ├─ From .env.local (development)
   ├─ From .env.production (production)
   └─ From Vercel environment settings (deployed)

2. Local proxy (fallback)
   └─ Routes /api to http://localhost:8000
      (Only works in development with Vite)

3. Error
   └─ Cannot reach backend
```

---

## Component Hierarchy

```
App.tsx
├─ AuthProvider
│  └─ ProtectedRoute
│     ├─ Layout
│     │  ├─ Dashboard.tsx (IMPROVED)
│     │  ├─ ProjectPage.tsx
│     │  ├─ Phase1Page.tsx
│     │  └─ ...other pages
│     │
│     └─ Other Protected Routes
│
├─ LoginPage.tsx (IMPROVED)
│
└─ DiagnosticsPage.tsx (NEW - public route)
```

---

## File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx              [IMPROVED]
│   │   ├── LoginPage.tsx              [IMPROVED]
│   │   ├── DiagnosticsPage.tsx        [NEW]
│   │   └── ...other pages
│   │
│   ├── services/
│   │   └── api.ts                     [IMPROVED + NEW healthCheck]
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx            [unchanged]
│   │
│   ├── components/
│   │   └── ...components
│   │
│   └── App.tsx                        [IMPROVED - added /diagnostics]
│
├── .env.local                         [USER EDITS - set VITE_API_URL]
├── .env.example                       [reference only]
├── .env.production                    [production settings]
│
└── Documentation/
    ├── FRONTEND_SETUP_QUICK_START.md [NEW]
    ├── TROUBLESHOOTING_GUIDE.md      [NEW]
    ├── QUICK_REFERENCE.md            [UPDATED]
    ├── DASHBOARD_FIX_SUMMARY.md      [NEW]
    ├── FIX_VALIDATION.md             [NEW]
    └── SETUP_COMPLETE.md             [NEW]
```

---

## Technology Stack Flow

```
┌─────────────────────────────────────────────────┐
│ User's Browser                                   │
├─────────────────────────────────────────────────┤
│ React 18 (UI Library)                           │
│ ├─ Components (.tsx files)                      │
│ ├─ State (Zustand, useState)                    │
│ └─ Effects (useEffect)                          │
│                                                  │
│ TypeScript (Type Safety)                        │
│ ├─ Interfaces (types/)                          │
│ └─ Type checking at compile time                │
│                                                  │
│ Axios (HTTP Client)                             │
│ ├─ Request interceptors                         │
│ ├─ Response interceptors                        │
│ └─ Error handling                               │
│                                                  │
│ React Router (Navigation)                       │
│ ├─ Routes                                       │
│ ├─ Link navigation                              │
│ └─ Protected routes                             │
│                                                  │
│ Tailwind CSS (Styling)                          │
│ └─ Utility-first CSS classes                    │
│                                                  │
│ Zustand (State Management)                      │
│ └─ Global state (projects, user, etc.)         │
│                                                  │
│ Lucide React (Icons)                            │
│ └─ SVG icons library                            │
└─────────────────────────────────────────────────┘
        │
        │ Vite Build Tool
        │ ├─ Dev server (localhost:3000)
        │ ├─ HMR (Hot Module Reload)
        │ └─ Production bundle
        │
        ▼
        Network (HTTP/HTTPS)
        │
        ▼
    Backend APIs (FastAPI/Flask)
```

---

## Summary

- **Frontend is modern, React-based, and well-structured**
- **Error handling is centralized in api.ts and components**
- **Diagnostics page provides visibility into system state**
- **Documentation guides users through setup and troubleshooting**
- **Multiple configuration options (ngrok, local, production)**
- **All improvements are backward compatible**


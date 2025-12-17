# 🔐 HARDCODED TOKENS - QUICK REFERENCE GUIDE

## 📍 ALL FILES WITH HARDCODED CREDENTIALS

### 🔴 CRITICAL - IMMEDIATE ACTION REQUIRED

| File | Line(s) | Token Type | Severity | Issue |
|------|---------|-----------|----------|-------|
| `backend/.env` | 2 | OpenAI API Key | 🔴 CRITICAL | **Visible in repo** |
| `backend/app/config.py` | 17 | GitHub PAT | 🔴 CRITICAL | **In source code** |
| `frontend/src/pages/Phase2Page.tsx` | 58 | JIRA API Token | 🔴 CRITICAL | **Client-side (browser)** |
| `frontend/src/pages/Dashboard.tsx` | 110 | JIRA API Token | 🔴 CRITICAL | **Client-side (browser)** |
| `frontend/src/pages/ProjectsPage.tsx` | 29, 267 | JIRA API Token | 🔴 CRITICAL | **Client-side (browser) - 2 instances** |
| `backend/.env` | 8 | JWT Secret | 🟠 HIGH | **Weak placeholder** |
| `database/schema.sql` | 133+ | DB Credentials | 🟠 HIGH | **Sample data** |

---

## 📊 RISK BREAKDOWN

### By Token Type:
```
OpenAI Key:        🔴 Can drain billing unlimited
GitHub PAT:        🔴 Full repo control + code injection
JIRA Token:        🔴 Can steal project data
JWT Secret:        🟠 Can hijack sessions
DB Credentials:    🟠 Can access database
```

### By Impact:
```
🔴 CRITICAL (Stop everything):
   - 3x JIRA tokens in FRONTEND (visible to users)
   - OpenAI key in .env
   - GitHub PAT in config.py

🟠 HIGH (Fix soon):
   - JWT secret weak value
   - Sample DB credentials exposed
```

---

## ⚡ THE BIGGEST PROBLEM

### **JIRA Tokens in Frontend = EVERYONE Sees It**

```javascript
// ❌ VULNERABLE CODE
const [jiraConfig, setJiraConfig] = useState({
  url: 'https://taodigitalsolutions-team-x1wa6h9b.atlassian.net/',
  email: 'raghavendra.thummala@taodigitalsolutions.com',
  apiToken: 'ATATT3xFfGF0T2Z-B7PmOkls4OUNAdSEQnjGaYlk-...' // 😱 VISIBLE
})
```

**Why this is dangerous:**
1. Token visible in browser DevTools
2. Token visible in Network tab (API calls)
3. Token stored in localStorage (unencrypted)
4. Token in browser memory (malware can steal)
5. **ALL USERS can see it**
6. Bots scrape public repos and find it

---

## 🛡️ WHAT ATTACKERS CAN DO

| Token | Attacker Can | Cost to You |
|-------|------------|-----------|
| **OpenAI Key** | Drain API quota, spam requests, exfiltrate data | $100-$10,000+ |
| **GitHub PAT** | Push malicious code, delete repos, steal code | **Catastrophic** |
| **JIRA Token** | Steal project specs, modify tickets, view roadmaps | **Competitive loss** |
| **JWT Secret** | Impersonate any user, bypass login | **Complete breach** |

---

## ✅ WHAT YOU MUST DO

### **IMMEDIATELY (Before Any Push):**

```bash
# 1. Regenerate ALL tokens
#    - OpenAI: https://platform.openai.com/account/api-keys
#    - GitHub: https://github.com/settings/tokens  
#    - JIRA: https://id.atlassian.com/manage-profile/security/api-tokens

# 2. Create .gitignore
echo ".env" >> .gitignore
echo "backend/.config.json" >> .gitignore

# 3. Remove .env from git history
git rm --cached backend/.env

# 4. Update config.py (remove DEFAULT_GITHUB_TOKEN)

# 5. Move JIRA tokens to backend (not frontend!)

# 6. Run secret scan
# npm install -g trufflehog
# trufflehog filesystem . --json
```

### **BEFORE PUSHING:**

```bash
# Verify secrets are gone
git status  # Should not show .env
git log -p | grep "sk-proj-"  # Should be empty
git log -p | grep "github_pat_"  # Should be empty
git log -p | grep "ATATT"  # Should be empty
```

---

## 📂 FILES TO MODIFY

### **Backend Changes:**
```python
# ❌ backend/app/config.py (CURRENT - BAD)
DEFAULT_GITHUB_TOKEN = "github_pat_11BOYQOSA0Z..."

# ✅ backend/app/config.py (SHOULD BE)
DEFAULT_GITHUB_TOKEN = None  # Removed hardcoding
# Use: os.getenv('GITHUB_TOKEN') instead
```

### **Frontend Changes:**
```tsx
// ❌ frontend/src/pages/Phase2Page.tsx (CURRENT - BAD)
const [jiraConfig, setJiraConfig] = useState({
  apiToken: 'ATATT3xFfGF0T2Z-...' // In source code
})

// ✅ frontend/src/pages/Phase2Page.tsx (SHOULD BE)
const [jiraConfig, setJiraConfig] = useState(null)
useEffect(() => {
  // Fetch from backend (token stays secure)
  api.get('/api/jira-config').then(r => setJiraConfig(r.data))
}, [])
```

### **Files to Create:**
```
.gitignore               (NEW - block .env files)
.env.example             (NEW - template for .env)
SECURITY.md              (NEW - security policy)
```

---

## 🚨 GITHUB-SPECIFIC RISKS

If you push with credentials:
1. ⚠️ **GitHub auto-detects** exposed secrets
2. ⚠️ **GitHub notifies** you (uncomfortable conversation)
3. ⚠️ **GitHub revokes** the tokens automatically
4. ⚠️ **Repo flagged** as compromised
5. ⚠️ **Git history** keeps the secrets forever
6. ⚠️ **Attackers** can fork and use before revocation

---

## 📋 FINAL CHECKLIST BEFORE PUSH

```
□ Regenerated OpenAI key
□ Regenerated GitHub PAT
□ Regenerated JIRA tokens
□ Regenerated JWT secret
□ Created .gitignore with .env and .config.json
□ Removed hardcoded GitHub PAT from config.py
□ Removed hardcoded JIRA tokens from Frontend
□ Created .env.example with placeholders
□ Verified .env is NOT in git staging
□ Ran: git log -p | grep "sk-proj-" (should be empty)
□ Ran: git log -p | grep "github_pat_" (should be empty)
□ Ran: git log -p | grep "ATATT" (should be empty)
□ Set GitHub Secrets for CI/CD pipelines
□ Updated documentation with setup steps
□ Got security review approval
```

---

## 🔥 DO NOT PUSH WITHOUT FIXING!

**Consequences of ignoring this:**
- Security breach within hours
- Attackers abuse your API keys
- Reputation damage
- Compliance violations
- Costly cleanup required

**Time to fix: 2-4 hours**  
**Cost of breach: $10,000+**

---

**For detailed analysis, see:** `SECURITY_ANALYSIS_HARDCODED_TOKENS.md`

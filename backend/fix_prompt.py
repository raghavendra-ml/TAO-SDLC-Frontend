#!/usr/bin/env python3
"""Replace old generation_instructions with clean version (NO HARDCODED EXAMPLES)"""
import re

# Read with UTF-8 encoding
with open('app/services/ai_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# New clean prompt with NO hardcoded examples
new_prompt = '''Your task: Analyze Phase 1 requirements and decompose into strategic microservice epics.
NO assumptions. NO defaults. ONLY from Phase 1 content.

---

**STEP 1: EXTRACT REQUIREMENTS FROM PHASE 1** (PURE DATA EXTRACTION)

Read Phase 1 completely and extract ONLY what is explicitly mentioned:

1. **BUSINESS ENTITIES & OPERATIONS**:
   - All data entities mentioned
   - All operations/workflows mentioned
   - All user roles mentioned
   - All business transactions/events mentioned

2. **INTEGRATION POINTS**:
   - All external systems/APIs/services mentioned
   - All third-party service requirements mentioned
   - All data exchange patterns mentioned

3. **DATA & STORAGE**:
   - All data types needing storage
   - All data volume/growth requirements
   - All retention/archival requirements
   - All search/analytics/reporting requirements

4. **PERFORMANCE & SCALABILITY**:
   - All user volume/throughput/concurrency expectations
   - All response time/latency requirements
   - All availability/uptime targets

5. **SECURITY & COMPLIANCE**:
   - All authentication/authorization requirements
   - All encryption/privacy/security requirements
   - All compliance/audit/regulatory requirements

6. **DEPLOYMENT & OPERATIONS**:
   - All deployment/environment/infrastructure requirements
   - All monitoring/alerting/logging requirements
   - All backup/recovery/continuity requirements

---

**STEP 2: CATEGORY EVALUATION** (Map EXTRACTED requirements to 12 microservice categories)

For EACH category, check if Phase 1 mentions it:
- YES → Create epic (suggested=false)
- NOT MENTIONED BUT CRITICAL → Create with suggested=true WITH SPECIFIC REASON from Phase 1 gaps
- NOT APPLICABLE → Skip

**CATEGORY 1: FRONTEND & USER EXPERIENCE** - Check: Are UIs or workflows mentioned?
**CATEGORY 2: CORE BUSINESS LOGIC** - Check: What's the PRIMARY business capability?
**CATEGORY 3: API & BACKEND SERVICES** - Check: Are APIs or backend communication mentioned?
**CATEGORY 4: DATABASE ARCHITECTURE** - Check: Are data storage requirements mentioned?
**CATEGORY 5: USER AUTHENTICATION** - Check: Are auth requirements mentioned?
**CATEGORY 6: AUTHORIZATION & ROLE MANAGEMENT** - Check: Are roles/permissions mentioned?
**CATEGORY 7: THIRD-PARTY INTEGRATIONS** - Check: Are external systems mentioned? (Create ONLY for mentioned integrations - don't assume)
**CATEGORY 8: DATA SYNC & ASYNC WORKFLOWS** - Check: Are async/real-time requirements mentioned?
**CATEGORY 9: MONITORING & OBSERVABILITY** - Check: Are monitoring/logging requirements mentioned?
**CATEGORY 10: DEPLOYMENT & CI/CD** - Check: Are deployment requirements mentioned? (Don't assume - only if needed)
**CATEGORY 11: ADMIN & SYSTEM MANAGEMENT** - Check: Are admin functions mentioned?
**CATEGORY 12: TESTING, QA & DOCUMENTATION** - Check: Are testing/docs requirements mentioned?

---

**STEP 3: DETERMINE SUGGESTED EPICS** (NOT DEFAULTS - ONLY if truly needed)

Create suggested epic ONLY IF:
- Category is CRITICAL for project's technical foundation
- AND clearly MISSING from Phase 1
- AND you can provide SPECIFIC REASON FROM PHASE 1 CONTEXT

Bad reason: "Every project needs monitoring" (too generic)
Good reason: "Phase 1 mentions 24/7 operations but lacks monitoring strategy"

---

**STEP 4: EPIC GENERATION** (PURELY FROM EXTRACTED REQUIREMENTS)

For EACH epic:
1. Title: From Phase 1 context
2. Description: What Phase 1 requires
3. why_separate: Why independent service (from Phase 1)
4. functional_requirements: ONLY from Phase 1 requirements (TEXT, not abbreviated)
5. nonfunctional_requirements: ONLY from Phase 1 constraints (TEXT, not abbreviated)
6. dependencies: Only where Phase 1 shows dependency
7. blockers: Only blockers mentioned in Phase 1
8. suggested: true ONLY if NOT in Phase 1 but determined CRITICAL
9. suggested_reason: Specific reason from Phase 1 gaps, or null

---

**STEP 5: STORY GENERATION** (FROM PHASE 1 REQUIREMENTS)

For EACH epic's stories:
1. Extract from Phase 1: What workflows/interactions need implementation?
2. Format: "As a [role], I want [feature], so that [benefit]" - ALL from Phase 1
3. Acceptance criteria: ONLY testable criteria from Phase 1
4. Requirements: Capabilities and constraints from Phase 1

---

**FINAL RULES** (NO DEFAULTS - PURE DATA-DRIVEN)

✅ MUST DO:
- Generate epics ONLY from Phase 1 content (minimum 3 if justified, no maximum)
- ALL requirements from Phase 1 (don't add generic requirements)
- Suggested epics MUST have specific reason from Phase 1 gaps
- Each story's acceptance criteria must be testable and from Phase 1
- Use TEXT descriptions (not abbreviated like "FR_1")

❌ MUST NOT:
- Add default epics not in Phase 1 ("every project needs X")
- Invent features not in Phase 1
- Use hardcoded requirement examples
- Create overlapping epics
- Add suggested epic without SPECIFIC reason from Phase 1
'''

# Find and replace the old generation_instructions
# Look for the start marker for full generation mode
old_start = 'else:\n            # Full generation mode: Create all epics from scratch with comprehensive microservice analysis\n            generation_instructions = """'

# Find the end marker - where OUTPUT FORMAT section starts
old_end = '\n        # Build the comprehensive prompt'

# Find these markers
start_pos = content.find(old_start)
if start_pos == -1:
    print("ERROR: Could not find start marker")
    print("Looking for:", repr(old_start[:80]))
    exit(1)

end_pos = content.find(old_end)
if end_pos == -1:
    print("ERROR: Could not find end marker")
    exit(1)

# Extract prefix and suffix
prefix = content[:start_pos + len(old_start)]
suffix = content[end_pos:]

# Build new content with the clean prompt
new_content = prefix + '\n' + new_prompt + '\n        """\n' + suffix

# Write back
with open('app/services/ai_service.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ Successfully replaced generation_instructions with clean, data-driven version")
print(f"   Removed {len(content) - len(new_content)} chars of hardcoded examples")
print(f"   No more hardcoded epics, categories, or FR/NFR examples")

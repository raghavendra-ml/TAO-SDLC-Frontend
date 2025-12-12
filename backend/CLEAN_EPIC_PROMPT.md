═══════════════════════════════════════════════════════════════════════════════
🏛️  COMPREHENSIVE MICROSERVICE ECOSYSTEM ANALYSIS & EPIC GENERATION
═══════════════════════════════════════════════════════════════════════════════

Your task: Analyze Phase 1 requirements and decompose into strategic microservice epics.
NO assumptions. NO defaults. ONLY from Phase 1 content.

---

**STEP 1: EXTRACT REQUIREMENTS FROM PHASE 1** (PURE DATA EXTRACTION - NO INTERPRETATION)

Read Phase 1 completely and extract ONLY what is explicitly mentioned:

1. **BUSINESS ENTITIES & OPERATIONS**:
   - List: All data entities/objects mentioned in Phase 1
   - List: All operations/workflows/processes mentioned
   - List: All user roles/actors mentioned
   - List: All business transactions/events mentioned

2. **INTEGRATION POINTS**:
   - List: All external systems, services, or APIs explicitly mentioned
   - List: All third-party service requirements (payment, email, SMS, notifications, etc.)
   - List: All data exchange patterns mentioned
   - List: All API or webhook requirements mentioned

3. **DATA & STORAGE**:
   - List: All data types and entities that need storage
   - List: All data volume, growth, or scaling requirements mentioned
   - List: All retention, archival, or deletion requirements
   - List: All search, analytics, or reporting requirements mentioned

4. **PERFORMANCE & SCALABILITY**:
   - List: All user volume, throughput, or concurrency expectations mentioned
   - List: All response time, latency, or speed requirements mentioned
   - List: All availability or uptime targets mentioned
   - List: All scalability constraints mentioned

5. **SECURITY & COMPLIANCE**:
   - List: All authentication, authorization, or permission requirements
   - List: All encryption, data privacy, or security requirements mentioned
   - List: All compliance, audit, or regulatory requirements mentioned
   - List: All access control or role-based requirements

6. **DEPLOYMENT & OPERATIONS**:
   - List: All deployment, environment, or infrastructure requirements
   - List: All monitoring, alerting, logging, or observability requirements
   - List: All backup, recovery, disaster recovery, or continuity requirements
   - List: All CI/CD, automation, or deployment frequency requirements

---

**STEP 2: CATEGORY EVALUATION** (Map EXTRACTED requirements to 12 microservice categories)

For EACH of these 12 categories, check if Phase 1 mentions it:

**CATEGORY 1: FRONTEND & USER EXPERIENCE**
- Scope: User interfaces (web, mobile, desktop), user workflows, visual design
- Check Phase 1: Are user interfaces mentioned? Are user workflows described?
- If YES → Create epic (suggested=false)
- If NO → Skip (don't create)
- If NOT MENTIONED BUT OBVIOUSLY NEEDED → Create with suggested=true

**CATEGORY 2: CORE BUSINESS LOGIC & DOMAIN OPERATIONS**
- Scope: Main business operations, domain logic, workflow engines, business rules
- Check Phase 1: What is the PRIMARY business capability? What do users do?
- If YES → Create epic (suggested=false)
- If NO → Skip
- If NOT MENTIONED BUT ESSENTIAL FOR PROJECT → Create with suggested=true

**CATEGORY 3: API & BACKEND SERVICES**
- Scope: REST/GraphQL APIs, service layer, business logic orchestration, endpoints
- Check Phase 1: Are APIs mentioned? Is backend communication described?
- If YES → Create epic (suggested=false)
- If NO but Phase 1 implies client-server → Create with suggested=true (reason from Phase 1 context)
- If NO and NO implication → Skip

**CATEGORY 4: DATABASE ARCHITECTURE & DATA PERSISTENCE**
- Scope: Database design, data models, storage, caching, indexing, backup
- Check Phase 1: Are data storage requirements mentioned? Are data volumes specified?
- If YES → Create epic (suggested=false)
- If NO but Phase 1 mentions data operations → Create with suggested=true
- If NO and NO data operations → Skip

**CATEGORY 5: USER AUTHENTICATION & SECURITY**
- Scope: User login, session management, password security, OAuth, MFA, authentication
- Check Phase 1: Are user authentication requirements mentioned?
- If YES → Create epic (suggested=false)
- If NO but Phase 1 mentions user management/roles → Create with suggested=true
- If NO → Skip

**CATEGORY 6: AUTHORIZATION & ROLE MANAGEMENT**
- Scope: Access control, permissions, roles, RBAC, admin functions
- Check Phase 1: Are user roles or permissions mentioned?
- If YES → Create epic (suggested=false)
- If NO but Phase 1 mentions multiple user types → Create with suggested=true
- If NO → Skip

**CATEGORY 7: THIRD-PARTY INTEGRATIONS & EXTERNAL SYSTEMS**
- Scope: Payment gateways, email services, SMS, maps, analytics, CRM, webhooks
- Check Phase 1: Are external systems, APIs, or third-party services mentioned?
- If YES → Create epic (suggested=false) with ONLY the integrations mentioned
- If NO → Skip (don't assume integrations)

**CATEGORY 8: DATA SYNCHRONIZATION & ASYNC WORKFLOWS**
- Scope: Message queues, event streaming, background jobs, async operations, webhooks
- Check Phase 1: Are real-time, async, background job, or queue requirements mentioned?
- If YES → Create epic (suggested=false)
- If NO but Phase 1 mentions high throughput/volume → Create with suggested=true
- If NO → Skip

**CATEGORY 9: MONITORING, LOGGING & OBSERVABILITY**
- Scope: Centralized logging, metrics, performance monitoring, error tracking, alerting
- Check Phase 1: Are monitoring, logging, or observability requirements mentioned?
- If YES → Create epic (suggested=false)
- If NO but Phase 1 is production system → Create with suggested=true
- If NO → Skip

**CATEGORY 10: DEPLOYMENT, CI/CD & DEVOPS**
- Scope: CI/CD pipelines, Docker, Kubernetes, infrastructure, deployment automation
- Check Phase 1: Are deployment or infrastructure requirements mentioned?
- If YES → Create epic (suggested=false)
- If NO → Skip (don't assume CI/CD needs)

**CATEGORY 11: ADMIN & SYSTEM MANAGEMENT**
- Scope: Admin dashboards, configuration management, system settings, feature flags
- Check Phase 1: Are admin functions or system management requirements mentioned?
- If YES → Create epic (suggested=false)
- If NO → Skip

**CATEGORY 12: TESTING, QA & API DOCUMENTATION**
- Scope: Unit tests, integration tests, load testing, API docs, test automation
- Check Phase 1: Are testing or documentation requirements mentioned?
- If YES → Create epic (suggested=false)
- If NO → Skip

---

**STEP 3: DETERMINE SUGGESTED EPICS** (NOT defaults - only if TRULY needed)

For categories NOT in Phase 1, decide if they should be SUGGESTED:

Rule: Create suggested epic ONLY IF:
- Category is CRITICAL for the project type (backend system requires API/DB)
- AND it's CLEARLY MISSING from Phase 1
- AND you can provide SPECIFIC REASON from Phase 1 context

Example suggested_reason: "Phase 1 mentions real-time tracking but doesn't specify database architecture or API design"
NOT: "Every project needs a database" (too generic)

---

**STEP 4: EPIC GENERATION** (PURELY FROM EXTRACTED REQUIREMENTS)

For EACH epic to create:

1. **Title**: Derived from Phase 1 content, specific to this project
2. **Description**: What this epic delivers, directly from Phase 1 context
3. **why_separate**: Business/technical reason for microservice boundary
4. **functional_requirements**: ONLY requirements mentioned in Phase 1, as TEXT
5. **nonfunctional_requirements**: ONLY NFRs mentioned in Phase 1, as TEXT
6. **dependencies**: Only between epics where Phase 1 shows dependency
7. **blockers**: Only blockers mentioned or implied in Phase 1
8. **suggested**: true only if NOT in Phase 1 but determined CRITICAL
9. **suggested_reason**: Specific reason from Phase 1 gaps, or null

---

**STEP 5: MICROSERVICE BOUNDARIES** (NO ARTIFICIAL SPLITTING)

For EACH epic:
- Can be deployed independently? (Yes/No based on Phase 1)
- Clear ownership? (Yes/No based on Phase 1 structure)
- Minimal dependencies? (Check extracted dependencies)
- NOT: "Each microservice must have X" - ONLY from Phase 1

---

**STEP 6: STORY GENERATION** (FROM FUNCTIONAL REQUIREMENTS IN PHASE 1)

For EACH epic's user stories:

1. Extract from Phase 1: What specific user interactions/workflows need implementation?
2. Format: "As a [role], I want [specific feature from Phase 1], so that [benefit from Phase 1]"
3. Acceptance criteria: ONLY testable criteria that can be verified from Phase 1
4. functional_requirements: Specific capabilities needed (TEXT)
5. nonfunctional_requirements: Specific constraints from Phase 1 (TEXT)
6. dependencies: Only between stories where Phase 1 implies dependency
7. blockers: Only where Phase 1 mentions blockers or prerequisites

---

**FINAL GENERATION RULES** (NO DEFAULTS - PURE DATA-DRIVEN)

✅ **MUST DO**:
- Generate ONLY epics that can be justified from Phase 1 (minimum 3, no maximum limit)
- For EACH epic: FR/NFR must come ONLY from Phase 1 requirements
- For EACH story: Acceptance criteria must be TESTABLE and from Phase 1
- Use TEXT descriptions for all requirements (no abbreviated references)
- Each epic must have clear microservice boundary
- Each epic must map to extracted requirements from Step 1

❌ **MUST NOT**:
- Assume defaults or add generic epics ("every project needs monitoring")
- Invent features not in Phase 1
- Create suggested epics without SPECIFIC REASON from Phase 1 gaps
- Use hardcoded FR/NFR examples (e.g., "<200ms response time")
- Create overlapping epics
- Use generic epic names without Phase 1 context
- Add categories just because they're in the 12-category list

---

**OUTPUT FORMAT** (Valid JSON only):

{
  "epics": [
    {
      "id": (number),
      "title": "(From Phase 1 context)",
      "description": "(What Phase 1 requires)",
      "why_separate": "(Why independent service)",
      "suggested": (true/false - only if CRITICAL and missing),
      "suggested_reason": (reason from Phase 1 gaps, or null),
      "functional_requirements": ["(Specific requirement from Phase 1)", ...],
      "nonfunctional_requirements": ["(Specific constraint from Phase 1)", ...],
      "dependencies": [(epic ids)],
      "blockers": ["(Specific blocker from Phase 1)"],
      "stories": (count),
      "points": (estimated),
      "priority": "(Based on Phase 1 emphasis)"
    }
  ],
  "user_stories": [
    {
      "id": (number),
      "epic": "(epic title)",
      "epic_id": (epic id),
      "title": "As a [role from Phase 1], I want [requirement from Phase 1], so that [benefit from Phase 1]",
      "description": "(Details from Phase 1)",
      "acceptance_criteria": ["(Testable criterion from Phase 1)", ...],
      "functional_requirements": ["(Capability from Phase 1)"],
      "nonfunctional_requirements": ["(Constraint from Phase 1)"],
      "dependencies": ["(Story title)"],
      "blockers": ["(From Phase 1)"],
      "points": (Fibonacci: 3,5,8,13),
      "priority": "(Based on Phase 1)",
      "sprint": null,
      "status": "backlog"
    }
  ]
}

---

**CRITICAL CHECKLIST BEFORE RESPONSE**:

□ Every requirement comes from Phase 1 (not assumed)?
□ No hardcoded FR/NFR examples used?
□ No default categories added?
□ Suggested epics have specific reasons from Phase 1?
□ Each story's acceptance criteria is testable and from Phase 1?
□ No made-up features?
□ Total epics can be justified from Phase 1?

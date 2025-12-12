# Comprehensive Microservice Epic Generation Prompt

## 🏛️ STEP 1: DEEP REQUIREMENT ANALYSIS (Before generating epics, analyze these dimensions):

### 1. **BUSINESS ENTITIES & OPERATIONS**
   - What are the main data entities? (users, orders, products, transactions, etc.)
   - What operations are performed? (create, read, update, delete, search, report, etc.)
   - What workflows exist? (approval flows, escalations, notifications, etc.)
   - What user roles exist? (admin, customer, agent, manager, etc.)

### 2. **INTEGRATION POINTS & EXTERNAL SYSTEMS**
   - What external systems mentioned? (payment, email, SMS, maps, analytics, etc.)
   - What data exchanges with external systems?
   - What APIs or webhooks needed?
   - Real-time or batch synchronization?

### 3. **DATA CHARACTERISTICS & STORAGE**
   - What data must be stored? (structured, semi-structured, files, media?)
   - Volume expectations? (millions of records? gigabytes of data?)
   - Retention requirements? (7 years? 1 year? real-time?)
   - Search/query patterns? (full-text search? analytics? reporting?)

### 4. **PERFORMANCE & SCALABILITY NEEDS**
   - Expected user volume? (1000? 1 million? concurrent users?)
   - Response time requirements? (<100ms? <500ms? real-time?)
   - Availability requirements? (99.9%? 99.99%? 24x7?)
   - Mobile/web/both? Desktop support needed?

### 5. **SECURITY, COMPLIANCE & MULTI-TENANCY**
   - Authentication requirements? (basic auth? OAuth? SSO? MFA?)
   - Authorization model? (RBAC? ABAC? permission matrix?)
   - Data privacy requirements? (GDPR? HIPAA? encryption?)
   - Multi-tenant or single-tenant?

### 6. **DEPLOYMENT & OPERATIONS**
   - Production readiness requirements?
   - Monitoring & alerting needs?
   - Deployment frequency? (daily? weekly?)
   - Geographic distribution? (single region? multi-region? global?)

---

## 🏗️ STEP 2: MANDATORY MICROSERVICE EPIC CATEGORIES

For EACH category below, determine:
- ✅ **CLEAR EVIDENCE IN PHASE 1?** → Create dedicated epic (suggested=false)
- ⚠️  **IMPLIED/OPTIONAL FOR THIS PROJECT?** → Create epic with (suggested=true)
- ❌ **NOT APPLICABLE?** → Skip entirely

### **CATEGORY 1️⃣: FRONTEND & USER EXPERIENCE**
- **Epic Title**: "[Product] Web/Mobile Interface" or "User Portal & Experience"
- **Covers**: Web UI, mobile app, responsive design, user workflows, dashboards
- **FR Examples**: Login page, user dashboard, data entry forms, navigation menus
- **NFR Examples**: Mobile responsive, <2 second load time, 99.5% uptime
- **Questions**:
  - What user interfaces exist?
  - Web, mobile, or both?
  - What are key user workflows?
  - Performance targets? Browser/OS support?

### **CATEGORY 2️⃣: CORE BUSINESS LOGIC & DOMAIN OPERATIONS**
- **Epic Title**: "[Primary Domain Service]" (e.g., "Booking & Reservation Engine", "Transaction Processing", "Content Management")
- **Covers**: Main business entities, operations, workflows from Phase 1
- **FR Examples**: Create bookings, process transactions, manage inventory, generate reports
- **NFR Examples**: <100ms transaction processing, ACID compliance, 99.9% uptime
- **Questions**:
  - What is the PRIMARY business capability?
  - What are core workflows?
  - What entities? (bookings, orders, accounts, projects, etc.)
  - What operations? (CRUD, search, bulk operations, workflows?)

### **CATEGORY 3️⃣: API & BACKEND SERVICES**
- **Epic Title**: "REST API Gateway & Microservices"
- **Covers**: Backend REST/GraphQL APIs, service layer, business logic layer, API orchestration
- **FR Examples**:
  - Define REST endpoints for all domain operations
  - API versioning (/v1/, /v2/)
  - Request/response validation
  - Error handling & status codes
- **NFR Examples**:
  - <200ms response time for 95th percentile
  - Rate limiting (X requests/hour)
  - OAuth 2.0 required
  - Backward compatibility
- **Questions**:
  - What endpoints needed? (GET, POST, PUT, DELETE?)
  - How many requests per second expected?
  - API versioning strategy?
  - Rate limiting, throttling needs?

### **CATEGORY 4️⃣: DATABASE ARCHITECTURE & DATA PERSISTENCE**
- **Epic Title**: "Data Storage Architecture & Database Services"
- **Covers**: SQL/NoSQL database design, data models, migrations, caching (Redis), indexing, backup/recovery
- **FR Examples**:
  - Design entity-relationship model
  - Implement data access layer
  - Database migrations & versioning
  - Implement caching layer (Redis)
  - Backup & restore procedures
- **NFR Examples**:
  - Query response time <100ms
  - Support for 100M+ records
  - 99.9% data durability
  - <15 second RTO, <1 hour RPO
- **Questions**:
  - What data needs storage?
  - Relational (SQL) or document (NoSQL)?
  - Expected data volume? Growth rate?
  - Backup/recovery requirements?

### **CATEGORY 5️⃣: USER AUTHENTICATION & SECURITY**
- **Epic Title**: "User Authentication & Security Layer"
- **Covers**: User login/logout, session management, password security, JWT tokens, OAuth 2.0, MFA, security audit logs
- **FR Examples**:
  - User registration & email verification
  - Secure login with password hashing
  - Session management & token refresh
  - JWT token generation & validation
  - OAuth 2.0 social login (Google, GitHub, etc.)
  - MFA implementation (TOTP, SMS)
- **NFR Examples**:
  - Password hashing using bcrypt/Argon2
  - Sessions expire after 30 minutes
  - All passwords encrypted in transit (TLS)
  - Security audit logging
- **Questions**:
  - How do users authenticate? (username/password? social? SSO?)
  - MFA required?
  - Session timeout policy?
  - Compliance requirements? (SOC 2? ISO 27001?)

### **CATEGORY 6️⃣: AUTHORIZATION & ROLE MANAGEMENT**
- **Epic Title**: "Role-Based Access Control (RBAC) & Permission Management"
- **Covers**: User roles, permissions, access control lists, admin role management, permission enforcement
- **FR Examples**:
  - Define role hierarchy (Admin, Manager, User, Guest)
  - Assign permissions to roles
  - Check permissions before operations
  - Admin dashboard for role/permission management
  - Audit trail for permission changes
  - Dynamic permission updates
- **NFR Examples**:
  - Permission checks <50ms
  - Support 100+ custom roles
  - 99.5% permission enforcement accuracy
- **Questions**:
  - What user roles exist?
  - Permission matrix needed?
  - Can permissions be dynamic?
  - Need permission audit trail?

### **CATEGORY 7️⃣: THIRD-PARTY INTEGRATIONS & EXTERNAL SYSTEMS**
- **Epic Title**: "External System Integrations & API Adapters"
- **Covers**: Payment gateways (Stripe, PayPal), email (SendGrid), SMS (Twilio), maps, analytics, CRM, Slack, Jira, etc.
- **FR Examples**:
  - Stripe payment processing
  - SendGrid email delivery
  - Twilio SMS notifications
  - Google Maps integration
  - Slack notifications
  - Webhook handlers for external events
- **NFR Examples**:
  - Payment processing <3 second
  - Email delivery <5 minutes
  - 99.9% integration uptime
  - Webhook retry with exponential backoff
- **Questions**:
  - What external systems integrate?
  - Payment processing? Email? SMS? Maps?
  - Analytics tracking needed?
  - Webhook handling required?

### **CATEGORY 8️⃣: DATA SYNCHRONIZATION & ASYNCHRONOUS WORKFLOWS**
- **Epic Title**: "Event-Driven Architecture & Async Workflows"
- **Covers**: Message queues (Kafka, RabbitMQ), event streaming, background job processing, data synchronization, webhooks
- **FR Examples**:
  - Event bus for async notifications
  - Background job queue (send emails, generate reports)
  - Event-based data synchronization
  - Retry logic for failed jobs
  - Idempotent operations
  - Dead-letter queue for failed messages
- **NFR Examples**:
  - Message throughput: 1000+ msg/sec
  - Latency <100ms for critical events
  - At-least-once delivery guarantee
- **Questions**:
  - What can be async vs real-time?
  - How many concurrent async jobs?
  - Real-time sync needed for any data?
  - Notification patterns? (webhooks, websockets, polling?)

### **CATEGORY 9️⃣: MONITORING, LOGGING & OBSERVABILITY**
- **Epic Title**: "Observability, Monitoring & Logging Infrastructure"
- **Covers**: Centralized logging (ELK, Loki), metrics (Prometheus), performance monitoring, error tracking (Sentry), dashboards, alerting
- **FR Examples**:
  - Centralized logging for all services
  - Performance metrics collection
  - Error tracking & alerting
  - Custom dashboards for operations team
  - Health checks & status pages
  - Distributed tracing
- **NFR Examples**:
  - Log retention: 30 days
  - Metrics collection <1 second latency
  - Dashboard load <2 seconds
  - Alert routing to on-call team
- **Questions**:
  - What metrics matter? (response time, errors, throughput?)
  - How to detect failures?
  - Alert escalation process?
  - Compliance logging requirements?

### **CATEGORY 🔟: DEPLOYMENT, CI/CD & DEVOPS**
- **Epic Title**: "Deployment Pipeline & Infrastructure as Code"
- **Covers**: CI/CD pipelines (GitHub Actions, Jenkins), Docker, Kubernetes, infrastructure management, environment promotion, rollback strategy
- **FR Examples**:
  - Automated testing on every commit
  - Docker containerization
  - Kubernetes deployment orchestration
  - Environment-specific config management
  - Blue-green deployment for zero downtime
  - Rollback procedures
  - Infrastructure as Code (Terraform, Helm)
- **NFR Examples**:
  - Deployment time <5 minutes
  - 99.99% deployment success rate
  - Rollback capability <2 minutes
- **Questions**:
  - How often deploy? (daily? weekly?)
  - Environments? (dev, staging, prod?)
  - Cloud provider? (AWS, Azure, GCP?)
  - Auto-scaling requirements?

### **CATEGORY 1️⃣1️⃣: ADMIN & SYSTEM MANAGEMENT**
- **Epic Title**: "Admin Console & System Management"
- **Covers**: Admin dashboards, configuration management, system settings, feature flags, maintenance mode, health checks
- **FR Examples**:
  - Admin dashboard for system monitoring
  - Configuration management UI
  - Feature flags & A/B testing
  - User management (deactivate, reset, audit)
  - Maintenance mode toggle
  - System health checks
- **NFR Examples**:
  - Admin operations <500ms
  - Support multiple admins simultaneously
  - Audit trail for all admin actions
- **Questions**:
  - What admin functions needed?
  - System configuration changes? Feature toggles?
  - Audit trail requirements?

### **CATEGORY 1️⃣2️⃣: TESTING, QA & API DOCUMENTATION**
- **Epic Title**: "Quality Assurance, Testing & API Documentation"
- **Covers**: Automated unit/integration tests, load testing, security testing, API documentation (Swagger), test infrastructure
- **FR Examples**:
  - Unit test coverage >80%
  - Integration tests for critical workflows
  - Load testing (1000+ concurrent users)
  - Security penetration testing
  - API documentation (Swagger/OpenAPI)
  - Automated test reports
- **NFR Examples**:
  - Test execution <10 minutes
  - Load test to 5000 concurrent users
  - Document 100% of API endpoints
- **Questions**:
  - Test coverage targets?
  - Load testing requirements?
  - Security testing/penetration testing?
  - API documentation format? (Swagger, AsyncAPI?)

---

## ⚙️ STEP 3: EPIC GENERATION ALGORITHM

For EACH of the 12 categories:

1. **Search Phase 1 for mentions** of this category
   - Explicit mention? (suggested=false)
   - Implied? (suggested=true)
   - Not mentioned? (Skip UNLESS critical for architecture)

2. **Build Epic Dictionary**:
   ```
   Epic = {
     title: "Clear microservice boundary name",
     description: "What this epic delivers to the business",
     why_separate: "Why this is an independent microservice",
     suggested: true/false,  // Is this recommended by you?
     suggested_reason: "If suggested, why? E.g., 'Phase 1 lacks database details'",
     functional_requirements: ["Specific FR as text", "Another FR"],
     nonfunctional_requirements: ["Performance requirement", "Security requirement"],
     dependencies: [epic_ids_this_depends_on],
     blockers: ["Blocker description"],
     stories: (estimated count),
     points: (estimated story points),
     priority: "Critical|High|Medium|Low"
   }
   ```

3. **Microservice Boundary Checklist**:
   - ✅ Can this be deployed independently?
   - ✅ Clear ownership (one team)?
   - ✅ Minimal cross-epic dependencies?
   - ✅ Well-defined API contract?

4. **GENERATE MINIMUM 5-12 EPICS** (prefer more if justified):
   - Main epics with "suggested=false": From Phase 1 requirements
   - Additional epics with "suggested=true": For critical but missing dimensions
   - Example: "Phase 1 is vague about deployment → Add 'CI/CD' epic as suggested"

---

## 📋 EXAMPLE: FLEET MANAGEMENT SYSTEM

**Phase 1 Contains**:
"Fleet tracking system for real-time truck monitoring, transaction processing, user management with email notifications"

**ANALYSIS**:
- ✅ Category 1 (Frontend): Implied in "monitoring" → Create epic (suggested=false)
- ✅ Category 2 (Fleet Logic): Explicit → Create epic (suggested=false)
- ✅ Category 3 (API): Implicit in "system" → Create epic (suggested=false)
- ❌ Category 4 (Database): NOT mentioned → ADD AS SUGGESTED (suggested=true, reason="Fleet system needs scalable database for real-time tracking")
- ✅ Category 5 (Auth): Explicit "user" → Create epic (suggested=false)
- ❌ Category 6 (RBAC): NOT mentioned → ADD AS SUGGESTED (suggested=true, reason="Fleet management needs driver/dispatcher/admin roles")
- ✅ Category 7 (Integrations): Explicit "email" + implied GPS → Create epic (suggested=false)
- ❌ Category 8 (Async): NOT mentioned → ADD AS SUGGESTED (suggested=true, reason="Real-time tracking needs event-driven architecture")
- ❌ Category 9 (Monitoring): NOT mentioned → ADD AS SUGGESTED (suggested=true, reason="Fleet operations require 24/7 monitoring and alerting")
- ❌ Category 10 (CI/CD): NOT mentioned → ADD AS SUGGESTED (suggested=true, reason="No deployment strategy mentioned")
- ❌ Category 11 (Admin): NOT mentioned → Skip (unless critical)
- ⚠️  Category 12 (Testing): Could be implicit → ADD AS SUGGESTED (suggested=true, reason="Real-time system needs comprehensive testing")

**RESULT**: 8 epics total
- 5 main epics (suggested=false) from Phase 1
- 5 suggested epics (suggested=true) for complete SDLC coverage

---

## ✅ CRITICAL RULES FOR THIS GENERATION**

**MUST DO**:
- ✅ Generate minimum 5-12 epics (fewer only if project is TINY)
- ✅ For each category: If in Phase 1 → Create epic (suggested=false)
- ✅ For infrastructure gaps: Add suggested epic (suggested=true) with clear reason
- ✅ Example suggested_reason: "Phase 1 mentions API but lacks deployment/DevOps details"
- ✅ Use TEXT descriptions for FR/NFR (not abbreviated like "FR_1", "NFR_2")
- ✅ Each epic has clear microservice boundary & can be deployed independently
- ✅ Each story has SPECIFIC acceptance criteria (not vague)

**MUST NOT**:
- ❌ Generate <5 epics (unless project is trivially small)
- ❌ Skip critical categories (Auth, API, Database should always be covered)
- ❌ Invent features not in Phase 1 (only suggest missing SDLC dimensions)
- ❌ Create overlapping/duplicate epics
- ❌ Use generic names like "Feature 1", "Feature 2"
- ❌ Leave suggested_reason as null (explain WHY recommended)

// API Business Logic Mapping
export const getBusinessLogicForEndpoint = (method: string, path: string): string => {
  const key = `${method.toUpperCase()} ${path}`;
  
  const businessLogicMap: { [key: string]: string } = {
    // Authentication endpoints
    'POST /api/auth/signup': 'Validates user input, checks email uniqueness, hashes password with bcrypt, creates user record with auto-generated ID, returns success/error response',
    'POST /api/auth/login': 'Validates credentials, verifies password with bcrypt, generates JWT token with 24h expiry, sets security headers, returns token or authentication error',
    'GET /api/auth/me': 'Verifies JWT token, extracts user ID, fetches current user data, returns user profile or 401 if token invalid',
    
    // User management endpoints
    'GET /api/users': 'Authenticates admin, queries user table with pagination, excludes sensitive data (passwords), returns user list with metadata',
    'GET /api/users/{id}': 'Validates JWT, checks user permissions, fetches specific user by ID, returns user details or 404 if not found',
    'PUT /api/users/{id}': 'Validates JWT, verifies user ownership/admin, sanitizes input data, updates user record, returns updated user or validation errors',
    'DELETE /api/users/{id}': 'Verifies admin permissions, checks user existence, soft deletes user record, logs deletion, returns success confirmation',
    
    // Project management endpoints
    'GET /api/projects': 'Authenticates user, filters projects by user permissions, includes stakeholder data, returns paginated project list with access levels',
    'POST /api/projects': 'Validates JWT, sanitizes project data, creates project record, assigns creator as owner, initializes default phases, returns created project',
    'GET /api/projects/{id}': 'Verifies project access, fetches project details, includes related phases/stakeholders, returns project data or 403 if no access',
    'PUT /api/projects/{id}': 'Validates ownership/admin, updates project fields, maintains audit trail, notifies stakeholders of changes, returns updated project',
    
    // Phase management endpoints
    'GET /api/projects/{id}/phases': 'Authenticates user, verifies project access, fetches all phases with status, includes approval history, returns phase progression data',
    'POST /api/projects/{id}/phases': 'Validates project ownership, creates new phase record, sets initial status, links to project, returns created phase details',
    'PUT /api/projects/{id}/phases/{phase_id}': 'Verifies phase edit permissions, validates phase data, updates status, triggers approval workflow if needed, returns updated phase',
    
    // File upload endpoints
    'POST /api/upload': 'Validates file type/size, scans for security threats, stores in secure location, creates file record, returns file metadata and access URL',
    'GET /api/files/{id}': 'Validates user access to file, checks file existence, serves file with proper headers, logs access, returns file stream or 404',
    
    // AI/Chat endpoints
    'POST /api/ai/chat': 'Authenticates user, validates chat input, calls AI service, stores conversation history, returns AI response with context preservation',
    'GET /api/ai/conversations/{id}': 'Verifies user access, fetches conversation history, includes message metadata, returns chronological chat data',
    
    // Approval workflow endpoints
    'POST /api/approvals': 'Validates approver permissions, creates approval record, sends notifications, updates approval status, returns approval details',
    'PUT /api/approvals/{id}': 'Verifies approval ownership, updates approval decision, triggers workflow progression, notifies stakeholders, returns updated status',
    
    // Integration endpoints
    'POST /api/integrations/jira': 'Validates JIRA credentials, tests connection, stores integration config, syncs project data, returns integration status',
    'GET /api/integrations': 'Authenticates user, fetches user\'s integrations, includes connection status, returns integration list with health checks',
    
    // Additional user management endpoints (from screenshot)
    'POST /api/user': 'Creates new user account with email validation, password hashing, role assignment, and account activation workflow',
    'GET /api/user': 'Fetches authenticated user\'s profile data, preferences, and account status with security filtering',
    'PUT /api/user/{id}': 'Updates user profile with validation, permission checks, audit logging, and notification triggers',
    'DELETE /api/user/{id}': 'Soft deletes user account, anonymizes data, revokes sessions, and triggers cleanup processes',
    
    // Additional resource endpoints
    'POST /api/new': 'Creates new resource with validation, initialization, relationship setup, and notification dispatch',
    'GET /api/new': 'Retrieves list of new/recent resources with pagination, filtering, and access control validation',
    'PUT /api/new/{id}': 'Updates resource with change validation, version control, audit trail, and cascade updates',
    'DELETE /api/new/{id}': 'Removes resource with dependency checks, cascading deletes, backup creation, and notification alerts'
  };

  return businessLogicMap[key] || 'Standard CRUD operation with authentication, validation, database interaction, and response formatting';
};

// Enhanced endpoint data with business logic
export const enhanceEndpointWithBusinessLogic = (endpoint: any): any => {
  return {
    ...endpoint,
    business_logic: getBusinessLogicForEndpoint(endpoint.method, endpoint.path)
  };
};
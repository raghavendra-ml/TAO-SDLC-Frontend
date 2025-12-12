# Language-Aware Code Generation for Phase 5

## Overview

The Phase 5 code generation system has been upgraded to **respect user language selection** and generate appropriate code for different programming languages and frameworks. Previously, the system was hardcoded to generate only Python/FastAPI code regardless of user preference. Now it dynamically generates code for:

- **Node.js (Express)** - `.js` files with Jest testing
- **TypeScript** - `.ts` files with TypeScript Express and Jest  
- **Python (FastAPI)** - `.py` files with pytest testing
- **Java (Spring Boot)** - `.java` files with JUnit testing
- **Go (Gin/Echo)** - `.go` files with Go testing package
- **C# (.NET Core)** - `.cs` files with xUnit testing

## Changes Made

### 1. Language Detection and Mapping (Lines 6105-6170)

Added comprehensive language-to-framework mapping:

```python
# Determine file extensions and framework based on language
if 'node' in lang_lower or 'javascript' in lang_lower or 'express' in lang_lower:
    service_ext = '.js'
    router_ext = '.js'
    test_ext = '.js'
    lang_display = 'JavaScript (Express)'
    framework = 'Express.js'
    service_template = 'class'
    test_framework_name = 'Jest'
elif 'typescript' in lang_lower:
    service_ext = '.ts'
    router_ext = '.ts'
    test_ext = '.ts'
    lang_display = 'TypeScript'
    framework = 'Express.js with TypeScript'
    service_template = 'class'
    test_framework_name = 'Jest'
# ... and so on for other languages
```

**Key Variables Set:**
- `service_ext` - File extension for service code (.js, .py, .ts, .java, etc.)
- `router_ext` - File extension for router/API code
- `test_ext` - File extension for test files
- `lang_display` - Human-readable language name
- `framework` - Framework name (Express, FastAPI, Spring Boot, etc.)
- `test_framework_name` - Test framework (Jest, pytest, JUnit, etc.)

### 2. Language-Aware Service Code Prompt (Lines 6180-6210)

Updated AI prompt to generate language-specific code:

**Before:**
```python
service_prompt = f"""Generate a professional Python service class for...
```

**After:**
```python
service_prompt = f"""Generate a professional {lang_display} service implementation for the following user story...
Requirements:
1. Create a {service_template} named {pascal_case_name}Service
...
7. Use {lang_display} idioms and best practices
8. Make it production-ready

Generate ONLY valid {lang_display} code. Start with proper module/package declarations."""
```

### 3. Language-Aware API Router Prompt (Lines 6272-6295)

Updated to generate framework-specific API code:

**Before:**
```python
api_prompt = f"""Generate a FastAPI router for...
```

**After:**
```python
api_prompt = f"""Generate a {lang_display} API router for the following user story:
...
**Framework:** {api_framework}
...
Requirements:
1. Create router with appropriate routing mechanism for {api_framework}
2. Define request/response models appropriate for {lang_display}
...
Generate ONLY valid {lang_display} code with all necessary imports."""
```

### 4. Language-Aware Test Code Prompt (Lines 6400-6435)

Updated to generate framework-specific tests:

**Before:**
```python
test_prompt = f"""Generate comprehensive unit tests for the following:
...
Generate ONLY valid Python pytest code. Include all necessary imports."""
```

**After:**
```python
test_prompt = f"""Generate comprehensive unit tests for the following in {test_framework_display}:
...
Requirements:
...
Generate ONLY valid {lang_display} test code using {test_framework_display}. Include all necessary imports and follow {lang_display} best practices."""
```

### 5. Language-Aware File Extensions (Throughout)

**Service File:** `{snake_case_name}_service{service_ext}`
- Node.js: `user_service.js`
- TypeScript: `user_service.ts`
- Python: `user_service.py`
- Java: `UserService.java`
- Go: `user_service.go`

**Router File:** `{snake_case_name}_router{router_ext}`
- Node.js: `user_router.js`
- Python: `user_router.py`
- etc.

**Test File:** `test_{snake_case_name}{test_ext}`
- Node.js: `test_user_service.js`
- Python: `test_user_service.py`
- etc.

### 6. Language-Aware Fallback Code (Lines 6440-6534)

When AI generation fails, fallback code is generated in the correct language:

**JavaScript (Node.js):**
```javascript
class UserService {
  constructor() {
    this.name = "User";
    this.version = "1.0.0";
  }
  execute(params = {}) {
    return { status: "success", message: "Executed", ... };
  }
}
module.exports = UserService;
```

**Python:**
```python
class UserService:
    """Service for user management"""
    def __init__(self):
        self.name = "User"
        self.version = "1.0.0"
    def execute(self, **kwargs):
        return {"status": "success", "message": "Executed", ...}
```

**Java:**
```java
public class UserService {
    public Map<String, Object> execute(Map<String, Object> params) {
        return Map.of("status", "success", "message", "Executed", ...);
    }
}
```

### 7. Updated README Generation (Lines 6540-6610)

README now includes language-specific information:

**Before:**
```markdown
## Technology Stack
- **Language:** Python
- **Test Framework:** pytest
```

**After:**
```markdown
## Configuration
- **Language:** JavaScript (Express)
- **Framework:** Express.js
- **Test Framework:** Jest
- **Components:** [...]

## Generated Code Structure
- `user_service.js` - Business logic implementation (JavaScript)
- `user_router.js` - Express.js router and endpoints
- `test_user_service.js` - Comprehensive test suite (Jest)

## How to Use
1. Review the generated code files in this package
2. Integrate `user_service.js` into your backend application
3. Include `user_router.js` in your Express.js application
4. Run the test suite using Jest: `jest test_user_service.js`
```

### 8. Enhanced Case Conversion (Lines 6740-6751)

Added `_to_camel_case()` method to support language-specific naming conventions:

```python
def _to_camel_case(self, text: str) -> str:
    """Convert text to camelCase"""
    pascal = self._to_pascal_case(text)
    return pascal[0].lower() + pascal[1:] if pascal else ''
```

## How It Works

### User Flow

1. **User selects in UI:**
   - Epic (e.g., "Authentication System")
   - User Story (e.g., "Implement user login")
   - Components (e.g., "Login Form", "Auth Service")
   - **Language** (e.g., "Node.js (Express)")
   - **Tests** (e.g., "Jest")

2. **Backend receives preferences:**
   ```json
   {
     "epic_id": "E1",
     "story_id": "US1",
     "components": ["Login Form", "Auth Service"],
     "language": "Node.js (Express)",
     "tests": "Jest"
   }
   ```

3. **Generation function processes:**
   - Extracts language: `language = "Node.js (Express)"`
   - Maps to framework: `framework = "Express.js"`, `service_ext = ".js"`
   - Creates language-aware prompts for AI
   - Generates code in selected language
   - Uses correct file extensions
   - Generates appropriate tests

4. **Output generated:**
   ```
   user_login_service.js         (JavaScript code)
   user_login_router.js          (Express.js routes)
   test_user_login_service.js    (Jest tests)
   README.md                     (With Node.js/Express/Jest info)
   ```

## Language Configuration Map

| Language | Framework | Service Ext | Router Ext | Test Ext | Test Framework | Generation Style |
|----------|-----------|-------------|-----------|----------|----------------|------------------|
| Node.js | Express.js | `.js` | `.js` | `.js` | Jest | Module exports, async/await |
| TypeScript | Express.js | `.ts` | `.ts` | `.ts` | Jest | Type annotations, interfaces |
| Python | FastAPI | `.py` | `.py` | `.py` | pytest | Decorators, async def |
| Java | Spring Boot | `.java` | `.java` | `.java` | JUnit | Annotations, @RestController |
| Go | Gin/Echo | `.go` | `.go` | `.go` | testing | http.HandlerFunc, testing.T |
| C# | .NET Core | `.cs` | `.cs` | `.cs` | xUnit | Async/await, dependency injection |

## Metadata Included in Response

The generation response now includes language information:

```python
"metadata": {
    "story_id": story_id,
    "story_title": story_title,
    "components": component_names,
    "has_api": has_api_component,
    "language": lang_display,      # ← NEW
    "framework": framework,        # ← NEW
    "test_framework": test_framework_display,  # ← NEW
    "generated_at": datetime.now().isoformat(),
    "generation_time_seconds": elapsed,
    "generation_method": "AI-Powered" if elapsed > 1 else "Template-Fallback"
}
```

## Validation Checklist

### When User Selects Node.js (Express):
- ✅ Service file extension: `.js` (not `.py`)
- ✅ Router file extension: `.js` (not `.py`)
- ✅ Test file extension: `.js` (not `.py`)
- ✅ AI prompt mentions: "Node.js", "Express", "async/await"
- ✅ Test framework: Jest (not pytest)
- ✅ Fallback code: JavaScript syntax (not Python)
- ✅ README shows: JavaScript, Express.js, Jest

### When User Selects Python:
- ✅ Service file extension: `.py`
- ✅ Router file extension: `.py`
- ✅ Test file extension: `.py`
- ✅ AI prompt mentions: "Python", "FastAPI", "decorators"
- ✅ Test framework: pytest (not Jest)
- ✅ Fallback code: Python syntax
- ✅ README shows: Python, FastAPI, pytest

### When User Selects Java:
- ✅ Service file extension: `.java`
- ✅ Router file extension: `.java`
- ✅ Test file extension: `.java`
- ✅ AI prompt mentions: "Java", "Spring Boot", "annotations"
- ✅ Test framework: JUnit
- ✅ Fallback code: Java syntax
- ✅ README shows: Java, Spring Boot, JUnit

## Testing

Run the language-aware generation test:

```bash
python test_language_aware_generation.py
```

This verifies:
- Correct file extensions for each language
- Correct framework detection
- Correct test framework mapping
- Proper fallback code generation

## Benefits

1. **Multi-Language Support** - Users can generate code in their preferred language
2. **Framework-Aware** - Uses appropriate framework for each language
3. **Test Framework Respect** - Generates tests with user's selected framework
4. **Proper File Extensions** - `.js` for JavaScript, `.py` for Python, etc.
5. **Language-Specific Patterns** - async/await for Node.js, decorators for Python, etc.
6. **Production-Ready** - All filters (epic, story, language, tests, components) are considered
7. **Consistent Naming** - Uses PascalCase for classes, snake_case for modules, etc.

## Example Generation

### Scenario: Create authentication service in Node.js

**User Input:**
- Epic: "User Authentication System"
- Story: "Implement user login with JWT"
- Components: "Login Form", "Auth Service", "JWT Handler"
- Language: "Node.js (Express)"
- Tests: "Jest"

**Generated Files:**

**`implement_user_login_with_jwt_service.js`**
```javascript
/**
 * Implement user login with JWT - Business Logic Implementation
 */

class ImplementUserLoginWithJwtService {
  constructor() {
    this.name = "ImplementUserLoginWithJwt";
    this.version = "1.0.0";
  }

  async execute(credentials) {
    // Validate credentials
    // Generate JWT token
    // Return token
    return {
      status: "success",
      message: "Login successful",
      token: "jwt_token_here",
      components: ["Login Form", "Auth Service", "JWT Handler"]
    };
  }
}

module.exports = ImplementUserLoginWithJwtService;
```

**`implement_user_login_with_jwt_router.js`**
```javascript
const express = require('express');
const router = express.Router();
const ImplementUserLoginWithJwtService = require('./implement_user_login_with_jwt_service');

const authService = new ImplementUserLoginWithJwtService();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const result = await authService.execute(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

**`test_implement_user_login_with_jwt_service.js`**
```javascript
const ImplementUserLoginWithJwtService = require('./implement_user_login_with_jwt_service');

describe('ImplementUserLoginWithJwtService', () => {
  let service;

  beforeEach(() => {
    service = new ImplementUserLoginWithJwtService();
  });

  test('should initialize correctly', () => {
    expect(service.name).toBe('ImplementUserLoginWithJwt');
  });

  test('should execute login with credentials', async () => {
    const credentials = { email: 'user@example.com', password: 'password' };
    const result = await service.execute(credentials);
    expect(result.status).toBe('success');
    expect(result.token).toBeDefined();
  });
});
```

**`README.md`**
```markdown
# Implement user login with JWT

## Overview
Implement user login with JWT tokens for secure authentication

## Configuration
- **Language:** JavaScript (Express)
- **Framework:** Express.js
- **Test Framework:** Jest
- **Components:** Login Form, Auth Service, JWT Handler

## Generated Code Structure
- `implement_user_login_with_jwt_service.js` - Business logic implementation (JavaScript)
- `implement_user_login_with_jwt_router.js` - Express.js router and endpoints
- `test_implement_user_login_with_jwt_service.js` - Comprehensive test suite (Jest)

## How to Use
1. Review the generated code files
2. Integrate `implement_user_login_with_jwt_service.js` into your backend
3. Include `implement_user_login_with_jwt_router.js` in your Express.js app
4. Run tests: `jest test_implement_user_login_with_jwt_service.js`
```

## Summary

The Phase 5 generation system is now **fully language-aware** and respects all user selections:
- ✅ Language selection (Node.js, Python, Java, TypeScript, Go, C#)
- ✅ File extensions (`.js`, `.py`, `.java`, `.ts`, `.go`, `.cs`)
- ✅ Framework-specific code (Express, FastAPI, Spring Boot, etc.)
- ✅ Test framework selection (Jest, pytest, JUnit, etc.)
- ✅ All filters considered (epic, story, language, tests, components)
- ✅ Production-ready code generation

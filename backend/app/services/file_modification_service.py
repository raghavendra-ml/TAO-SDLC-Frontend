"""
File modification service for AI Chat TODO implementation
Handles actual code file modifications in generated deliverables
"""
import os
import re
from typing import Dict, List, Optional, Tuple
from pathlib import Path

class FileModificationService:
    """Service to modify generated code files based on TODO implementations"""
    
    def __init__(self, project_root: str = "/tmp/generated_code"):
        self.project_root = project_root
        
    def find_files_with_todos(self, directory: str) -> List[Dict[str, any]]:
        """Find all files containing TODO comments"""
        todo_files = []
        
        if not os.path.exists(directory):
            return todo_files
            
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.java', '.cpp', '.cs')):
                    file_path = os.path.join(root, file)
                    todos = self.extract_todos_from_file(file_path)
                    if todos:
                        todo_files.append({
                            'file_path': file_path,
                            'relative_path': os.path.relpath(file_path, directory),
                            'todos': todos
                        })
        
        return todo_files
    
    def extract_todos_from_file(self, file_path: str) -> List[Dict[str, any]]:
        """Extract TODO comments from a file with line numbers"""
        todos = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            for i, line in enumerate(lines, 1):
                if 'TODO:' in line or '# TODO' in line:
                    todos.append({
                        'line_number': i,
                        'content': line.strip(),
                        'context': self.get_context_around_line(lines, i-1)
                    })
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
            
        return todos
    
    def get_context_around_line(self, lines: List[str], line_index: int, context_lines: int = 3) -> Dict[str, any]:
        """Get context around a specific line"""
        start = max(0, line_index - context_lines)
        end = min(len(lines), line_index + context_lines + 1)
        
        return {
            'before': lines[start:line_index],
            'current': lines[line_index] if line_index < len(lines) else '',
            'after': lines[line_index+1:end]
        }
    
    def implement_todo(self, file_path: str, line_number: int, implementation: str) -> bool:
        """Replace a TODO comment with actual implementation"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if line_number <= 0 or line_number > len(lines):
                return False
                
            # Find the TODO line
            todo_line_idx = line_number - 1
            todo_line = lines[todo_line_idx]
            
            if 'TODO:' not in todo_line and '# TODO' not in todo_line:
                return False
            
            # Get indentation from the TODO line
            indentation = len(todo_line) - len(todo_line.lstrip())
            indent_str = todo_line[:indentation]
            
            # Format the implementation with proper indentation
            impl_lines = implementation.split('\n')
            formatted_impl = []
            for impl_line in impl_lines:
                if impl_line.strip():  # Skip empty lines
                    formatted_impl.append(indent_str + impl_line + '\n')
                else:
                    formatted_impl.append('\n')
            
            # Replace the TODO line with implementation
            lines[todo_line_idx:todo_line_idx+1] = formatted_impl
            
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
                
            return True
            
        except Exception as e:
            print(f"Error implementing TODO: {e}")
            return False
    
    def implement_multiple_todos(self, file_path: str, implementations: Dict[int, str]) -> Dict[int, bool]:
        """Implement multiple TODOs in a file"""
        results = {}
        
        # Sort by line number in descending order to avoid line number shifts
        for line_number in sorted(implementations.keys(), reverse=True):
            implementation = implementations[line_number]
            success = self.implement_todo(file_path, line_number, implementation)
            results[line_number] = success
            
        return results
    
    def generate_implementation_for_todo(self, todo_content: str, context: Dict[str, any], file_type: str = 'python') -> str:
        """Generate implementation based on TODO content and context"""
        
        todo_lower = todo_content.lower()
        
        # Authentication TODOs
        if any(keyword in todo_lower for keyword in ['auth', 'login', 'password', 'jwt', 'token']):
            if 'validation' in todo_lower:
                return self.get_auth_validation_code(file_type)
            elif 'hash' in todo_lower:
                return self.get_password_hash_code(file_type)
            elif 'token' in todo_lower:
                return self.get_token_generation_code(file_type)
            else:
                return self.get_generic_auth_code(file_type)
                
        # Database TODOs
        elif any(keyword in todo_lower for keyword in ['database', 'db', 'query', 'insert', 'update', 'delete']):
            if 'insert' in todo_lower or 'create' in todo_lower:
                return self.get_db_insert_code(file_type)
            elif 'update' in todo_lower:
                return self.get_db_update_code(file_type)
            elif 'delete' in todo_lower:
                return self.get_db_delete_code(file_type)
            elif 'query' in todo_lower or 'get' in todo_lower:
                return self.get_db_query_code(file_type)
            else:
                return self.get_generic_db_code(file_type)
                
        # Validation TODOs
        elif any(keyword in todo_lower for keyword in ['validation', 'validate', 'check']):
            return self.get_validation_code(file_type)
            
        # Error handling TODOs
        elif any(keyword in todo_lower for keyword in ['error', 'exception', 'handle']):
            return self.get_error_handling_code(file_type)
            
        # API endpoint TODOs
        elif any(keyword in todo_lower for keyword in ['endpoint', 'route', 'api']):
            return self.get_api_endpoint_code(file_type)
            
        # Generic implementation
        else:
            return self.get_generic_implementation(todo_content, file_type)
    
    def get_auth_validation_code(self, file_type: str) -> str:
        """Get authentication validation implementation"""
        if file_type == 'python':
            return """# Email validation
if not data.get('email') or '@' not in data['email']:
    raise ValueError("Valid email is required")

# Password strength validation  
password = data.get('password', '')
if len(password) < 8:
    raise ValueError("Password must be at least 8 characters")

# Check for existing user
existing = self.get_by_email(data['email'])
if existing:
    raise ValueError("Email already registered")"""
        return "// Validation logic implementation"
    
    def get_password_hash_code(self, file_type: str) -> str:
        """Get password hashing implementation"""
        if file_type == 'python':
            return """from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed_password = pwd_context.hash(data['password'])
data['password'] = hashed_password"""
        return "// Password hashing implementation"
    
    def get_db_insert_code(self, file_type: str) -> str:
        """Get database insert implementation"""
        if file_type == 'python':
            return """from datetime import datetime

# Set creation timestamp
data['created_at'] = datetime.utcnow()

# Generate unique ID
import uuid
data['id'] = str(uuid.uuid4())

# Here you would typically insert into database
# For now, storing in a class variable or returning the data
return data"""
        return "// Database insert implementation"
    
    def get_db_query_code(self, file_type: str) -> str:
        """Get database query implementation"""
        if file_type == 'python':
            return """# Database query implementation
# Replace with actual database query
try:
    # Example: SELECT * FROM table WHERE id = ?
    result = None  # Your database query here
    if not result:
        return None
    return result
except Exception as e:
    print(f"Database query error: {e}")
    return None"""
        return "// Database query implementation"
    
    def get_validation_code(self, file_type: str) -> str:
        """Get validation implementation"""
        if file_type == 'python':
            return """# Input validation
required_fields = ['email', 'password']
for field in required_fields:
    if not data.get(field):
        raise ValueError(f"{field} is required")

# Additional validation logic
if 'email' in data and '@' not in data['email']:
    raise ValueError("Invalid email format")"""
        return "// Validation implementation"
    
    def get_error_handling_code(self, file_type: str) -> str:
        """Get error handling implementation"""
        if file_type == 'python':
            return """try:
    # Your main logic here
    pass
except ValueError as e:
    print(f"Validation error: {e}")
    return {"error": str(e), "status": "validation_failed"}
except Exception as e:
    print(f"Unexpected error: {e}")
    return {"error": "Internal server error", "status": "error"}"""
        return "// Error handling implementation"
    
    def get_generic_implementation(self, todo_content: str, file_type: str) -> str:
        """Get generic implementation based on TODO content"""
        if file_type == 'python':
            return f"""# Implementation for: {todo_content}
# TODO: Add specific implementation based on requirements
pass"""
        return f"// Implementation for: {todo_content}"
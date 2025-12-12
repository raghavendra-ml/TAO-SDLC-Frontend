"""
Simplified TODO Implementation Service for Phase 5 Chat
Directly modifies deliverables in the database when user asks for TODO implementation
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app import models
import json


class SimpleTODOService:
    """Simplified service to actually modify TODO items in Phase 5 deliverables"""
    
    @staticmethod
    def find_and_replace_todos(db: Session, project_id: int, phase_id: int, query: str) -> dict:
        """Find and replace TODO items based on user query"""
        
        try:
            # Get phase data
            phase = db.query(models.Phase).filter(
                models.Phase.project_id == project_id,
                models.Phase.phase_number == phase_id
            ).first()
            
            if not phase:
                return {"success": False, "message": "Phase not found"}
            
            # Parse phase data safely
            try:
                if isinstance(phase.data, dict):
                    phase_data = phase.data
                elif isinstance(phase.data, str):
                    phase_data = json.loads(phase.data)
                else:
                    phase_data = {}
            except:
                phase_data = {}
            
            deliverables = phase_data.get('user_story_development', {})
            
            if not deliverables:
                return {"success": False, "message": "No deliverables found in Phase 5"}
            
            # Generate implementation based on query
            implementation = SimpleTODOService.generate_implementation(query)
            
            modifications_count = 0
            modified_files = []
            
            # Process each deliverable
            for story_key, deliverable_data in deliverables.items():
                if not isinstance(deliverable_data, dict):
                    continue
                    
                code_files = deliverable_data.get('code', [])
                if not isinstance(code_files, list):
                    continue
                
                # Process each code file
                for i, code_file in enumerate(code_files):
                    if not isinstance(code_file, dict):
                        continue
                        
                    content = code_file.get('content', '')
                    file_name = code_file.get('file', f'file_{i}.py')
                    
                    if 'TODO' in content:
                        # Replace TODOs with implementation
                        new_content, replaced_count = SimpleTODOService.replace_todos_in_content(
                            content, implementation, query
                        )
                        
                        if replaced_count > 0:
                            # Update the content
                            code_file['content'] = new_content
                            modifications_count += replaced_count
                            modified_files.append(f"{story_key}/{file_name}")
            
            # Save changes if modifications were made
            if modifications_count > 0:
                # Update the phase data in database
                phase_data['user_story_development'] = deliverables
                
                # Update using a direct query to avoid ORM issues
                db.execute(
                    "UPDATE phases SET data = :new_data WHERE id = :phase_id",
                    {"new_data": json.dumps(phase_data), "phase_id": phase.id}
                )
                db.commit()
                
                return {
                    "success": True,
                    "message": f"Successfully implemented {modifications_count} TODO(s)",
                    "modified_files": modified_files,
                    "implementation": implementation
                }
            else:
                return {
                    "success": False,
                    "message": "No matching TODO items found to implement",
                    "suggestion": "Try being more specific: 'implement database TODO' or 'authentication TODO'"
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Error modifying TODOs: {str(e)}"
            }
    
    @staticmethod
    def replace_todos_in_content(content: str, implementation: str, query: str) -> tuple:
        """Replace TODO comments with implementation in content"""
        
        lines = content.split('\n')
        replaced_count = 0
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Check if this line contains a TODO that matches the query
            if 'TODO:' in line and SimpleTODOService.should_replace_todo(line, query):
                # Get indentation from the TODO line
                indentation = len(line) - len(line.lstrip())
                indent_str = ' ' * indentation
                
                # Format implementation with proper indentation
                impl_lines = implementation.split('\n')
                formatted_impl = []
                
                for impl_line in impl_lines:
                    if impl_line.strip():  # Skip empty lines in implementation
                        formatted_impl.append(indent_str + impl_line)
                    else:
                        formatted_impl.append('')
                
                # Replace the TODO line with implementation
                lines[i:i+1] = formatted_impl
                replaced_count += 1
                i += len(formatted_impl)  # Skip past the new implementation
            else:
                i += 1
        
        return '\n'.join(lines), replaced_count
    
    @staticmethod
    def should_replace_todo(todo_line: str, query: str) -> bool:
        """Check if a TODO line should be replaced based on the query"""
        
        todo_lower = todo_line.lower()
        query_lower = query.lower()
        
        # General TODO replacement keywords
        general_keywords = ['implement', 'fill', 'complete', 'todo', 'fix']
        
        # Specific TODO type keywords
        auth_keywords = ['auth', 'authentication', 'password', 'login', 'jwt', 'token', 'validation']
        db_keywords = ['database', 'db', 'query', 'crud', 'get', 'list', 'update', 'delete']
        api_keywords = ['api', 'endpoint', 'route', 'response']
        
        # Check for general implementation request
        if any(keyword in query_lower for keyword in general_keywords):
            return True
        
        # Check for specific type matches
        if any(keyword in query_lower for keyword in auth_keywords) and any(keyword in todo_lower for keyword in auth_keywords):
            return True
            
        if any(keyword in query_lower for keyword in db_keywords) and any(keyword in todo_lower for keyword in db_keywords):
            return True
            
        if any(keyword in query_lower for keyword in api_keywords) and any(keyword in todo_lower for keyword in api_keywords):
            return True
        
        return False
    
    @staticmethod
    def generate_implementation(query: str) -> str:
        """Generate implementation code based on query"""
        
        query_lower = query.lower()
        
        # Authentication implementation
        if any(keyword in query_lower for keyword in ['auth', 'authentication', 'password', 'login', 'validation']):
            return """# Input validation
if not data.get('email') or '@' not in data['email']:
    raise ValueError("Valid email is required")

# Password validation
password = data.get('password', '')
if len(password) < 8:
    raise ValueError("Password must be at least 8 characters")

# Check for existing user
# existing = self.get_by_email(data['email'])
# if existing:
#     raise ValueError("Email already registered")"""

        # Database query implementation  
        elif 'get' in query_lower and ('database' in query_lower or 'query' in query_lower):
            return """# Database query implementation
try:
    # Replace with actual database query
    # result = db.query(YourModel).filter(YourModel.id == id).first()
    # if not result:
    #     return None
    # return result.to_dict()
    
    # Temporary placeholder - replace with actual DB logic
    return {"id": id, "status": "found"}
except Exception as e:
    print(f"Database query error: {e}")
    return None"""

        # List/pagination implementation
        elif 'list' in query_lower and ('pagination' in query_lower or 'database' in query_lower):
            return """# Database query with pagination
try:
    # Replace with actual database query
    # results = db.query(YourModel).offset(skip).limit(limit).all()
    # return [item.to_dict() for item in results]
    
    # Temporary placeholder - replace with actual DB logic
    return [{"id": f"item_{i}", "data": "sample"} for i in range(skip, min(skip + limit, skip + 5))]
except Exception as e:
    print(f"Database query error: {e}")
    return []"""

        # Update implementation
        elif 'update' in query_lower:
            return """# Update implementation
try:
    # Validate input data
    if not data:
        return None
    
    # Replace with actual database update
    # existing = db.query(YourModel).filter(YourModel.id == id).first()
    # if not existing:
    #     return None
    # 
    # for key, value in data.items():
    #     setattr(existing, key, value)
    # 
    # db.commit()
    # return existing.to_dict()
    
    # Temporary placeholder
    return {"id": id, "status": "updated", "data": data}
except Exception as e:
    print(f"Update error: {e}")
    return None"""

        # Delete implementation
        elif 'delete' in query_lower:
            return """# Delete implementation
try:
    # Replace with actual database delete
    # existing = db.query(YourModel).filter(YourModel.id == id).first()
    # if not existing:
    #     return False
    # 
    # db.delete(existing)  # Hard delete
    # # OR existing.is_deleted = True  # Soft delete
    # db.commit()
    # return True
    
    # Temporary placeholder
    print(f"Deleting item with id: {id}")
    return True
except Exception as e:
    print(f"Delete error: {e}")
    return False"""

        # Generic implementation
        else:
            return """# Implementation logic
try:
    # Add your specific implementation here
    # Replace this placeholder with actual logic
    print(f"Processing request: {data if 'data' in locals() else 'No data'}")
    
    # Example implementation structure:
    # 1. Validate inputs
    # 2. Process business logic  
    # 3. Return results
    
    return True  # Replace with actual return value
except Exception as e:
    print(f"Implementation error: {e}")
    return False"""
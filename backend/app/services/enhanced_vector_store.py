"""
Enhanced Vector Store Service with Dashboard and Project Context Support
Provides retrieval mechanisms for both project-specific and cross-project queries
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from pgvector.sqlalchemy import Vector
import os
import json
from datetime import datetime
import openai
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()

Base = declarative_base()

class ProjectMemory(Base):
    """Store project-related embeddings for semantic search"""
    __tablename__ = 'project_memories'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, nullable=True, index=True)  # NULL for global memories
    phase_id = Column(Integer, nullable=True, index=True)
    memory_type = Column(String(50), nullable=False, index=True)  # requirement, document, chat, note, project_summary
    content = Column(Text, nullable=False)
    meta_data = Column(Text)  # JSON string
    embedding = Column(Vector(1536))  # OpenAI embedding dimension
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ProjectMemory(project_id={self.project_id}, type={self.memory_type})>"

class EnhancedVectorStoreService:
    """Enhanced service for managing vector embeddings with dashboard support"""
    
    def __init__(self, database_url: str = None):
        if database_url is None:
            database_url = os.getenv("DATABASE_URL", "postgresql://admin_user:Postgres9527@localhost:5432/sdlc")
        
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Initialize OpenAI
        openai.api_key = os.getenv("OPENAI_API_KEY", "")
        self.use_embeddings = bool(openai.api_key and openai.api_key != "")
    
    def setup_database(self):
        """Setup pgvector extension and create tables"""
        with self.engine.connect() as conn:
            # Enable pgvector extension
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        
        # Create tables
        Base.metadata.create_all(self.engine)
    
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding vector for text using OpenAI"""
        if not self.use_embeddings:
            # Return dummy embedding for testing
            return [0.0] * 1536
        
        try:
            response = openai.Embedding.create(
                input=text,
                model="text-embedding-ada-002"
            )
            return response['data'][0]['embedding']
        except Exception as e:
            print(f"Error getting embedding: {e}")
            return [0.0] * 1536
    
    # ==================== STORE METHODS ====================
    
    def store_requirement_embedding(
        self,
        project_id: int,
        phase_id: int,
        requirement: Dict[str, Any],
        search_text: str
    ) -> int:
        """Store requirement with embedding"""
        embedding = self.get_embedding(search_text)
        
        session = self.SessionLocal()
        try:
            memory = ProjectMemory(
                project_id=project_id,
                phase_id=phase_id,
                memory_type='requirement',
                content=search_text,
                meta_data=json.dumps(requirement),
                embedding=embedding
            )
            session.add(memory)
            session.commit()
            memory_id = memory.id
            session.refresh(memory)
            return memory_id
        finally:
            session.close()
    
    def store_document_embedding(
        self,
        project_id: int,
        phase_id: int,
        document_type: str,
        content: str,
        metadata: Dict[str, Any] = None
    ) -> int:
        """Store document with embedding"""
        embedding = self.get_embedding(content)
        
        session = self.SessionLocal()
        try:
            memory = ProjectMemory(
                project_id=project_id,
                phase_id=phase_id,
                memory_type=f'document_{document_type}',
                content=content,
                meta_data=json.dumps(metadata or {}),
                embedding=embedding
            )
            session.add(memory)
            session.commit()
            memory_id = memory.id
            session.refresh(memory)
            return memory_id
        finally:
            session.close()
    
    def store_chat_embedding(
        self,
        project_id: int,
        phase_id: Optional[int],
        chat_data: Dict[str, Any],
        search_text: str
    ) -> int:
        """Store chat interaction with embedding"""
        embedding = self.get_embedding(search_text)
        
        session = self.SessionLocal()
        try:
            memory = ProjectMemory(
                project_id=project_id,
                phase_id=phase_id,
                memory_type='chat',
                content=search_text,
                meta_data=json.dumps(chat_data),
                embedding=embedding
            )
            session.add(memory)
            session.commit()
            memory_id = memory.id
            session.refresh(memory)
            return memory_id
        finally:
            session.close()
    
    def store_project_summary(
        self,
        project_id: int,
        summary: str,
        metadata: Dict[str, Any] = None
    ) -> int:
        """Store project summary for dashboard context"""
        embedding = self.get_embedding(summary)
        
        session = self.SessionLocal()
        try:
            memory = ProjectMemory(
                project_id=project_id,
                phase_id=None,
                memory_type='project_summary',
                content=summary,
                meta_data=json.dumps(metadata or {}),
                embedding=embedding
            )
            session.add(memory)
            session.commit()
            memory_id = memory.id
            session.refresh(memory)
            return memory_id
        finally:
            session.close()
    
    # ==================== SEARCH METHODS ====================
    
    def semantic_search(
        self,
        project_id: Optional[int],
        query_text: str,
        memory_type: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search on stored memories
        
        Args:
            project_id: Project ID to search within (None for dashboard - all projects)
            query_text: Text to search for
            memory_type: Optional filter by memory type
            limit: Maximum number of results
            
        Returns:
            List of matching memories with similarity scores
        """
        if not self.engine:
            return []
        
        try:
            query_embedding = self.get_embedding(query_text)
            
            session = self.SessionLocal()
            
            # Build query with cosine distance
            query = session.query(
                ProjectMemory,
                ProjectMemory.embedding.cosine_distance(query_embedding).label('distance')
            )
            
            # Filter by project if specified (project context)
            # If project_id is None, search across all projects (dashboard context)
            if project_id is not None:
                query = query.filter(ProjectMemory.project_id == project_id)
            
            # Filter by memory type if specified
            if memory_type:
                query = query.filter(ProjectMemory.memory_type == memory_type)
            
            # Order by similarity and limit
            results = query.order_by('distance').limit(limit).all()
            
            # Format results
            formatted_results = []
            for memory, distance in results:
                formatted_results.append({
                    'id': memory.id,
                    'project_id': memory.project_id,
                    'phase_id': memory.phase_id,
                    'memory_type': memory.memory_type,
                    'content': memory.content,
                    'meta_data': json.loads(memory.meta_data) if memory.meta_data else {},
                    'similarity': 1 - distance,  # Convert distance to similarity
                    'created_at': str(memory.created_at)
                })
            
            session.close()
            return formatted_results
            
        except Exception as e:
            print(f"Error in semantic search: {e}")
            return []
    
    def search_dashboard_context(
        self,
        query_text: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search across all projects for dashboard context
        Prioritizes project summaries and recent activities
        """
        return self.semantic_search(
            project_id=None,  # Search all projects
            query_text=query_text,
            memory_type=None,  # All types
            limit=limit
        )
    
    def search_project_context(
        self,
        project_id: int,
        query_text: str,
        phase_id: Optional[int] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search within a specific project
        Optionally filter by phase
        """
        results = self.semantic_search(
            project_id=project_id,
            query_text=query_text,
            memory_type=None,
            limit=limit * 2  # Get more results for phase filtering
        )
        
        # Filter by phase if specified
        if phase_id is not None:
            results = [r for r in results if r['phase_id'] == phase_id or r['phase_id'] is None]
        
        return results[:limit]
    
    # ==================== RETRIEVAL METHODS ====================
    
    def get_project_memories(
        self,
        project_id: int,
        memory_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all memories for a specific project"""
        if not self.engine:
            return []
        
        try:
            session = self.SessionLocal()
            
            query = session.query(ProjectMemory).filter(
                ProjectMemory.project_id == project_id
            )
            
            if memory_type:
                query = query.filter(ProjectMemory.memory_type == memory_type)
            
            results = query.order_by(ProjectMemory.created_at.desc()).limit(limit).all()
            
            formatted_results = []
            for memory in results:
                formatted_results.append({
                    'id': memory.id,
                    'project_id': memory.project_id,
                    'phase_id': memory.phase_id,
                    'memory_type': memory.memory_type,
                    'content': memory.content,
                    'meta_data': json.loads(memory.meta_data) if memory.meta_data else {},
                    'created_at': str(memory.created_at)
                })
            
            session.close()
            return formatted_results
            
        except Exception as e:
            print(f"Error getting project memories: {e}")
            return []
    
    def get_all_project_summaries(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get summaries of all projects for dashboard"""
        return self.get_all_memories(memory_type='project_summary', limit=limit)
    
    def get_all_memories(
        self,
        memory_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all memories across all projects (for dashboard context)"""
        if not self.engine:
            return []
        
        try:
            session = self.SessionLocal()
            
            query = session.query(ProjectMemory)
            
            if memory_type:
                query = query.filter(ProjectMemory.memory_type == memory_type)
            
            results = query.order_by(ProjectMemory.created_at.desc()).limit(limit).all()
            
            formatted_results = []
            for memory in results:
                formatted_results.append({
                    'id': memory.id,
                    'project_id': memory.project_id,
                    'phase_id': memory.phase_id,
                    'memory_type': memory.memory_type,
                    'content': memory.content,
                    'meta_data': json.loads(memory.meta_data) if memory.meta_data else {},
                    'created_at': str(memory.created_at)
                })
            
            session.close()
            return formatted_results
            
        except Exception as e:
            print(f"Error getting all memories: {e}")
            return []
    
    def get_recent_activities(
        self,
        project_id: Optional[int] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get recent activities (for dashboard or project)"""
        if project_id:
            return self.get_project_memories(project_id, limit=limit)
        else:
            return self.get_all_memories(limit=limit)
    
    # ==================== STATISTICS METHODS ====================
    
    def get_project_memory_stats(self, project_id: int) -> Dict[str, Any]:
        """Get statistics about project memories"""
        if not self.engine:
            return {}
        
        try:
            session = self.SessionLocal()
            
            total = session.query(func.count(ProjectMemory.id)).filter(
                ProjectMemory.project_id == project_id
            ).scalar()
            
            by_type = session.query(
                ProjectMemory.memory_type,
                func.count(ProjectMemory.id)
            ).filter(
                ProjectMemory.project_id == project_id
            ).group_by(ProjectMemory.memory_type).all()
            
            session.close()
            
            return {
                'total_memories': total,
                'by_type': {memory_type: count for memory_type, count in by_type}
            }
            
        except Exception as e:
            print(f"Error getting memory stats: {e}")
            return {}
    
    def get_global_memory_stats(self) -> Dict[str, Any]:
        """Get statistics about all memories (dashboard)"""
        if not self.engine:
            return {}
        
        try:
            session = self.SessionLocal()
            
            total = session.query(func.count(ProjectMemory.id)).scalar()
            
            by_project = session.query(
                ProjectMemory.project_id,
                func.count(ProjectMemory.id)
            ).group_by(ProjectMemory.project_id).all()
            
            by_type = session.query(
                ProjectMemory.memory_type,
                func.count(ProjectMemory.id)
            ).group_by(ProjectMemory.memory_type).all()
            
            session.close()
            
            return {
                'total_memories': total,
                'by_project': {project_id: count for project_id, count in by_project if project_id},
                'by_type': {memory_type: count for memory_type, count in by_type}
            }
            
        except Exception as e:
            print(f"Error getting global stats: {e}")
            return {}
    
    # ==================== DELETE METHODS ====================
    
    def delete_memory(self, memory_id: int) -> bool:
        """Delete a specific memory"""
        if not self.engine:
            return False
        
        try:
            session = self.SessionLocal()
            memory = session.query(ProjectMemory).filter(ProjectMemory.id == memory_id).first()
            if memory:
                session.delete(memory)
                session.commit()
                session.close()
                return True
            session.close()
            return False
        except Exception as e:
            print(f"Error deleting memory: {e}")
            return False
    
    def delete_project_memories(self, project_id: int) -> bool:
        """Delete all memories for a project"""
        if not self.engine:
            return False
        
        try:
            session = self.SessionLocal()
            session.query(ProjectMemory).filter(
                ProjectMemory.project_id == project_id
            ).delete()
            session.commit()
            session.close()
            return True
        except Exception as e:
            print(f"Error deleting project memories: {e}")
            return False

"""
Vector Store Service using pgvector for semantic search and memory
Stores project metadata, requirements, documents, and chat history
"""
from typing import List, Dict, Any, Optional
import json
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pgvector.sqlalchemy import Vector
import openai
import os
from datetime import datetime

Base = declarative_base()

class ProjectMemory(Base):
    """Store project-related embeddings for semantic search"""
    __tablename__ = 'project_memories'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, nullable=False, index=True)
    phase_id = Column(Integer, nullable=True, index=True)
    memory_type = Column(String(50), nullable=False, index=True)  # requirement, document, chat, note
    content = Column(Text, nullable=False)
    meta_data = Column(Text)  # JSON string (renamed from metadata to avoid SQLAlchemy conflict)
    embedding = Column(Vector(1536))  # OpenAI embedding dimension
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ProjectMemory(project_id={self.project_id}, type={self.memory_type})>"


class VectorStoreService:
    """Service for managing vector embeddings and semantic search"""
    
    def __init__(self, database_url: str = None):
        if database_url is None:
            database_url = os.getenv("DATABASE_URL", "postgresql://admin_user:Postgres9527@localhost:5432/sdlc")
        
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Initialize OpenAI (will use for embeddings)
        openai.api_key = os.getenv("OPENAI_API_KEY", "")
    
    def setup_database(self):
        """Setup pgvector extension and create tables"""
        from sqlalchemy import text
        with self.engine.connect() as conn:
            # Enable pgvector extension
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        
        # Create tables
        Base.metadata.create_all(self.engine)
    
    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text using OpenAI
        Falls back to mock embedding if API key not available
        """
        if not openai.api_key or openai.api_key == "":
            # Mock embedding for development (1536 dimensions)
            import hashlib
            hash_object = hashlib.md5(text.encode())
            hash_hex = hash_object.hexdigest()
            # Generate deterministic mock embedding
            mock_embedding = []
            for i in range(1536):
                val = int(hash_hex[(i % len(hash_hex)):(i % len(hash_hex)) + 1], 16) / 15.0 - 0.5
                mock_embedding.append(val)
            return mock_embedding
        
        try:
            response = openai.Embedding.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response['data'][0]['embedding']
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * 1536
    
    def store_requirement(
        self,
        project_id: int,
        phase_id: int,
        requirement: Dict[str, Any]
    ) -> int:
        """Store a requirement with its embedding"""
        # Create searchable text from requirement
        search_text = f"""
        Feature: {requirement.get('feature', '')}
        As a {requirement.get('as_a', '')}
        I want {requirement.get('i_want', '')}
        So that {requirement.get('so_that', '')}
        Priority: {requirement.get('priority', '')}
        """
        
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
    
    def store_document(
        self,
        project_id: int,
        phase_id: int,
        document_type: str,  # prd, brd, fsd, etc.
        content: str,
        metadata: Dict[str, Any] = None
    ) -> int:
        """Store a document with its embedding"""
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
    
    def store_chat_message(
        self,
        project_id: int,
        phase_id: Optional[int],
        user_message: str,
        ai_response: str,
        metadata: Dict[str, Any] = None
    ) -> int:
        """Store chat interaction for context"""
        chat_text = f"User: {user_message}\nAI: {ai_response}"
        embedding = self.get_embedding(chat_text)
        
        session = self.SessionLocal()
        try:
            memory = ProjectMemory(
                project_id=project_id,
                phase_id=phase_id,
                memory_type='chat',
                content=chat_text,
                meta_data=json.dumps({
                    'user_message': user_message,
                    'ai_response': ai_response,
                    **(metadata or {})
                }),
                embedding=embedding
            )
            session.add(memory)
            session.commit()
            memory_id = memory.id
            session.refresh(memory)
            return memory_id
        finally:
            session.close()
    
    def semantic_search(
        self,
        query: str,
        project_id: int,
        phase_id: Optional[int] = None,
        memory_types: List[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search on project memories
        Returns most relevant memories based on cosine similarity
        """
        query_embedding = self.get_embedding(query)
        
        session = self.SessionLocal()
        try:
            # Build query
            query_obj = session.query(
                ProjectMemory,
                ProjectMemory.embedding.cosine_distance(query_embedding).label('distance')
            ).filter(
                ProjectMemory.project_id == project_id
            )
            
            # Filter by phase if specified
            if phase_id is not None:
                query_obj = query_obj.filter(ProjectMemory.phase_id == phase_id)
            
            # Filter by memory types if specified
            if memory_types:
                query_obj = query_obj.filter(ProjectMemory.memory_type.in_(memory_types))
            
            # Order by similarity and limit
            results = query_obj.order_by('distance').limit(limit).all()
            
            # Format results
            formatted_results = []
            for memory, distance in results:
                formatted_results.append({
                    'id': memory.id,
                    'project_id': memory.project_id,
                    'phase_id': memory.phase_id,
                    'type': memory.memory_type,
                    'content': memory.content,
                    'metadata': json.loads(memory.meta_data) if memory.meta_data else {},
                    'similarity': 1 - distance,  # Convert distance to similarity
                    'created_at': memory.created_at.isoformat()
                })
            
            return formatted_results
        finally:
            session.close()
    
    def get_project_context(
        self,
        project_id: int,
        phase_id: Optional[int] = None,
        include_types: List[str] = None
    ) -> str:
        """
        Get comprehensive project context for AI
        Returns formatted string with all relevant information
        """
        session = self.SessionLocal()
        try:
            query = session.query(ProjectMemory).filter(
                ProjectMemory.project_id == project_id
            )
            
            if phase_id is not None:
                query = query.filter(ProjectMemory.phase_id == phase_id)
            
            if include_types:
                query = query.filter(ProjectMemory.memory_type.in_(include_types))
            
            memories = query.order_by(ProjectMemory.created_at.desc()).all()
            
            # Format context
            context_parts = []
            
            for memory in memories:
                context_parts.append(f"[{memory.memory_type.upper()}]")
                context_parts.append(memory.content)
                context_parts.append("---")
            
            return "\n".join(context_parts)
        finally:
            session.close()
    
    def get_relevant_context(
        self,
        query: str,
        project_id: int,
        phase_id: Optional[int] = None,
        max_tokens: int = 2000
    ) -> str:
        """
        Get most relevant context for a query
        Useful for RAG (Retrieval Augmented Generation)
        """
        # Perform semantic search
        results = self.semantic_search(
            query=query,
            project_id=project_id,
            phase_id=phase_id,
            limit=10
        )
        
        # Build context string
        context_parts = []
        total_length = 0
        
        for result in results:
            content = result['content']
            # Rough token estimation (1 token ≈ 4 characters)
            estimated_tokens = len(content) // 4
            
            if total_length + estimated_tokens > max_tokens:
                break
            
            context_parts.append(f"[{result['type']} - Relevance: {result['similarity']:.2f}]")
            context_parts.append(content)
            context_parts.append("---")
            total_length += estimated_tokens
        
        return "\n".join(context_parts)
    
    def delete_project_memories(self, project_id: int):
        """Delete all memories for a project"""
        session = self.SessionLocal()
        try:
            session.query(ProjectMemory).filter(
                ProjectMemory.project_id == project_id
            ).delete()
            session.commit()
        finally:
            session.close()
    
    def get_memory_stats(self, project_id: int) -> Dict[str, Any]:
        """Get statistics about stored memories for a project"""
        session = self.SessionLocal()
        try:
            # Count by type
            type_counts = session.query(
                ProjectMemory.memory_type,
                func.count(ProjectMemory.id).label('count')
            ).filter(
                ProjectMemory.project_id == project_id
            ).group_by(ProjectMemory.memory_type).all()
            
            total = session.query(func.count(ProjectMemory.id)).filter(
                ProjectMemory.project_id == project_id
            ).scalar()
            
            return {
                'total_memories': total,
                'by_type': {memory_type: count for memory_type, count in type_counts}
            }
        finally:
            session.close()


# Singleton instance
_vector_store = None

def get_vector_store() -> VectorStoreService:
    """Get or create vector store instance"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
        try:
            _vector_store.setup_database()
        except Exception as e:
            print(f"Warning: Could not setup vector store: {e}")
    return _vector_store


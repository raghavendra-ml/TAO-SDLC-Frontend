"""
RAG-based Chat Service with Multi-Node Architecture
Handles context-aware chat with Vector DB, SQL DB, and General AI fallback
"""
import os
import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.services.enhanced_vector_store import EnhancedVectorStoreService
from app import models
import openai
from dotenv import load_dotenv
import json

load_dotenv()

class RAGChatService:
    """
    Multi-node RAG chat service with intelligent routing
    - Vector DB for semantic search
    - SQL DB for structured data
    - General AI for fallback
    """
    
    def __init__(self):
        try:
            self.vector_store = EnhancedVectorStoreService()
        except Exception as e:
            print(f"Warning: Vector store initialization failed: {e}")
            self.vector_store = None
        
        openai.api_key = os.getenv("OPENAI_API_KEY", "")
        self.use_real_ai = bool(openai.api_key and openai.api_key != "")
    
    async def process_chat_query(
        self,
        query: str,
        context_type: str,  # "dashboard" or "project"
        project_id: Optional[int] = None,
        phase_id: Optional[int] = None,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    version_context: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for chat queries with intelligent routing
        
        Args:
            query: User's question
            context_type: "dashboard" (global) or "project" (project-specific)
            project_id: Current project ID (if in project context)
            phase_id: Current phase ID (if in phase context)
            db: Database session
            
        Returns:
            AI response with sources and confidence
        """
        
        # Initialize conversation history if not provided
        if conversation_history is None:
            conversation_history = []
        
        # Step 1: Detect query intent (consider conversation history)
        intent = self._detect_query_intent(query, context_type, conversation_history)
        
        # Step 2: Route to appropriate node(s)
        if context_type == "dashboard":
            response = await self._handle_dashboard_query(query, intent, conversation_history, db)
        else:
            response = await self._handle_project_query(
                query, intent, project_id, phase_id, conversation_history, version_context, db
            )
        
        # Step 3: Store chat interaction in vector DB for future context (best-effort)
        # Never fail the chat flow if vector storage is unavailable or misconfigured.
        if project_id and self.use_real_ai and self.vector_store:
            try:
                self.vector_store.store_chat_embedding(
                    project_id=project_id,
                    phase_id=phase_id,
                    chat_data={
                        "query": query,
                        "response": response["response"],
                        "intent": intent,
                        "sources": response.get("sources", [])
                    },
                    search_text=f"Q: {query}\nA: {response['response']}"
                )
            except Exception as e:
                # Log and continue; retrieval will still work with SQL/general fallback
                print(f"Warning: Failed to store chat embedding: {e}")
        
        return response
    
    def _detect_query_intent(self, query: str, context_type: str, conversation_history: Optional[List[Dict[str, Any]]] = None) -> str:
        """
        Detect what the user is asking about (considering conversation history)
        
        Returns:
            Intent category: "project_list", "project_status", "phase_guidance",
                           "requirement_info", "general_sdlc", "data_query"
        """
        query_lower = query.lower()
        
        # Check if query refers to previous context (e.g., "yes", "tell me more", "yes with phase 2")
        if conversation_history:
            # Check for simple affirmatives or follow-up phrases
            if any(word in query_lower for word in ["yes", "sure", "ok", "okay", "tell me more", "continue", "go ahead"]):
                # Continue from previous intent - extract from last AI response
                return "follow_up"
            
            # Check if asking about specific phase as follow-up (e.g., "phase 2", "with phase 2")
            if any(word in query_lower for word in ["phase 2", "phase 3", "phase 4", "phase 5", "phase 6"]) and len(query_lower.split()) <= 5:
                return "follow_up"
        
        # Dashboard context intents
        if context_type == "dashboard":
            if any(word in query_lower for word in ["approval", "pending", "waiting", "need to approve", "approvals are pending"]):
                return "approval_query"
            # Project list requests, including active list and phase-filtered queries
            elif (
                any(word in query_lower for word in ["how many", "count", "list", "all projects"]) or
                ("active" in query_lower and "project" in query_lower) or
                ("show me" in query_lower and "active" in query_lower) or
                ("phase" in query_lower)
            ):
                return "project_list"
            elif any(word in query_lower for word in ["status", "progress"]) and "phase" not in query_lower:
                return "project_status"
            elif any(word in query_lower for word in ["create", "start", "new project", "how do i create"]):
                return "project_creation"
            else:
                return "dashboard_general"
        
        # Project context intents
        else:
            # Version/change tracking queries - highest priority
            if any(word in query_lower for word in ["version", "change", "changed", "update", "updated", "modified", "edit", "history", "what changed", "diff", "difference"]):
                return "version_history"
            elif any(word in query_lower for word in ["next step", "what should", "how to", "guide"]):
                return "phase_guidance"
            elif any(word in query_lower for word in ["requirement", "feature", "user story"]):
                return "requirement_info"
            elif any(word in query_lower for word in ["risk", "issue", "problem"]):
                return "risk_analysis"
            elif any(word in query_lower for word in ["stakeholder", "approval", "who"]):
                return "stakeholder_info"
            elif any(word in query_lower for word in ["status", "progress", "complete"]):
                return "project_status"
            else:
                return "project_general"
    
    async def _handle_dashboard_query(
        self,
        query: str,
        intent: str,
        conversation_history: List[Dict[str, Any]],
        db: Optional[Session]
    ) -> Dict[str, Any]:
        """Handle queries in dashboard context (global view)"""
        assert db is not None, "Database session is required"
        
        # Node 1: SQL DB - Get structured data
        sql_context = self._get_dashboard_sql_context(db)
        
        # Node 2: Vector DB - Semantic search across all projects (dashboard context)
        vector_context = []
        if self.vector_store:
            try:
                vector_results = self.vector_store.search_dashboard_context(
                    query_text=query,
                    limit=5
                )
                vector_context = [r["content"] for r in vector_results]
            except Exception as e:
                print(f"Vector search error: {e}")
        
        # Node 3: Generate response with context
        if intent == "approval_query":
            response = self._generate_approval_response(sql_context, query)
        elif intent == "project_list":
            response = self._generate_project_list_response(sql_context, query)
        elif intent == "project_status":
            response = self._generate_project_status_response(sql_context, query)
        elif intent == "project_creation":
            response = self._generate_project_creation_guidance()
        elif intent == "follow_up":
            response = self._handle_follow_up(query, conversation_history, sql_context, db)
        else:
            response = self._generate_dashboard_general_response(
                query, sql_context, vector_context
            )
        
        return response
    
    async def _handle_project_query(
        self,
        query: str,
        intent: str,
        project_id: Optional[int],
        phase_id: Optional[int],
        conversation_history: List[Dict[str, Any]],
        version_context: Optional[Dict[str, Any]],
        db: Optional[Session]
    ) -> Dict[str, Any]:
        """Handle queries in project context (project-specific)"""
        assert db is not None, "Database session is required"
        if not project_id:
            return {
                "response": "I need to know which project you're asking about. Open a project and ask again.",
                "confidence_score": 50,
                "sources": [],
                "context_type": "project"
            }
        
    # Node 1: SQL DB - Get project data
        sql_context = self._get_project_sql_context(project_id, phase_id, db)
        
        # Node 2: Vector DB - Semantic search in project context
        vector_context = []
        if self.vector_store:
            try:
                vector_results = self.vector_store.search_project_context(
                    project_id=project_id,
                    query_text=query,
                    phase_id=phase_id,
                    limit=5
                )
                vector_context = [r["content"] for r in vector_results]
            except Exception as e:
                print(f"Vector search error: {e}")
        
        # Node 3: Generate context-aware response
        if intent == "version_history":
            response = self._generate_version_history_response(query, sql_context, version_context)
        elif intent == "phase_guidance":
            response = self._generate_phase_guidance(sql_context, phase_id)
        elif intent == "requirement_info":
            response = self._generate_requirement_info(sql_context, vector_context, query)
        elif intent == "risk_analysis":
            response = self._generate_risk_analysis(sql_context, vector_context)
        elif intent == "stakeholder_info":
            response = self._generate_stakeholder_info(sql_context)
        elif intent == "project_status":
            response = self._generate_project_progress(sql_context)
        else:
            response = self._generate_project_general_response(
                query, sql_context, vector_context
            )

        # If frontend supplied version context and it's NOT a version_history query,
        # enrich the response with a brief summary
        # so the assistant can differentiate PRD/BRD/requirements changes over time.
        if version_context and intent != "version_history":
            try:
                vc_summary = self._summarize_version_context(version_context)
                if vc_summary:
                    response["response"] += f"\n\n{vc_summary}"
                    # Record that version context contributed to the answer
                    sources = response.get("sources", [])
                    response["sources"] = list({*sources, "version_context"})
            except Exception as e:
                # Be resilient; never fail the chat due to version context formatting
                print(f"Version context enrich error: {e}")

        return response

    def _summarize_version_context(self, version_context: Dict[str, Any]) -> str:
        """Create a compact human-readable summary of version history if provided.

        Expected shape (from frontend):
        {
          "prd": { "versions": [...], "count": int, "lastUpdated": str?, ... },
          "brd": { ... },
          "requirements": { ... }
        }
        This function is defensive and handles partial payloads.
        """
        sections = []
        for key in ["prd", "brd", "requirements"]:
            data = version_context.get(key) if isinstance(version_context, dict) else None
            if not data:
                continue
            # Accept either array of versions or explicit count
            count = None
            last_updated = None
            if isinstance(data, dict):
                count = data.get("count") or (len(data.get("versions", [])) if isinstance(data.get("versions"), list) else None)
                last_updated = data.get("lastUpdated") or data.get("last_updated")
            elif isinstance(data, list):
                count = len(data)
                # Try to read last_updated from last element
                try:
                    last_updated = data[-1].get("timestamp") or data[-1].get("date")
                except Exception:
                    last_updated = None

            label = key.upper() if key != "requirements" else "Requirements"
            if count is not None:
                if last_updated:
                    sections.append(f"• {label}: {count} version(s), last updated {last_updated}")
                else:
                    sections.append(f"• {label}: {count} version(s)")

        if not sections:
            return ""

        return "🗂️ Version context:\n" + "\n".join(sections)

    def _extract_phase_number(self, query_lower: str) -> Optional[int]:
        """Extract phase number from natural language (e.g., 'phase 1', 'phase one', 'requirements phase')."""
        # Direct numeric capture
        m = re.search(r"phase\s*(\d+)", query_lower)
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                pass

        # Word -> number mapping
        word_map = {
            "one": 1, "first": 1,
            "two": 2, "second": 2,
            "three": 3, "third": 3,
            "four": 4, "fourth": 4,
            "five": 5, "fifth": 5,
            "six": 6, "sixth": 6,
        }
        for w, n in word_map.items():
            if f"phase {w}" in query_lower or f"{w} phase" in query_lower:
                return n

        # Synonym mapping
        synonyms = [
            (1, ["requirement", "requirements", "prd", "brd", "business analysis"]),
            (2, ["planning", "backlog", "sprint", "estimation"]),
            (3, ["architecture", "hld", "system design", "high level design"]),
            (4, ["development", "coding", "implementation", "api build"]),
            (5, ["testing", "qa", "quality", "test"]),
            (6, ["deployment", "release", "operations", "ops"]),
        ]
        for num, keys in synonyms:
            if any(k in query_lower for k in keys):
                return num
        return None
    
    def _get_dashboard_sql_context(self, db: Session) -> Dict[str, Any]:
        """Get structured data from SQL DB for dashboard context"""
        try:
            # Get all projects with their phases
            projects = db.query(models.Project).all()
            
            context = {
                "total_projects": len(projects),
                "projects": [],
                "active_projects": []
            }
            
            for project in projects:
                phases = db.query(models.Phase).filter(
                    models.Phase.project_id == project.id
                ).all()
                
                # Helpers to normalize enum/string status
                def _status_val(val):
                    return str(getattr(val, "value", val))

                completed_count = 0
                in_progress_count = 0
                pending_approval_count = 0
                for p in phases:
                    sval = _status_val(p.status)
                    if sval == str(models.PhaseStatus.APPROVED.value):
                        completed_count += 1
                    if sval == str(models.PhaseStatus.IN_PROGRESS.value):
                        in_progress_count += 1
                    if sval == str(models.PhaseStatus.PENDING_APPROVAL.value):
                        pending_approval_count += 1
                
                # Find current phase name
                current_phase_name = None
                for p in phases:
                    if _status_val(p.status) == str(models.PhaseStatus.IN_PROGRESS.value):
                        current_phase_name = p.phase_name
                        break
                
                project_info = {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "status": project.status,
                    "total_phases": len(phases),
                    "completed_phases": completed_count,
                    "in_progress_phases": in_progress_count,
                    "pending_approval_phases": pending_approval_count,
                    "current_phase_name": current_phase_name,
                    "current_phase_number": project.current_phase
                }
                
                context["projects"].append(project_info)
                
                # Add to active projects if status is active
                if str(project.status) == "active":
                    context["active_projects"].append(project_info)
            
            # Get overall statistics
            pending_approval_phases = db.query(models.Phase).filter(
                models.Phase.status == models.PhaseStatus.PENDING_APPROVAL
            ).all()
            
            # Group pending approvals by project
            pending_by_project = {}
            for phase in pending_approval_phases:
                proj = db.query(models.Project).filter(models.Project.id == phase.project_id).first()
                if proj:
                    if proj.name not in pending_by_project:
                        pending_by_project[proj.name] = []
                    pending_by_project[proj.name].append({
                        "phase_name": phase.phase_name,
                        "phase_number": phase.phase_number
                    })
            
            context["statistics"] = {
                "active_projects": len(context["active_projects"]),
                "completed_projects": len([p for p in projects if str(p.status) == "completed"]),
                "pending_approvals": len(pending_approval_phases),
                "pending_approvals_by_project": pending_by_project
            }
            
            return context
        except Exception as e:
            print(f"Error in _get_dashboard_sql_context: {e}")
            return {"error": str(e), "total_projects": 0, "projects": [], "active_projects": []}
    
    def _get_project_sql_context(
        self,
        project_id: int,
        phase_id: Optional[int],
        db: Session
    ) -> Dict[str, Any]:
        """Get structured data from SQL DB for project context"""
        try:
            project = db.query(models.Project).filter(
                models.Project.id == project_id
            ).first()
            
            if not project:
                return {"error": "Project not found"}
            
            phases = db.query(models.Phase).filter(
                models.Phase.project_id == project_id
            ).order_by(models.Phase.phase_number).all()
            
            current_phase = None
            if phase_id:
                current_phase = db.query(models.Phase).filter(
                    models.Phase.id == phase_id
                ).first()
            
            context = {
                "project": {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "status": project.status,
                    "created_at": str(project.created_at)
                },
                "phases": [
                    {
                        "id": p.id,
                        "number": p.phase_number,
                        "name": p.phase_name,
                        "status": p.status,
                        "data": p.data or {}
                    }
                    for p in phases
                ],
                "current_phase": {
                    "id": current_phase.id,
                    "number": current_phase.phase_number,
                    "name": current_phase.phase_name,
                    "status": current_phase.status,
                    "data": current_phase.data or {}
                } if current_phase else None,
                "progress": {
                    "total_phases": len(phases),
                    "completed": len([p for p in phases if str(getattr(p.status, "value", p.status)) == str(models.PhaseStatus.APPROVED.value)]),
                    "in_progress": len([p for p in phases if str(getattr(p.status, "value", p.status)) == str(models.PhaseStatus.IN_PROGRESS.value)]),
                    "pending": len([p for p in phases if str(getattr(p.status, "value", p.status)) == str(models.PhaseStatus.NOT_STARTED.value)])
                }
            }
            
            return context
        except Exception as e:
            return {"error": str(e)}
    
    def _generate_project_list_response(
        self,
        sql_context: Dict[str, Any],
        query: str
    ) -> Dict[str, Any]:
        """Generate response for project list queries"""
        total = sql_context.get("total_projects", 0)
        projects = sql_context.get("projects", [])
        active_projects = sql_context.get("active_projects", [])
        
        query_lower = query.lower()
        
        if total == 0:
            return {
                "response": "You don't have any projects yet. Click the **'+ New Project'** button in the top right to create your first project!",
                "confidence_score": 100,
                "sources": ["SQL Database"],
                "context_type": "dashboard"
            }
        
        # Check if asking about active projects specifically
        if "active" in query_lower:
            if len(active_projects) == 0:
                response = "You don't have any active projects at the moment."
            else:
                response = f"You have **{len(active_projects)} active project{'s' if len(active_projects) != 1 else ''}**:\n\n"
                for p in active_projects:
                    phase_info = f"{p['completed_phases']}/{p['total_phases']} phases completed"
                    current_phase = f" (Currently in: {p['current_phase_name']})" if p.get('current_phase_name') else ""
                    response += f"• **{p['name']}** - {phase_info}{current_phase}\n"
        elif "phase" in query_lower:
            # Try to parse specific phase number e.g., "phase 1", "phase2", etc.
            phase_match = re.search(r"phase\s*(\d+)", query_lower)
            target_phase = None
            if phase_match:
                try:
                    target_phase = int(phase_match.group(1))
                except ValueError:
                    target_phase = None
            # If "requirements" mentioned, map to phase 1
            if target_phase is None and "requirements" in query_lower:
                target_phase = 1

            if target_phase is not None:
                phase_projects = [
                    p for p in projects
                    if p.get("current_phase_number") == target_phase
                ]
                count = len(phase_projects)
                if count == 0:
                    response = f"No projects are currently in Phase {target_phase}."
                else:
                    response = f"There {'is' if count == 1 else 'are'} **{count} project{'s' if count != 1 else ''}** currently in **Phase {target_phase}**:\n\n"
                    for p in phase_projects:
                        response += f"• **{p['name']}** - {p.get('current_phase_name','')} ({p['completed_phases']}/{p['total_phases']} completed)\n"
            else:
                # Generic phase query without number -> show a quick breakdown
                buckets = {}
                for p in projects:
                    num = p.get("current_phase_number") or 0
                    buckets[num] = buckets.get(num, 0) + 1
                response = "**Projects by current phase:**\n\n" + "\n".join(
                    [f"• Phase {k}: {v}" for k, v in sorted(buckets.items()) if k]
                ) or "I couldn't determine current phases yet."
        else:
            # General project list
            response = f"You have **{total} total project{'s' if total != 1 else ''}** in your SDLC platform:\n\n"
            
            # Show all projects with their status
            for p in projects[:10]:  # Show first 10
                status_emoji = "🟢" if p["status"] == "active" else "🔵" if p["status"] == "completed" else "⚪"
                phase_info = f"{p['completed_phases']}/{p['total_phases']} phases"
                current_phase = f" - Currently: {p['current_phase_name']}" if p.get('current_phase_name') else ""
                response += f"{status_emoji} **{p['name']}** ({phase_info}){current_phase}\n"
            
            if total > 10:
                response += f"\n... and {total - 10} more project{'s' if (total - 10) != 1 else ''}."
        
        return {
            "response": response,
            "confidence_score": 95,
            "sources": ["SQL Database"],
            "context_type": "dashboard"
        }
    
    def _generate_project_status_response(
        self,
        sql_context: Dict[str, Any],
        query: str
    ) -> Dict[str, Any]:
        """Generate response for project status queries"""
        stats = sql_context.get("statistics", {})
        projects = sql_context.get("projects", [])
        active_projects = sql_context.get("active_projects", [])
        
        response = f"""📊 **Project Status Overview**

**Total Projects**: {sql_context.get('total_projects', 0)}
**Active Projects**: {stats.get('active_projects', 0)}
**Completed Projects**: {stats.get('completed_projects', 0)}
**Pending Approvals**: {stats.get('pending_approvals', 0)}

"""
        
        # Show active projects with their progress
        if active_projects:
            response += "**Active Project Details:**\n"
            for p in active_projects[:5]:
                progress_pct = int((p['completed_phases'] / p['total_phases']) * 100) if p['total_phases'] > 0 else 0
                progress_bar = "█" * (progress_pct // 10) + "░" * (10 - progress_pct // 10)
                current_phase = f" - {p['current_phase_name']}" if p.get('current_phase_name') else ""
                response += f"\n• **{p['name']}**\n"
                response += f"  Progress: [{progress_bar}] {progress_pct}% ({p['completed_phases']}/{p['total_phases']} phases){current_phase}\n"
            
            if len(active_projects) > 5:
                response += f"\n  ... and {len(active_projects) - 5} more active projects\n"
        
        response += "\n"
        
        if stats.get('pending_approvals', 0) > 0:
            response += f"⚠️ You have {stats['pending_approvals']} approval{'s' if stats['pending_approvals'] != 1 else ''} waiting for review."
        else:
            response += "✅ All projects are progressing smoothly!"
        
        return {
            "response": response,
            "confidence_score": 90,
            "sources": ["SQL Database"],
            "context_type": "dashboard"
        }
    
    def _generate_project_creation_guidance(self) -> Dict[str, Any]:
        """Generate guidance for creating a new project"""
        response = """🚀 **Creating a New Project**

To create a new project, follow these steps:

1. Click the **"+ New Project"** button in the top right
2. Fill in the project details:
   - Project Name
   - Description
   - Select team members
3. Click **"Create Project"**

The system will automatically:
- Create all 6 SDLC phases
- Set up approval workflows
- Initialize AI assistance

**The 6 phases are**:
1. Requirements & Business Analysis
2. Planning & Product Backlog
3. Architecture & High-Level Design
4. Detailed Design & Specification
5. Development, Testing & Code Review
6. Deployment, Release & Operations

Would you like me to guide you through any specific phase?"""
        
        return {
            "response": response,
            "confidence_score": 100,
            "sources": ["SDLC Knowledge Base"],
            "context_type": "dashboard"
        }
    
    def _generate_approval_response(
        self,
        sql_context: Dict[str, Any],
        query: str
    ) -> Dict[str, Any]:
        """Generate response for approval queries"""
        stats = sql_context.get("statistics", {})
        pending = stats.get("pending_approvals", 0)
        pending_by_project = stats.get("pending_approvals_by_project", {})
        
        if pending == 0:
            response = """✅ **No Pending Approvals**

Great news! You don't have any approvals waiting for your review at the moment.

All project phases are either in progress or already approved."""
        else:
            response = f"""📋 **Pending Approvals**

You have **{pending} approval{'s' if pending != 1 else ''}** waiting for your review:

"""
            # Add details about which projects and phases need approval
            for project_name, phases_list in pending_by_project.items():
                response += f"**{project_name}**\n"
                for phase_info in phases_list:
                    response += f"  • Phase {phase_info['phase_number']}: {phase_info['phase_name']}\n"
                response += "\n"
            
            response += """**To review and approve:**
1. Click on **"Approvals"** in the sidebar
2. Review each phase submission
3. Click **"Approve"** or **"Reject"** with comments

💡 **Tip**: You can provide conditional approval with specific feedback to help teams improve their submissions."""
        
        return {
            "response": response,
            "confidence_score": 95,
            "sources": ["SQL Database"],
            "context_type": "dashboard"
        }
    
    def _handle_follow_up(
        self,
        query: str,
        conversation_history: List[Dict[str, Any]],
        sql_context: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Handle follow-up queries based on conversation context"""
        query_lower = query.lower()
        
        # Check what was asked before
        if len(conversation_history) >= 2:
            last_user_query = ""
            for msg in reversed(conversation_history):
                if msg.get("role") == "user":
                    last_user_query = msg.get("content", "").lower()
                    break
            
            # If previous question was about creating a project and now asking about phase 2
            if "create" in last_user_query or "new project" in last_user_query:
                if "phase 2" in query_lower or "planning" in query_lower or "backlog" in query_lower:
                    return {
                        "response": """📊 **Phase 2: Planning & Product Backlog**

After creating your project, Phase 2 involves:

**Key Activities:**
1. **Generate Epics** - High-level business features
2. **Create User Stories** - Detailed requirements from user perspective
3. **Resource Planning** - Calculate team capacity and sprints
4. **Submit for Approval** - Send backlog for stakeholder review

**How to work in Phase 2:**
1. Go to your project page
2. Navigate to **"Phase 2: Planning & Product Backlog"**
3. Click **"Generate Epics"** button (AI will create them)
4. Click **"Generate User Stories"** for each epic
5. Review and edit as needed
6. Click **"Calculate Capacity"** for resource planning
7. Click **"Submit Phase 2 for Approval"**

**AI Features:**
- Auto-generates epics from Phase 1 requirements
- Creates realistic user stories (2-10 per epic)
- Estimates story points and complexity
- Confidence scoring for quality assurance

Ready to start working on Phase 2?""",
                        "confidence_score": 95,
                        "sources": ["SDLC Knowledge Base", "Context"],
                        "context_type": "dashboard"
                    }
        
        # Default follow-up response
        return {
            "response": "I'd be happy to help! Could you please provide more details about what you'd like to know?",
            "confidence_score": 50,
            "sources": ["Context"],
            "context_type": "dashboard"
        }
    
    def _generate_phase_guidance(
        self,
        sql_context: Dict[str, Any],
        phase_id: Optional[int]
    ) -> Dict[str, Any]:
        """Generate guidance for current phase"""
        current_phase = sql_context.get("current_phase")
        
        if not current_phase:
            return {
                "response": "I need to know which phase you're in to provide guidance. Could you specify the phase?",
                "confidence_score": 50,
                "sources": [],
                "context_type": "project"
            }
        
        phase_name = current_phase["name"]
        phase_number = current_phase["number"]
        
        guidance = {
            1: """📋 **Phase 1: Requirements & Business Analysis**

**Next Steps**:
1. ✅ **Upload Documents**: Click "Upload Documents" to add requirement files (Excel, Word, Text)
2. ✅ **Extract with AI**: Convert documents to Gherkin format
3. ✅ **Review Requirements**: Expand each requirement to see scenarios
4. ✅ **Generate PRD**: Click "Generate with AI" in the PRD section
5. ✅ **Generate BRD**: Click "Generate with AI" in the BRD section
6. ✅ **Analyze Risks**: Use "Analyze Risks with AI"
7. ✅ **Add Stakeholders**: Select approvers from database
8. ✅ **Submit for Approval**: Once all documents are ready

**Tips**:
- Be detailed in requirements for better AI conversion
- Approve requirements before generating PRD/BRD
- Export requirements as .feature files for testing""",
            
            2: """📊 **Phase 2: Planning & Product Backlog**

**Next Steps**:
1. Convert requirements to Epics
2. Break down Epics into User Stories
3. Estimate story points
4. Prioritize backlog
5. Plan sprints
6. Submit for approval

**Tips**:
- Use AI to generate user stories from requirements
- Follow INVEST criteria for user stories
- Consider dependencies between stories""",
            
            3: """🏗️ **Phase 3: Architecture & High-Level Design**

**Next Steps**:
1. Define system architecture
2. Create component diagrams
3. Design data flow
4. Plan infrastructure
5. Document technical decisions
6. Submit for approval

**Tips**:
- Consider scalability and performance
- Document architectural decisions (ADRs)
- Review with technical leads""",
            
            4: """📐 **Phase 4: Detailed Design & Specification**

**Next Steps**:
1. Create detailed component designs
2. Design database schema
3. Define API contracts
4. Write technical specifications
5. Create sequence diagrams
6. Submit for approval

**Tips**:
- Be specific about interfaces
- Document edge cases
- Include error handling""",
            
            5: """💻 **Phase 5: Development, Testing & Code Review**

**Next Steps**:
1. Implement features
2. Write unit tests
3. Conduct code reviews
4. Run integration tests
5. Fix bugs and issues
6. Submit for QA approval

**Tips**:
- Follow coding standards
- Write tests first (TDD)
- Review code thoroughly""",
            
            6: """🚀 **Phase 6: Deployment, Release & Operations**

**Next Steps**:
1. Prepare deployment plan
2. Set up CI/CD pipeline
3. Deploy to staging
4. Run smoke tests
5. Deploy to production
6. Monitor and support

**Tips**:
- Have rollback plan ready
- Monitor metrics closely
- Document deployment process"""
        }
        
        response = guidance.get(phase_number, "Phase guidance not available.")
        
        return {
            "response": response,
            "confidence_score": 95,
            "sources": ["SDLC Knowledge Base", "Project Data"],
            "context_type": "project"
        }
    
    def _generate_requirement_info(
        self,
        sql_context: Dict[str, Any],
        vector_context: List[str],
        query: str
    ) -> Dict[str, Any]:
        """Generate response about requirements using vector search"""
        
        if vector_context:
            response = "Based on your project requirements:\n\n"
            for i, context in enumerate(vector_context[:3], 1):
                response += f"{i}. {context[:200]}...\n\n"
            response += "\nWould you like more details about any specific requirement?"
        else:
            response = """I don't have specific requirement information yet. 

To add requirements:
1. Go to Phase 1: Requirements & Business Analysis
2. Upload requirement documents or add manually
3. Use "Extract with AI" to convert to Gherkin format

Once requirements are added, I'll be able to search and answer questions about them!"""
        
        return {
            "response": response,
            "confidence_score": 85 if vector_context else 70,
            "sources": ["Vector Database", "Project Data"] if vector_context else ["SDLC Knowledge"],
            "context_type": "project"
        }
    
    def _generate_risk_analysis(
        self,
        sql_context: Dict[str, Any],
        vector_context: List[str]
    ) -> Dict[str, Any]:
        """Generate risk analysis response"""
        current_phase = sql_context.get("current_phase", {})
        phase_data = current_phase.get("data", {})
        risks = phase_data.get("risks", [])
        
        if risks:
            response = "🚨 **Identified Risks**:\n\n"
            for risk in risks[:5]:
                severity = risk.get("severity", "Medium")
                emoji = "🔴" if severity == "High" else "🟡" if severity == "Medium" else "🟢"
                response += f"{emoji} **{risk.get('risk', 'Unknown risk')}**\n"
                response += f"   - Severity: {severity}\n"
                response += f"   - Mitigation: {risk.get('mitigation', 'TBD')}\n\n"
        else:
            response = """No risks have been identified yet.

To analyze risks:
1. Go to Phase 1: Requirements & Business Analysis
2. Click "Analyze Risks with AI"
3. Review and approve identified risks

AI will analyze your requirements and suggest potential risks and mitigation strategies."""
        
        return {
            "response": response,
            "confidence_score": 90 if risks else 75,
            "sources": ["Project Data", "Risk Analysis"],
            "context_type": "project"
        }
    
    def _generate_stakeholder_info(self, sql_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate stakeholder information"""
        current_phase = sql_context.get("current_phase", {})
        phase_data = current_phase.get("data", {})
        stakeholders = phase_data.get("stakeholders", [])
        
        if stakeholders:
            response = "👥 **Project Stakeholders**:\n\n"
            for sh in stakeholders:
                status_emoji = "✅" if sh.get("status") == "approved" else "⏳"
                response += f"{status_emoji} **{sh.get('role', 'Unknown')}**: {sh.get('name', 'Unknown')}\n"
        else:
            response = """No stakeholders have been added yet.

To add stakeholders:
1. Go to Phase 1: Requirements & Business Analysis
2. Click "Select from Database" or "Add Custom Stakeholder"
3. Choose approvers for this phase

Stakeholders will be notified when you submit for approval."""
        
        return {
            "response": response,
            "confidence_score": 95 if stakeholders else 80,
            "sources": ["Project Data"],
            "context_type": "project"
        }
    
    def _generate_version_history_response(
        self, 
        query: str, 
        sql_context: Dict[str, Any], 
        version_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate detailed response about version history and changes"""
        
        query_lower = query.lower()
        
        # If no version context provided, return guidance
        if not version_context or not isinstance(version_context, dict):
            return {
                "response": """I don't have access to version history at the moment. 

To track changes:
1. Make sure you're viewing a project with existing PRD/BRD or requirements
2. Each time you save drafts or generate documents, a new version is created
3. You can see version history below the PRD/BRD sections

Version tracking includes:
📝 PRD edits and generations
📋 BRD edits and generations  
✅ Requirements additions and uploads""",
                "confidence_score": 60,
                "sources": ["System"],
                "context_type": "project"
            }
        
        # Extract version history from context
        vh = version_context.get("versionHistory", {})
        prd_versions = vh.get("prd", []) if isinstance(vh, dict) else []
        brd_versions = vh.get("brd", []) if isinstance(vh, dict) else []
        req_versions = vh.get("requirements", []) if isinstance(vh, dict) else []
        
        response = ""
        sources = ["Version History"]
        
        # Determine what the user is asking about
        asking_about_prd = "prd" in query_lower or "product requirement" in query_lower
        asking_about_brd = "brd" in query_lower or "business requirement" in query_lower
        asking_about_req = "requirement" in query_lower and not (asking_about_prd or asking_about_brd)
        asking_about_all = not (asking_about_prd or asking_about_brd or asking_about_req)
        
        # Check for specific version number (e.g., "v2", "version 2")
        import re
        version_match = re.search(r'v(?:ersion)?\s*(\d+)', query_lower)
        requested_version = int(version_match.group(1)) if version_match else None
        
        # Check if asking for comparison/analysis/differences
        asking_for_comparison = any(word in query_lower for word in 
            ["compare", "difference", "diff", "between", "vs", "versus", "changed", "analyze", "analyse", "what added"])
        asking_for_details = any(word in query_lower for word in
            ["detail", "show", "what's in", "content", "full"])
        
        # PRD Version History
        if (asking_about_prd or asking_about_all) and prd_versions:
            response += "📝 **PRD (Product Requirements Document) History**:\n\n"
            for v in prd_versions:
                version_num = v.get("version", "?")
                edited_at = v.get("editedAt", "Unknown time")
                edited_by = v.get("editedBy", "Unknown")
                change_type = v.get("changeType", "edit")
                summary = v.get("summary", "")
                
                # Format timestamp
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(edited_at.replace('Z', '+00:00'))
                    time_str = dt.strftime("%d %b %Y, %I:%M %p")
                except:
                    time_str = edited_at
                
                emoji = "🤖" if change_type == "ai-generate" else "✏️"
                response += f"{emoji} **Version {version_num}** ({time_str})\n"
                response += f"   By: {edited_by} | Type: {change_type}\n"
                if summary:
                    response += f"   📌 {summary}\n"
                
                # If specific version requested, show content snippet
                if requested_version == version_num and v.get("content"):
                    content = v.get("content", "")
                    snippet = content[:300] + "..." if len(content) > 300 else content
                    response += f"   📄 Content preview:\n```\n{snippet}\n```\n"
                response += "\n"
        
        # BRD Version History
        if (asking_about_brd or asking_about_all) and brd_versions:
            response += "📋 **BRD (Business Requirements Document) History**:\n\n"
            for v in brd_versions:
                version_num = v.get("version", "?")
                edited_at = v.get("editedAt", "Unknown time")
                edited_by = v.get("editedBy", "Unknown")
                change_type = v.get("changeType", "edit")
                summary = v.get("summary", "")
                
                # Format timestamp
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(edited_at.replace('Z', '+00:00'))
                    time_str = dt.strftime("%d %b %Y, %I:%M %p")
                except:
                    time_str = edited_at
                
                emoji = "🤖" if change_type == "ai-generate" else "✏️"
                response += f"{emoji} **Version {version_num}** ({time_str})\n"
                response += f"   By: {edited_by} | Type: {change_type}\n"
                if summary:
                    response += f"   📌 {summary}\n"
                
                # If specific version requested, show content snippet
                if requested_version == version_num and v.get("content"):
                    content = v.get("content", "")
                    snippet = content[:300] + "..." if len(content) > 300 else content
                    response += f"   📄 Content preview:\n```\n{snippet}\n```\n"
                response += "\n"
        
        # Requirements Version History
        if (asking_about_req or asking_about_all) and req_versions:
            response += "✅ **Requirements History**:\n\n"
            for v in req_versions:
                version_num = v.get("version", "?")
                edited_at = v.get("editedAt", "Unknown time")
                edited_by = v.get("editedBy", "Unknown")
                change_type = v.get("changeType", "edit")
                summary = v.get("summary", "")
                
                # Format timestamp
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(edited_at.replace('Z', '+00:00'))
                    time_str = dt.strftime("%d %b %Y, %I:%M %p")
                except:
                    time_str = edited_at
                
                type_emoji = {
                    "upload": "📤",
                    "manual": "✍️",
                    "edit": "✏️",
                    "ai-generate": "🤖"
                }.get(change_type, "📝")
                
                response += f"{type_emoji} **Version {version_num}** ({time_str})\n"
                response += f"   By: {edited_by} | Type: {change_type}\n"
                if summary:
                    response += f"   📌 {summary}\n"
                response += "\n"
        
        # If asking for comparison and we have content snapshots
        if asking_for_comparison and (prd_versions or brd_versions):
            response += self._analyze_version_changes(
                prd_versions if asking_about_prd or asking_about_all else [],
                brd_versions if asking_about_brd or asking_about_all else [],
                requested_version
            )
        
        # If no versions found for requested documents
        if not response:
            response = "No version history found for the requested documents.\n\n"
            response += "Version history is created when you:\n"
            response += "- Generate PRD/BRD with AI\n"
            response += "- Save draft edits\n"
            response += "- Upload or extract requirements\n"
            response += "- Manually add/edit requirements\n"
            sources = ["System"]
        
        # Add intelligent follow-up suggestions based on what we found
        follow_ups = []
        if prd_versions and len(prd_versions) > 1:
            follow_ups.append(f"Analyze differences between PRD v{prd_versions[0].get('version', 1)} and v{prd_versions[-1].get('version', 2)}")
            follow_ups.append(f"What changed in PRD v{prd_versions[-1].get('version', 2)}?")
        if brd_versions and len(brd_versions) > 1:
            follow_ups.append(f"Compare BRD v{brd_versions[0].get('version', 1)} and v{brd_versions[-1].get('version', 2)}")
            follow_ups.append(f"Show me what was added in BRD v{brd_versions[-1].get('version', 2)}")
        if req_versions:
            follow_ups.append("What requirements were added recently?")
        
        if follow_ups and not asking_for_comparison:
            response += "\n\n💡 **Follow-up questions you can ask**:\n"
            for i, q in enumerate(follow_ups[:4], 1):  # Limit to 4 suggestions
                response += f"{i}. \"{q}\"\n"
        
        confidence = 95 if response and (prd_versions or brd_versions or req_versions) else 70
        
        return {
            "response": response.strip(),
            "confidence_score": confidence,
            "sources": sources,
            "context_type": "project",
            "alternatives": follow_ups[:3] if follow_ups else []  # Send as suggested questions
        }
    
    def _analyze_version_changes(
        self,
        prd_versions: List[Dict[str, Any]],
        brd_versions: List[Dict[str, Any]],
        specific_version: Optional[int] = None
    ) -> str:
        """Analyze actual changes between document versions"""
        analysis = "\n\n🔍 **Change Analysis**:\n\n"
        
        # Analyze PRD changes
        if prd_versions and len(prd_versions) > 1:
            analysis += "**PRD Changes**:\n"
            for i in range(1, len(prd_versions)):
                prev_v = prd_versions[i-1]
                curr_v = prd_versions[i]
                
                if specific_version and curr_v.get("version") != specific_version:
                    continue
                
                prev_content = prev_v.get("content", "")
                curr_content = curr_v.get("content", "")
                
                if prev_content and curr_content:
                    # Simple diff analysis
                    changes = self._simple_diff_analysis(prev_content, curr_content)
                    analysis += f"• v{prev_v.get('version')} → v{curr_v.get('version')}:\n"
                    analysis += changes + "\n"
                else:
                    summary = curr_v.get("summary", "Changes made")
                    analysis += f"• v{curr_v.get('version')}: {summary}\n"
            analysis += "\n"
        
        # Analyze BRD changes
        if brd_versions and len(brd_versions) > 1:
            analysis += "**BRD Changes**:\n"
            for i in range(1, len(brd_versions)):
                prev_v = brd_versions[i-1]
                curr_v = brd_versions[i]
                
                if specific_version and curr_v.get("version") != specific_version:
                    continue
                
                prev_content = prev_v.get("content", "")
                curr_content = curr_v.get("content", "")
                
                if prev_content and curr_content:
                    # Simple diff analysis
                    changes = self._simple_diff_analysis(prev_content, curr_content)
                    analysis += f"• v{prev_v.get('version')} → v{curr_v.get('version')}:\n"
                    analysis += changes + "\n"
                else:
                    summary = curr_v.get("summary", "Changes made")
                    analysis += f"• v{curr_v.get('version')}: {summary}\n"
            analysis += "\n"
        
        return analysis if "Changes" in analysis else ""
    
    def _simple_diff_analysis(self, old_content: str, new_content: str) -> str:
        """Perform simple text difference analysis with actual content preview"""
        # Split into lines and preserve order
        old_lines_list = old_content.split('\n')
        new_lines_list = new_content.split('\n')
        
        # Also use sets for quick diff
        old_lines = set(old_content.split('\n'))
        new_lines = set(new_content.split('\n'))
        
        added_lines = new_lines - old_lines
        removed_lines = old_lines - new_lines
        
        # Filter out empty lines and very short lines for cleaner preview
        added_meaningful = [line.strip() for line in added_lines if line.strip() and len(line.strip()) > 10]
        removed_meaningful = [line.strip() for line in removed_lines if line.strip() and len(line.strip()) > 10]
        
        result = ""
        
        # Show summary statistics
        if len(added_lines) > len(removed_lines):
            result += f"  ✅ Added ~{len(added_lines) - len(removed_lines)} new lines\n"
        elif len(removed_lines) > len(added_lines):
            result += f"  ❌ Removed ~{len(removed_lines) - len(added_lines)} lines\n"
        else:
            result += f"  ✏️ Modified ~{len(added_lines)} lines\n"
        
        # Show actual added content (preview)
        if added_meaningful:
            result += "\n  **📝 Added Content:**\n"
            for i, line in enumerate(added_meaningful[:5], 1):  # Show up to 5 lines
                # Truncate very long lines
                display_line = line[:100] + "..." if len(line) > 100 else line
                result += f"  {i}. {display_line}\n"
            
            if len(added_meaningful) > 5:
                result += f"  ... and {len(added_meaningful) - 5} more lines\n"
        
        # Show actual removed content (preview)
        if removed_meaningful:
            result += "\n  **🗑️ Removed Content:**\n"
            for i, line in enumerate(removed_meaningful[:3], 1):  # Show up to 3 lines
                display_line = line[:100] + "..." if len(line) > 100 else line
                result += f"  {i}. {display_line}\n"
            
            if len(removed_meaningful) > 3:
                result += f"  ... and {len(removed_meaningful) - 3} more lines\n"
        
        # Extract section headers that were added/modified
        added_sections = [line.strip() for line in added_lines if line.strip().startswith('#')]
        if added_sections:
            result += f"\n  📑 New sections: {', '.join(added_sections[:3])}\n"
        
        # Check for specific keywords that might indicate major changes
        keywords_added = []
        for keyword in ["compliance", "security", "performance", "scalability", "integration", "api", "database", "gdpr", "authentication", "authorization"]:
            if keyword.lower() in new_content.lower() and keyword.lower() not in old_content.lower():
                keywords_added.append(keyword.title())
        
        if keywords_added:
            result += f"\n  🔑 New topics: {', '.join(keywords_added[:5])}\n"
        
        return result if result else "  Minor text edits\n"
    
    def _generate_project_progress(self, sql_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate project progress response"""
        progress = sql_context.get("progress", {})
        project = sql_context.get("project", {})
        
        total = progress.get("total_phases", 6)
        completed = progress.get("completed", 0)
        in_progress = progress.get("in_progress", 0)
        
        percentage = int((completed / total) * 100) if total > 0 else 0
        
        response = f"""📊 **Project Progress: {project.get('name', 'Unknown')}**

**Overall Progress**: {percentage}% ({completed}/{total} phases completed)

**Phase Status**:
- ✅ Completed: {completed}
- 🔄 In Progress: {in_progress}
- ⏳ Pending: {progress.get('pending', 0)}

"""
        
        if percentage < 30:
            response += "🚀 You're just getting started! Focus on completing Phase 1 first."
        elif percentage < 70:
            response += "💪 Good progress! Keep the momentum going."
        else:
            response += "🎉 Almost there! You're in the final stretch."
        
        return {
            "response": response,
            "confidence_score": 95,
            "sources": ["Project Data"],
            "context_type": "project"
        }
    
    def _generate_dashboard_general_response(
        self,
        query: str,
        sql_context: Dict[str, Any],
        vector_context: List[str]
    ) -> Dict[str, Any]:
        """Generate general response for dashboard queries"""
        
        # Get project statistics
        total_projects = sql_context.get("total_projects", 0)
        stats = sql_context.get("statistics", {})
        active_count = stats.get("active_projects", 0)
        
        # Build context-aware response
        response = f"""👋 I'm here to help you manage your SDLC projects!

**Your Dashboard Summary:**
• Total Projects: {total_projects}
• Active Projects: {active_count}
• Completed Projects: {stats.get('completed_projects', 0)}
• Pending Approvals: {stats.get('pending_approvals', 0)}

**I can help you with:**
- 📊 Project status and progress tracking
- 📋 Creating and managing projects
- ✅ Checking and reviewing approvals
- 📈 Viewing detailed statistics
- 🎯 Phase-specific guidance

**Try asking:**
- "How many projects are there?"
- "Show me active projects"
- "What approvals are pending?"
- "Show me projects in phase 1"

"""
        
        if total_projects > 0:
            response += "\n💡 **Tip**: Click on any project card to get project-specific AI assistance!"
        else:
            response += "\n💡 **Tip**: Click **'+ New Project'** to create your first project and get started!"
        
        return {
            "response": response,
            "confidence_score": 80,
            "sources": ["SQL Database", "General AI"],
            "context_type": "dashboard"
        }
    
    def _generate_project_general_response(
        self,
        query: str,
        sql_context: Dict[str, Any],
        vector_context: List[str]
    ) -> Dict[str, Any]:
        """Generate general response for project queries"""
        
        project_name = sql_context.get("project", {}).get("name", "this project")
        
        response = f"""I'm here to help you with **{project_name}**!

**I can help you with**:
- 🎯 Phase guidance and next steps
- 📋 Requirements and features
- 🚨 Risk analysis
- 👥 Stakeholder information
- 📊 Project progress

**Try asking**:
- "What should I do next?"
- "Show me the requirements"
- "What are the risks?"
- "Who are the stakeholders?"
- "What's the project status?"

I'm learning about your project as you add more information!"""
        
        return {
            "response": response,
            "confidence_score": 75,
            "sources": ["General AI", "Project Context"],
            "context_type": "project"
        }

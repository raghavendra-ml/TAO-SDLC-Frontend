"""
JIRA Integration Router
Handles export of epics and user stories to JIRA
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import requests
import base64
from datetime import datetime

from ..database import get_db
from ..models import Phase, Project

router = APIRouter(tags=["integrations"])


class JiraConfig(BaseModel):
    url: str
    email: str
    api_token: str
    project_key: str


class JiraExportRequest(BaseModel):
    phase_id: int
    jira_config: JiraConfig


class JiraExportResponse(BaseModel):
    success: bool
    message: str
    exported_epics: int
    exported_stories: int
    jira_links: Optional[List[Dict[str, str]]] = None
    error: Optional[str] = None


class JiraStatsRequest(BaseModel):
    url: str
    email: str
    api_token: str
    project_key: Optional[str] = None


class JiraStatsResponse(BaseModel):
    success: bool
    projects: int
    issues: int
    in_progress: int
    completed: int
    error: Optional[str] = None


class JiraProjectDetail(BaseModel):
    key: str
    name: str
    description: Optional[str]
    project_type: str
    lead_name: Optional[str]
    url: str
    issue_count: int
    in_progress_count: int
    completed_count: int
    epic_count: int
    story_count: int


class JiraProjectsResponse(BaseModel):
    success: bool
    projects: List[JiraProjectDetail]
    error: Optional[str] = None


def sanitize_project_key(key: str) -> str:
    """
    Sanitize a project key to meet JIRA requirements:
    - Must start with uppercase letter
    - Followed by uppercase alphanumeric characters
    - No spaces or special characters
    """
    # Remove all non-alphanumeric characters
    key = ''.join(c for c in key if c.isalnum())
    
    # Convert to uppercase
    key = key.upper()
    
    # Ensure it starts with a letter
    if key and not key[0].isalpha():
        key = 'P' + key  # Prefix with 'P' for Project
    
    # Limit length (JIRA max is 10 characters)
    key = key[:10]
    
    # If empty or too short, return a default
    if len(key) < 2:
        key = "PROJ"
    
    return key


def generate_project_key(project_name: str) -> str:
    """
    Generate a JIRA project key from project name
    Examples:
    - "API Project" -> "APIP"
    - "Customer Management System" -> "CMS"
    - "Test Project" -> "TP"
    - "TEST PROJECT" -> "TP"
    """
    # Remove special characters and split into words
    words = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in project_name).split()
    
    if not words:
        return "PROJ"
    
    if len(words) == 1:
        # Single word: take first 3-5 letters
        key = words[0][:5].upper()
    else:
        # Multiple words: take first letter of each word
        key = ''.join(word[0] for word in words if word).upper()
        # If too short, add more letters from first word
        if len(key) < 2:
            key = words[0][:3].upper()
    
    # Sanitize to ensure JIRA compliance
    return sanitize_project_key(key)


@router.post("/jira/export", response_model=JiraExportResponse)
async def export_to_jira(
    request: JiraExportRequest,
    db: Session = Depends(get_db)
):
    """
    Export epics and user stories to JIRA
    Creates JIRA project if it doesn't exist
    """
    try:
        # Get phase data
        phase = db.query(Phase).filter(Phase.id == request.phase_id).first()
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        # Get project data
        project = db.query(Project).filter(Project.id == phase.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        phase_data = phase.data or {}
        epics = phase_data.get('epics', [])
        user_stories = phase_data.get('userStories', [])
        
        if not epics and not user_stories:
            return JiraExportResponse(
                success=False,
                message="No epics or user stories to export",
                exported_epics=0,
                exported_stories=0,
                error="No data available"
            )
        
        # Setup JIRA authentication
        jira_url = request.jira_config.url.rstrip('/')
        auth_string = f"{request.jira_config.email}:{request.jira_config.api_token}"
        auth_bytes = auth_string.encode('ascii')
        base64_bytes = base64.b64encode(auth_bytes)
        base64_auth = base64_bytes.decode('ascii')
        
        headers = {
            'Authorization': f'Basic {base64_auth}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Test JIRA connection
        try:
            test_response = requests.get(
                f"{jira_url}/rest/api/3/myself",
                headers=headers,
                timeout=10
            )
            test_response.raise_for_status()
        except requests.exceptions.RequestException as e:
            return JiraExportResponse(
                success=False,
                message="Failed to connect to JIRA",
                exported_epics=0,
                exported_stories=0,
                error=f"JIRA connection error: {str(e)}"
            )
        
        # Check if JIRA project exists, if not create it
        project_key_to_use = request.jira_config.project_key
        
        # If no project key provided, generate one from project name
        if not project_key_to_use or project_key_to_use.strip() == "":
            project_key_to_use = generate_project_key(project.name)
            print(f"📝 Generated project key: {project_key_to_use} from project name: {project.name}")
        else:
            # Sanitize user-provided key to ensure JIRA compliance
            original_key = project_key_to_use
            project_key_to_use = sanitize_project_key(project_key_to_use)
            if original_key != project_key_to_use:
                print(f"🔧 Sanitized project key: '{original_key}' -> '{project_key_to_use}'")
        
        # Check if project exists
        try:
            project_check_response = requests.get(
                f"{jira_url}/rest/api/3/project/{project_key_to_use}",
                headers=headers,
                timeout=10
            )
            
            if project_check_response.status_code == 404:
                # Project doesn't exist, create it
                print(f"📦 JIRA project '{project_key_to_use}' not found. Creating new project...")
                
                create_project_data = {
                    "key": project_key_to_use,
                    "name": project.name,
                    "projectTypeKey": "software",
                    "projectTemplateKey": "com.pyxis.greenhopper.jira:gh-simplified-agility-scrum",
                    "description": project.description or f"Auto-created from TAO SDLC project: {project.name}",
                    "leadAccountId": test_response.json().get('accountId')  # Use current user as lead
                }
                
                create_response = requests.post(
                    f"{jira_url}/rest/api/3/project",
                    headers=headers,
                    json=create_project_data,
                    timeout=30
                )
                
                if create_response.status_code == 201:
                    print(f"✅ Created new JIRA project: {project_key_to_use} - {project.name}")
                    
                    # Wait for project to fully initialize (JIRA needs time to set up issue types)
                    import time
                    print("⏳ Waiting for JIRA project to initialize...")
                    time.sleep(3)  # Wait 3 seconds for project initialization
                    
                else:
                    error_msg = f"Failed to create JIRA project: {create_response.status_code} - {create_response.text}"
                    print(f"❌ {error_msg}")
                    return JiraExportResponse(
                        success=False,
                        message="Failed to create JIRA project",
                        exported_epics=0,
                        exported_stories=0,
                        error=error_msg
                    )
            elif project_check_response.status_code == 200:
                print(f"✅ JIRA project '{project_key_to_use}' already exists")
            else:
                print(f"⚠️ Unexpected response checking project: {project_check_response.status_code}")
                
        except Exception as e:
            print(f"⚠️ Error checking/creating JIRA project: {str(e)}")
        
        # Get available issue types that can actually be CREATED in the project
        epic_issue_type_id = None
        story_issue_type_id = None
        
        print(f"🔍 Fetching creatable issue types for project '{project_key_to_use}'...")
        
        try:
            # Use the createmeta API - this shows exactly what can be created
            createmeta_response = requests.get(
                f"{jira_url}/rest/api/3/issue/createmeta",
                headers=headers,
                params={
                    'projectKeys': project_key_to_use,
                    'expand': 'projects.issuetypes'
                },
                timeout=10
            )
            
            if createmeta_response.status_code == 200:
                createmeta_data = createmeta_response.json()
                
                if 'projects' in createmeta_data and len(createmeta_data['projects']) > 0:
                    project_meta = createmeta_data['projects'][0]
                    creatable_issue_types = project_meta.get('issuetypes', [])
                    
                    if creatable_issue_types:
                        print(f"📋 Issue types that CAN be created in '{project_key_to_use}':")
                        for issue_type in creatable_issue_types:
                            issue_type_name = issue_type.get('name', '')
                            issue_type_id = issue_type.get('id', '')
                            type_name_lower = issue_type_name.lower()
                            
                            print(f"   - {issue_type_name} (ID: {issue_type_id})")
                            
                            if 'epic' in type_name_lower and not issue_type.get('subtask', False):
                                epic_issue_type_id = issue_type_id
                                print(f"      🎯 Will use this for Epics")
                            elif 'story' in type_name_lower and not issue_type.get('subtask', False):
                                story_issue_type_id = issue_type_id
                                print(f"      🎯 Will use this for Stories")
                    else:
                        print(f"⚠️ No creatable issue types found in project")
                else:
                    print(f"⚠️ Project not found in createmeta response")
            else:
                print(f"⚠️ Createmeta API returned {createmeta_response.status_code}")
                print(f"   Response: {createmeta_response.text[:200]}")
            
            # Final status
            if epic_issue_type_id:
                print(f"✅ Epic issue type ID: {epic_issue_type_id}")
            else:
                print(f"⚠️ Epic issue type not found - epics will not be created")
                print(f"   💡 Tip: In JIRA, go to Project Settings → Issue Types → Add 'Epic' type")
                    
            if story_issue_type_id:
                print(f"✅ Story issue type ID: {story_issue_type_id}")
            else:
                print(f"⚠️ Story issue type not found - stories will not be created")
                print(f"   💡 Tip: In JIRA, go to Project Settings → Issue Types → Add 'Story' type")
                
        except Exception as e:
            print(f"⚠️ Error fetching issue types: {str(e)}")
            import traceback
            traceback.print_exc()
        
        jira_links = []
        exported_epic_count = 0
        exported_story_count = 0
        
        # Create epics in JIRA
        epic_mapping = {}  # Map local epic IDs to JIRA epic keys
        failed_epics = []  # Track failed epics with reasons
        epic_counter = 1  # Counter for epic numbering
        
        # Skip epic creation if Epic issue type is not available
        if not epic_issue_type_id:
            print(f"⚠️ Skipping epic creation - Epic issue type not available in this project")
            print(f"   User stories will be created without epic parent")
        
        for epic in epics if epic_issue_type_id else []:
            try:
                # Build minimal required fields first with formatted title
                original_title = epic.get('title', 'Untitled Epic')
                formatted_summary = f"Epic-{epic_counter}: {original_title}"
                
                epic_data = {
                    "fields": {
                        "project": {"key": project_key_to_use},
                        "summary": formatted_summary,
                        "description": {
                            "type": "doc",
                            "version": 1,
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": epic.get('description', 'No description provided')
                                        }
                                    ]
                                }
                            ]
                        },
                        "issuetype": {"id": epic_issue_type_id}
                    }
                }
                
                # Try to add priority - but don't fail if it's not available
                # Priority is optional and may not be on all JIRA screens
                
                response = requests.post(
                    f"{jira_url}/rest/api/3/issue",
                    headers=headers,
                    json=epic_data,
                    timeout=30
                )
                
                if response.status_code == 201:
                    jira_epic = response.json()
                    epic_key = jira_epic.get('key')
                    epic_mapping[epic.get('id')] = epic_key
                    jira_links.append({
                        'type': 'epic',
                        'title': formatted_summary,
                        'key': epic_key,
                        'url': f"{jira_url}/browse/{epic_key}"
                    })
                    exported_epic_count += 1
                    epic_counter += 1  # Increment counter for next epic
                    print(f"✅ Created epic: {epic_key} - {formatted_summary}")
                else:
                    error_msg = f"Failed to create epic '{epic.get('title')}': {response.status_code} - {response.text}"
                    print(error_msg)
                    failed_epics.append({
                        'title': epic.get('title'),
                        'error': response.text
                    })
                    
            except Exception as e:
                error_msg = f"Error creating epic '{epic.get('title')}': {str(e)}"
                print(error_msg)
                failed_epics.append({
                    'title': epic.get('title'),
                    'error': str(e)
                })
                continue
        
        # Create user stories in JIRA
        failed_stories = []  # Track failed stories with reasons
        story_counter = 1  # Counter for story numbering
        
        # Skip story creation if Story issue type is not available
        if not story_issue_type_id:
            print(f"⚠️ Skipping user story creation - Story issue type not available in this project")
            print(f"   Please configure issue types in JIRA project settings")
        
        for story in user_stories if story_issue_type_id else []:
            try:
                # Build minimal required fields first with formatted title
                original_title = story.get('title', 'Untitled Story')
                formatted_summary = f"US-{story_counter}: {original_title}"
                
                story_data = {
                    "fields": {
                        "project": {"key": project_key_to_use},
                        "summary": formatted_summary,
                        "description": {
                            "type": "doc",
                            "version": 1,
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": story.get('description', 'No description provided')
                                        }
                                    ]
                                }
                            ]
                        },
                        "issuetype": {"id": story_issue_type_id}
                    }
                }
                
                # Note: Priority and Story Points are optional
                # They may not be available on all JIRA screens
                
                # Link to epic if available
                epic_id = story.get('epic_id')
                if epic_id and epic_id in epic_mapping:
                    story_data["fields"]["parent"] = {"key": epic_mapping[epic_id]}
                
                response = requests.post(
                    f"{jira_url}/rest/api/3/issue",
                    headers=headers,
                    json=story_data,
                    timeout=30
                )
                
                if response.status_code == 201:
                    jira_story = response.json()
                    story_key = jira_story.get('key')
                    jira_links.append({
                        'type': 'story',
                        'title': formatted_summary,
                        'key': story_key,
                        'url': f"{jira_url}/browse/{story_key}"
                    })
                    exported_story_count += 1
                    story_counter += 1  # Increment counter for next story
                    print(f"✅ Created story: {story_key} - {formatted_summary}")
                else:
                    error_msg = f"Failed to create story '{story.get('title')}': {response.status_code} - {response.text}"
                    print(error_msg)
                    failed_stories.append({
                        'title': story.get('title'),
                        'error': response.text
                    })
                    
            except Exception as e:
                error_msg = f"Error creating story '{story.get('title')}': {str(e)}"
                print(error_msg)
                failed_stories.append({
                    'title': story.get('title'),
                    'error': str(e)
                })
                continue
        
        # Debug: Print phase id and number being updated
        print(f"[EXPORT ENDPOINT] Exporting to JIRA for phase id={phase.id}, number={getattr(phase, 'phase_number', 'N/A')}")
        # Update phase data with JIRA integration info
        if exported_epic_count > 0 or exported_story_count > 0:
            phase_data['jiraIntegration'] = {
                'configured': True,
                'url': request.jira_config.url,
                'projectKey': request.jira_config.project_key,
                'lastExportDate': datetime.now().isoformat(),
                'exportedEpics': exported_epic_count,
                'exportedStories': exported_story_count
            }
            phase.data = phase_data
            db.commit()
            db.refresh(phase)
            print(f"✅ Saved JIRA integration data to database for phase {phase.id}")
            print(f"📊 Saved data: {phase_data.get('jiraIntegration')}")
        
        # Build detailed message
        message_parts = []
        if exported_epic_count > 0 or exported_story_count > 0:
            message_parts.append(f"Successfully exported {exported_epic_count} epics and {exported_story_count} stories to JIRA project '{project_key_to_use}'")
        
        if failed_epics:
            message_parts.append(f"⚠️ {len(failed_epics)} epics failed to export")
        if failed_stories:
            message_parts.append(f"⚠️ {len(failed_stories)} stories failed to export")
        
        # Determine overall success
        total_attempted = len(epics) + len(user_stories)
        total_exported = exported_epic_count + exported_story_count
        is_success = total_exported > 0
        
        final_message = ". ".join(message_parts) if message_parts else "No items were exported"
        
        # If nothing was exported but we tried, add troubleshooting hint
        if total_exported == 0 and total_attempted > 0:
            if not epic_issue_type_id or not story_issue_type_id:
                final_message += f". The JIRA project '{project_key_to_use}' does not have Epic and/or Story issue types configured. To fix: 1) Go to JIRA → Project Settings → Issue Types → Add 'Epic' and 'Story' types, OR 2) Use an existing JIRA project with Agile/Scrum setup, OR 3) Wait a few minutes if project was just created."
            else:
                final_message += ". Check that your JIRA project has the correct issue types (Epic, Story) and required fields configured."
        
        # Add project URL to jira_links if items were exported
        if is_success and jira_links:
            jira_links.insert(0, {
                'type': 'project',
                'title': f"JIRA Project: {project.name}",
                'key': project_key_to_use,
                'url': f"{jira_url}/browse/{project_key_to_use}"
            })
        
        return JiraExportResponse(
            success=is_success,
            message=final_message,
            exported_epics=exported_epic_count,
            exported_stories=exported_story_count,
            jira_links=jira_links,
            error=None if is_success else "Some or all items failed to export. Check console logs for details."
        )
        
    except Exception as e:
        print(f"Error in JIRA export: {str(e)}")
        return JiraExportResponse(
            success=False,
            message="Failed to export to JIRA",
            exported_epics=0,
            exported_stories=0,
            error=str(e)
        )


@router.post("/jira/projects", response_model=JiraProjectsResponse)
async def get_jira_projects(request: JiraStatsRequest):
    """
    Get detailed list of JIRA projects with issue counts
    """
    try:
        # Setup JIRA authentication
        jira_url = request.url.rstrip('/')
        auth_string = f"{request.email}:{request.api_token}"
        auth_bytes = auth_string.encode('ascii')
        base64_bytes = base64.b64encode(auth_bytes)
        base64_auth = base64_bytes.decode('ascii')
        
        headers = {
            'Authorization': f'Basic {base64_auth}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Test JIRA connection first
        try:
            test_response = requests.get(
                f"{jira_url}/rest/api/3/myself",
                headers=headers,
                timeout=10
            )
            test_response.raise_for_status()
        except requests.exceptions.RequestException as e:
            return JiraProjectsResponse(
                success=False,
                projects=[],
                error=f"JIRA connection error: {str(e)}"
            )
        
        # Get all accessible projects
        try:
            projects_response = requests.get(
                f"{jira_url}/rest/api/3/project/search",
                headers=headers,
                params={"expand": "description,lead"},
                timeout=15
            )
            projects_response.raise_for_status()
            projects_data = projects_response.json()
            projects_list = projects_data.get('values', [])
        except Exception as e:
            return JiraProjectsResponse(
                success=False,
                projects=[],
                error=f"Failed to fetch projects: {str(e)}"
            )
        
        # For each project, get issue counts
        detailed_projects = []
        for project in projects_list:
            project_key = project.get('key')
            project_name = project.get('name')
            
            # Skip if filtering by specific project and this doesn't match
            if request.project_key and project_key != request.project_key:
                continue
            
            # Get total issues
            total_issues = 0
            try:
                issues_response = requests.get(
                    f"{jira_url}/rest/api/3/search",
                    headers=headers,
                    params={
                        "jql": f"project = {project_key}",
                        "maxResults": 0,
                        "fields": "key"
                    },
                    timeout=10
                )
                issues_response.raise_for_status()
                total_issues = issues_response.json().get('total', 0)
            except:
                pass
            
            # Get in-progress issues
            in_progress = 0
            try:
                in_progress_response = requests.get(
                    f"{jira_url}/rest/api/3/search",
                    headers=headers,
                    params={
                        "jql": f"project = {project_key} AND status IN ('In Progress', 'In Development', 'In Review')",
                        "maxResults": 0,
                        "fields": "key"
                    },
                    timeout=10
                )
                in_progress_response.raise_for_status()
                in_progress = in_progress_response.json().get('total', 0)
            except:
                pass
            
            # Get completed issues
            completed = 0
            try:
                completed_response = requests.get(
                    f"{jira_url}/rest/api/3/search",
                    headers=headers,
                    params={
                        "jql": f"project = {project_key} AND status IN ('Done', 'Closed', 'Resolved', 'Complete')",
                        "maxResults": 0,
                        "fields": "key"
                    },
                    timeout=10
                )
                completed_response.raise_for_status()
                completed = completed_response.json().get('total', 0)
            except:
                pass
            
            # Get epic count
            epic_count = 0
            try:
                epic_response = requests.get(
                    f"{jira_url}/rest/api/3/search",
                    headers=headers,
                    params={
                        "jql": f"project = {project_key} AND type = Epic",
                        "maxResults": 0,
                        "fields": "key"
                    },
                    timeout=10
                )
                epic_response.raise_for_status()
                epic_count = epic_response.json().get('total', 0)
            except:
                pass
            
            # Get story count
            story_count = 0
            try:
                story_response = requests.get(
                    f"{jira_url}/rest/api/3/search",
                    headers=headers,
                    params={
                        "jql": f"project = {project_key} AND type = Story",
                        "maxResults": 0,
                        "fields": "key"
                    },
                    timeout=10
                )
                story_response.raise_for_status()
                story_count = story_response.json().get('total', 0)
            except:
                pass
            
            detailed_projects.append(JiraProjectDetail(
                key=project_key,
                name=project_name,
                description=project.get('description', ''),
                project_type=project.get('projectTypeKey', 'unknown'),
                lead_name=project.get('lead', {}).get('displayName', 'Unknown'),
                url=f"{jira_url}/browse/{project_key}",
                issue_count=total_issues,
                in_progress_count=in_progress,
                completed_count=completed,
                epic_count=epic_count,
                story_count=story_count
            ))
        
        return JiraProjectsResponse(
            success=True,
            projects=detailed_projects
        )
        
    except Exception as e:
        print(f"Error in JIRA projects: {str(e)}")
        return JiraProjectsResponse(
            success=False,
            projects=[],
            error=str(e)
        )


@router.post("/jira/stats", response_model=JiraStatsResponse)
async def get_jira_stats(request: JiraStatsRequest):
    """
    Get statistics from JIRA account (projects, issues, statuses)
    """
    try:
        # Setup JIRA authentication
        jira_url = request.url.rstrip('/')
        auth_string = f"{request.email}:{request.api_token}"
        auth_bytes = auth_string.encode('ascii')
        base64_bytes = base64.b64encode(auth_bytes)
        base64_auth = base64_bytes.decode('ascii')
        
        headers = {
            'Authorization': f'Basic {base64_auth}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Test JIRA connection first
        try:
            test_response = requests.get(
                f"{jira_url}/rest/api/3/myself",
                headers=headers,
                timeout=10
            )
            test_response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 410:
                return JiraStatsResponse(
                    success=False,
                    projects=0,
                    issues=0,
                    in_progress=0,
                    completed=0,
                    error=f"Jira site is no longer available (410 Gone). The Atlassian site '{jira_url}' may have been deleted or moved. Please verify your Jira URL and ensure the site is still active."
                )
            return JiraStatsResponse(
                success=False,
                projects=0,
                issues=0,
                in_progress=0,
                completed=0,
                error=f"JIRA connection error ({e.response.status_code}): {str(e)}"
            )
        except requests.exceptions.RequestException as e:
            return JiraStatsResponse(
                success=False,
                projects=0,
                issues=0,
                in_progress=0,
                completed=0,
                error=f"JIRA connection error: {str(e)}"
            )
        
        # Get all accessible projects
        try:
            projects_response = requests.get(
                f"{jira_url}/rest/api/3/project/search",
                headers=headers,
                timeout=10
            )
            projects_response.raise_for_status()
            projects_data = projects_response.json()
            total_projects = projects_data.get('total', 0)
        except Exception as e:
            print(f"Error fetching projects: {str(e)}")
            total_projects = 0
        
        # Build JQL query based on project_key
        if request.project_key:
            jql_base = f"project = {request.project_key}"
        else:
            jql_base = ""
        
        # Get total issues
        total_issues = 0
        try:
            issues_jql = jql_base if jql_base else "ORDER BY created DESC"
            issues_response = requests.get(
                f"{jira_url}/rest/api/3/search",
                headers=headers,
                params={
                    "jql": issues_jql,
                    "maxResults": 0,  # We only need the count
                    "fields": "key"
                },
                timeout=15
            )
            issues_response.raise_for_status()
            total_issues = issues_response.json().get('total', 0)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 410:
                print(f"⚠️ Jira site appears to be deleted or unavailable (410 Gone): {jira_url}")
                return JiraStatsResponse(
                    success=False,
                    projects=0,
                    issues=0,
                    in_progress=0,
                    completed=0,
                    error="Jira site is no longer available (410 Gone). The site may have been deleted or moved. Please verify your Jira URL."
                )
            print(f"Error fetching total issues: {str(e)}")
        except Exception as e:
            print(f"Error fetching total issues: {str(e)}")
        
        # Get in-progress issues
        in_progress = 0
        try:
            in_progress_jql = f"{jql_base} AND status IN ('In Progress', 'In Development', 'In Review')" if jql_base else "status IN ('In Progress', 'In Development', 'In Review')"
            in_progress_response = requests.get(
                f"{jira_url}/rest/api/3/search",
                headers=headers,
                params={
                    "jql": in_progress_jql,
                    "maxResults": 0,
                    "fields": "key"
                },
                timeout=15
            )
            in_progress_response.raise_for_status()
            in_progress = in_progress_response.json().get('total', 0)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 410:
                # Already handled above, skip
                pass
            else:
                print(f"Error fetching in-progress issues: {str(e)}")
        except Exception as e:
            print(f"Error fetching in-progress issues: {str(e)}")
        
        # Get completed issues
        completed = 0
        try:
            completed_jql = f"{jql_base} AND status IN ('Done', 'Closed', 'Resolved', 'Complete')" if jql_base else "status IN ('Done', 'Closed', 'Resolved', 'Complete')"
            completed_response = requests.get(
                f"{jira_url}/rest/api/3/search",
                headers=headers,
                params={
                    "jql": completed_jql,
                    "maxResults": 0,
                    "fields": "key"
                },
                timeout=15
            )
            completed_response.raise_for_status()
            completed = completed_response.json().get('total', 0)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 410:
                # Already handled above, skip
                pass
            else:
                print(f"Error fetching completed issues: {str(e)}")
        except Exception as e:
            print(f"Error fetching completed issues: {str(e)}")
        
        return JiraStatsResponse(
            success=True,
            projects=total_projects,
            issues=total_issues,
            in_progress=in_progress,
            completed=completed
        )
        
    except Exception as e:
        print(f"Error in JIRA stats: {str(e)}")
        return JiraStatsResponse(
            success=False,
            projects=0,
            issues=0,
            in_progress=0,
            completed=0,
            error=str(e)
        )

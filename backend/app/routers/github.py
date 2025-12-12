"""
GitHub Integration Router
Endpoints for connecting GitHub, managing repositories, and pushing/pulling code
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models import (
    Project, GitHubIntegration, RepositoryMapping, 
    GitHubCommitHistory, Phase5Deliverable
)
from app.services.github_service import GitHubService
from app.config import Config
from pydantic import BaseModel

# Pydantic models
class GitHubConnectionRequest(BaseModel):
    github_token: str
    github_username: str
    github_org_name: Optional[str] = None
    default_repo_url: str
    default_branch: str = "main"

class RepositoryMappingRequest(BaseModel):
    epic_id: str
    user_story_id: Optional[str] = None
    repo_owner: str
    repo_name: str
    branch_name: Optional[str] = None
    auto_generate_branch: bool = True
    target_folder: str = ""
    create_pr: bool = True

class PushCodeRequest(BaseModel):
    epic_id: str
    user_story_id: str
    repo_owner: str
    repo_name: str
    branch_name: str
    commit_message: str
    create_pr: bool = True

class PullCodeRequest(BaseModel):
    repo_owner: str
    repo_name: str
    branch_name: str = "main"
    file_paths: List[str] = []
    epic_id: Optional[str] = None
    story_id: Optional[str] = None

class CreateRepositoryRequest(BaseModel):
    repo_name: str
    description: str = ""
    is_private: bool = False
    epic_id: str
    epic_title: str
    story_id: str
    story_title: str

class CreateBranchRequest(BaseModel):
    repo_owner: str
    repo_name: str
    branch_name: str
    base_branch: str = "main"
    epic_id: str
    epic_title: str
    story_id: str
    story_title: str

class PushCodeWithContextRequest(BaseModel):
    repo_owner: str
    repo_name: str
    branch_name: str
    epic_id: str
    epic_title: str
    story_id: str
    story_title: str
    code_files: List[Dict[str, Any]]
    commit_message: str = ""

router = APIRouter(prefix="/github", tags=["github"])

def get_github_service(db: Session) -> GitHubService:
    """Get GitHub service with token from first available integration"""
    # In production, you'd get the token from user context or project
    service = GitHubService()
    return service


@router.post("/connect/{project_id}")
async def connect_github(
    project_id: int,
    request: GitHubConnectionRequest,
    db: Session = Depends(get_db)
):
    """
    Connect GitHub account to project
    
    Args:
        project_id: Project ID
        request: GitHub connection details
    
    Returns:
        Connection status and validation result
    """
    try:
        # Check project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Use provided token or default from config
        github_token = request.github_token or Config.get_github_token()
        
        # Create GitHub service
        github_service = GitHubService(github_token)
        
        # Validate connection
        validation_result = github_service.validate_connection(request.default_repo_url)
        
        if not validation_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Failed to connect: {validation_result.get('error')}"
            )
        
        # Check if integration exists
        existing = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if existing:
            # Update existing
            existing.github_token = github_token
            existing.github_username = request.github_username
            existing.github_org_name = request.github_org_name
            existing.default_repo_url = request.default_repo_url
            existing.default_branch = request.default_branch
            existing.is_connected = True
            existing.connection_error = None
        else:
            # Create new
            integration = GitHubIntegration(
                project_id=project_id,
                github_token=github_token,
                github_username=request.github_username,
                github_org_name=request.github_org_name,
                default_repo_url=request.default_repo_url,
                default_branch=request.default_branch,
                is_connected=True
            )
            db.add(integration)
        
        db.commit()
        
        return {
            "success": True,
            "message": "GitHub connected successfully",
            "integration": {
                "project_id": project_id,
                "username": request.github_username,
                "org_name": request.github_org_name,
                "default_repo": request.default_repo_url,
                "branches_available": validation_result.get("branches_available"),
                "default_branch": validation_result.get("default_branch"),
                "has_write_access": validation_result.get("has_write_access")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")


@router.get("/integration/{project_id}")
async def get_github_integration(
    project_id: int,
    db: Session = Depends(get_db)
):
    """Get GitHub integration details for project"""
    try:
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration:
            return {
                "connected": False,
                "message": "GitHub not connected to this project"
            }
        
        return {
            "connected": integration.is_connected,
            "username": integration.github_username,
            "org_name": integration.github_org_name,
            "default_repo": integration.default_repo_url,
            "default_branch": integration.default_branch,
            "last_verified": integration.last_verified
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/repos/{project_id}")
async def list_repositories(
    project_id: int,
    username: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List repositories available in GitHub account
    
    Args:
        project_id: Project ID
        username: Optional GitHub username (uses connected user if not provided)
    
    Returns:
        List of repositories
    """
    try:
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Create service and list repos
        github_service = GitHubService(integration.github_token)
        repos = github_service.list_repositories(
            username or integration.github_username
        )
        
        return {
            "success": True,
            "repositories": repos,
            "count": len(repos)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/branches/{project_id}")
async def list_branches(
    project_id: int,
    repo_owner: str = Query(...),
    repo_name: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    List branches in a repository
    
    Args:
        project_id: Project ID
        repo_owner: Repository owner
        repo_name: Repository name
    
    Returns:
        List of branches
    """
    try:
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Create service and list branches
        github_service = GitHubService(integration.github_token)
        branches = github_service.list_branches(repo_owner, repo_name)
        
        return {
            "success": True,
            "owner": repo_owner,
            "repo": repo_name,
            "branches": branches,
            "count": len(branches)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/structure/{project_id}")
async def get_repo_structure(
    project_id: int,
    repo_owner: str = Query(...),
    repo_name: str = Query(...),
    path: str = Query(""),
    db: Session = Depends(get_db)
):
    """
    Get folder structure of repository
    
    Args:
        project_id: Project ID
        repo_owner: Repository owner
        repo_name: Repository name
        path: Optional path to explore
    
    Returns:
        Repository folder structure
    """
    try:
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Create service and get structure
        github_service = GitHubService(integration.github_token)
        structure = github_service.get_folder_structure(repo_owner, repo_name, path)
        
        return structure
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/map-repo")
async def map_repository(
    project_id: int,
    request: RepositoryMappingRequest,
    db: Session = Depends(get_db)
):
    """
    Map an epic/story to a GitHub repository
    
    Args:
        project_id: Project ID
        request: Mapping configuration
    
    Returns:
        Mapping creation status
    """
    try:
        # Check project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Generate branch name if auto-generate is enabled
        branch_name = request.branch_name
        if request.auto_generate_branch:
            # Get story title for branch naming
            story_title = "feature"
            if request.user_story_id:
                deliverable = db.query(Phase5Deliverable).filter(
                    Phase5Deliverable.project_id == project_id,
                    Phase5Deliverable.user_story_id == request.user_story_id
                ).first()
                if deliverable:
                    story_title = deliverable.story_title
            
            github_service = GitHubService()
            branch_name = github_service.generate_branch_name(
                int(request.epic_id),
                "epic",
                int(request.user_story_id) if request.user_story_id else 0,
                story_title
            )
        
        # Check if mapping exists
        existing = db.query(RepositoryMapping).filter(
            RepositoryMapping.project_id == project_id,
            RepositoryMapping.epic_id == request.epic_id,
            RepositoryMapping.user_story_id == request.user_story_id
        ).first()
        
        repo_full_url = f"https://github.com/{request.repo_owner}/{request.repo_name}"
        
        if existing:
            # Update existing
            existing.repo_name = request.repo_name
            existing.repo_owner = request.repo_owner
            existing.repo_full_url = repo_full_url
            existing.branch_name = branch_name
            existing.target_folder = request.target_folder
            existing.create_pr = request.create_pr
        else:
            # Create new mapping
            mapping = RepositoryMapping(
                project_id=project_id,
                epic_id=request.epic_id,
                user_story_id=request.user_story_id,
                repo_name=request.repo_name,
                repo_owner=request.repo_owner,
                repo_full_url=repo_full_url,
                branch_name=branch_name,
                auto_generate_branch=request.auto_generate_branch,
                target_folder=request.target_folder,
                create_pr=request.create_pr
            )
            db.add(mapping)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Repository mapped successfully",
            "mapping": {
                "epic_id": request.epic_id,
                "user_story_id": request.user_story_id,
                "repo": repo_full_url,
                "branch": branch_name,
                "target_folder": request.target_folder
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Mapping error: {str(e)}")


@router.post("/push-code")
async def push_code(
    project_id: int,
    request: PushCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Push generated code to GitHub repository
    
    Args:
        project_id: Project ID
        request: Push configuration with epic/story details
    
    Returns:
        Push status and commit details
    """
    try:
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Get deliverable to get file contents
        deliverable = db.query(Phase5Deliverable).filter(
            Phase5Deliverable.project_id == project_id,
            Phase5Deliverable.epic_id == request.epic_id,
            Phase5Deliverable.user_story_id == request.user_story_id
        ).first()
        
        if not deliverable:
            raise HTTPException(status_code=404, detail="No generated code found for this story")
        
        # Prepare files to push
        files_to_push = {}
        
        # Add code files
        if deliverable.code_content:
            for file_obj in deliverable.code_content:
                file_path = file_obj.get("file", "code.txt")
                files_to_push[file_path] = file_obj.get("content", "")
        
        # Add test files
        if deliverable.tests_content:
            for test_obj in deliverable.tests_content:
                file_path = test_obj.get("file", "test.txt")
                files_to_push[file_path] = test_obj.get("content", "")
        
        # Add README
        if deliverable.readme_content:
            files_to_push["README.md"] = deliverable.readme_content
        
        if not files_to_push:
            raise HTTPException(status_code=400, detail="No files to push")
        
        # Create service and push
        github_service = GitHubService(integration.github_token)
        
        push_result = github_service.push_code(
            owner=request.repo_owner,
            repo=request.repo_name,
            branch=request.branch_name,
            files=files_to_push,
            commit_message=request.commit_message,
            epic_id=int(request.epic_id),
            story_id=int(request.user_story_id)
        )
        
        if push_result.get("success"):
            # Record in commit history
            history = GitHubCommitHistory(
                project_id=project_id,
                epic_id=request.epic_id,
                user_story_id=request.user_story_id,
                repo_owner=request.repo_owner,
                repo_name=request.repo_name,
                branch_name=request.branch_name,
                commit_sha=push_result.get("commit_sha"),
                commit_message=request.commit_message,
                files_count=len(files_to_push),
                files_list=list(files_to_push.keys()),
                status="success"
            )
            db.add(history)
            db.commit()
        else:
            # Record failure
            history = GitHubCommitHistory(
                project_id=project_id,
                epic_id=request.epic_id,
                user_story_id=request.user_story_id,
                repo_owner=request.repo_owner,
                repo_name=request.repo_name,
                branch_name=request.branch_name,
                status="failed",
                error_message=push_result.get("error")
            )
            db.add(history)
            db.commit()
        
        return push_result
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Push error: {str(e)}")


@router.post("/pull-code")
async def pull_code(
    project_id: int,
    request: PullCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Pull code from GitHub repository to view existing structure
    
    Args:
        project_id: Project ID
        request: Pull configuration
    
    Returns:
        Repository structure and file details
    """
    try:
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Create service and pull
        github_service = GitHubService(integration.github_token)
        pull_result = github_service.pull_code(
            owner=request.repo_owner,
            repo=request.repo_name,
            branch=request.branch_name,
            path=request.path
        )
        
        return pull_result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pull error: {str(e)}")


@router.get("/commit-history/{project_id}")
async def get_commit_history(
    project_id: int,
    epic_id: Optional[str] = Query(None),
    user_story_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get commit history for project or specific epic/story
    
    Args:
        project_id: Project ID
        epic_id: Optional epic ID filter
        user_story_id: Optional story ID filter
    
    Returns:
        List of commits
    """
    try:
        query = db.query(GitHubCommitHistory).filter(
            GitHubCommitHistory.project_id == project_id
        )
        
        if epic_id:
            query = query.filter(GitHubCommitHistory.epic_id == epic_id)
        
        if user_story_id:
            query = query.filter(GitHubCommitHistory.user_story_id == user_story_id)
        
        commits = query.order_by(GitHubCommitHistory.created_at.desc()).all()
        
        return {
            "success": True,
            "commits": [
                {
                    "id": c.id,
                    "epic_id": c.epic_id,
                    "user_story_id": c.user_story_id,
                    "repo": f"{c.repo_owner}/{c.repo_name}",
                    "branch": c.branch_name,
                    "commit_sha": c.commit_sha,
                    "message": c.commit_message,
                    "files_count": c.files_count,
                    "status": c.status,
                    "created_at": c.created_at
                }
                for c in commits
            ],
            "count": len(commits)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/create-branch")
async def create_branch_endpoint(
    project_id: int,
    repo_owner: str = Query(...),
    repo_name: str = Query(...),
    branch_name: str = Query(...),
    from_branch: str = Query("main"),
    db: Session = Depends(get_db)
):
    """
    Create a new branch in repository
    
    Args:
        project_id: Project ID
        repo_owner: Repository owner
        repo_name: Repository name
        branch_name: New branch name
        from_branch: Base branch to create from
    
    Returns:
        Branch creation status
    """
    try:
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Create service and branch
        github_service = GitHubService(integration.github_token)
        result = github_service.create_branch(
            owner=repo_owner,
            repo=repo_name,
            branch_name=branch_name,
            from_branch=from_branch
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/create-repository/{project_id}")
def create_repository(
    project_id: int,
    request: CreateRepositoryRequest,
    db: Session = Depends(get_db)
):
    """Create a new GitHub repository with epic/story context"""
    try:
        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Create service and repository
        github_service = GitHubService(integration.github_token)
        result = github_service.create_repository(
            repo_name=request.repo_name,
            description=request.description,
            is_private=request.is_private,
            epic_id=request.epic_id,
            epic_title=request.epic_title,
            story_id=request.story_id,
            story_title=request.story_title
        )
        
        if result.get("success"):
            # Store repository info in database for future reference
            repo_url = result["repository"]["url"]
            mapping = RepositoryMapping(
                project_id=project_id,
                epic_id=request.epic_id,
                story_id=request.story_id,
                repo_details={
                    "name": request.repo_name,
                    "owner": integration.github_username,
                    "url": repo_url,
                    "private": request.is_private
                },
                branch_name="main",
                target_folder="",
                last_push_info={
                    "status": "created",
                    "created_at": __import__('datetime').datetime.now().isoformat()
                }
            )
            db.add(mapping)
            db.commit()
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/create-branch/{project_id}")
def create_branch_with_context(
    project_id: int,
    request: CreateBranchRequest,
    db: Session = Depends(get_db)
):
    """Create a new GitHub branch with automatic epic/story-based naming"""
    try:
        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Create service and branch
        github_service = GitHubService(integration.github_token)
        result = github_service.create_branch_with_context(
            owner=request.repo_owner,
            repo=request.repo_name,
            branch_name=request.branch_name,
            base_branch=request.base_branch,
            epic_id=request.epic_id,
            epic_title=request.epic_title,
            story_id=request.story_id,
            story_title=request.story_title
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/push-code-with-context/{project_id}")
def push_code_with_context(
    project_id: int,
    request: PushCodeWithContextRequest,
    db: Session = Depends(get_db)
):
    """Push code files with automatic epic/story context in commit message"""
    try:
        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get GitHub integration
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id
        ).first()
        
        if not integration or not integration.is_connected:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        # Create service and push code
        github_service = GitHubService(integration.github_token)
        result = github_service.push_code_with_epic_story_context(
            owner=request.repo_owner,
            repo=request.repo_name,
            branch=request.branch_name,
            code_files=request.code_files,
            epic_id=request.epic_id,
            epic_title=request.epic_title,
            story_id=request.story_id,
            story_title=request.story_title,
            commit_message=request.commit_message
        )
        
        if result.get("success"):
            # Record in commit history
            commit_record = GitHubCommitHistory(
                project_id=project_id,
                epic_id=request.epic_id,
                story_id=request.story_id,
                repo_details={
                    "owner": request.repo_owner,
                    "name": request.repo_name,
                    "branch": request.branch_name
                },
                commit_sha=result["commit"]["sha"],
                commit_message=result["commit"]["message"],
                files_list=[f.get("name", f.get("file", "unknown")) for f in request.code_files],
                pr_number=None,
                status="success"
            )
            db.add(commit_record)
            db.commit()
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/github/default-config")
async def get_default_github_config():
    """Get default GitHub configuration"""
    try:
        config = Config.get_github_config()
        return {
            "success": True,
            "config": config,
            "auto_connect": config.get("auto_connect", True)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading config: {str(e)}")


@router.post("/github/test-token")
async def test_github_token(token: str):
    """Test if GitHub token is valid"""
    try:
        service = GitHubService(token)
        # Try to get user info to validate token
        import requests
        headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
        response = requests.get("https://api.github.com/user", headers=headers, timeout=10)
        
        if response.status_code == 200:
            user_data = response.json()
            return {
                "success": True,
                "valid": True,
                "username": user_data.get("login"),
                "name": user_data.get("name"),
                "message": "Token is valid"
            }
        else:
            return {
                "success": False,
                "valid": False,
                "message": f"Token validation failed (Status: {response.status_code})"
            }
    except Exception as e:
        return {
            "success": False,
            "valid": False,
            "message": f"Error testing token: {str(e)}"
        }


@router.post("/github/pull-code/{project_id}")
async def pull_code(
    project_id: int,
    repo_owner: str,
    repo_name: str,
    branch_name: str = "main",
    file_paths: List[str] = None,
    epic_id: Optional[str] = None,
    story_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Pull code from GitHub repository"""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.project_id == project_id,
            GitHubIntegration.is_connected == True
        ).first()
        
        if not integration:
            raise HTTPException(status_code=400, detail="GitHub not connected")
        
        github_service = GitHubService(integration.github_token)
        
        import requests
        headers = {"Authorization": f"token {integration.github_token}", "Accept": "application/vnd.github.v3.raw+json"}
        
        files = []
        if file_paths:
            for file_path in file_paths:
                try:
                    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{file_path}?ref={branch_name}"
                    response = requests.get(url, headers=headers, timeout=30)
                    
                    if response.status_code == 200:
                        files.append({
                            "name": file_path.split('/')[-1],
                            "path": file_path,
                            "content": response.text
                        })
                except Exception as e:
                    print(f"Error pulling file {file_path}: {str(e)}")
        
        return {
            "success": True,
            "files": files,
            "count": len(files),
            "repo": f"{repo_owner}/{repo_name}",
            "branch": branch_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


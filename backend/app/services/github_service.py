"""
GitHub Integration Service
Handles GitHub push/pull operations based on epic and user story selections
"""

import os
import json
import subprocess
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import base64
from pathlib import Path

class GitHubService:
    """Service for GitHub integration with epic/story-based branching"""
    
    def __init__(self, github_token: Optional[str] = None):
        """Initialize GitHub service with optional token"""
        self.github_token = github_token or os.getenv('GITHUB_TOKEN')
        self.github_api = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {self.github_token}" if self.github_token else "",
            "Accept": "application/vnd.github.v3+json"
        }
    
    def validate_connection(self, repo_url: str) -> Dict[str, Any]:
        """
        Validate GitHub connection and repository access
        
        Args:
            repo_url: GitHub repository URL (https://github.com/owner/repo or git@github.com:owner/repo.git)
        
        Returns:
            Validation status with repository details
        """
        try:
            # Parse repository URL
            if repo_url.startswith('git@'):
                # SSH format: git@github.com:owner/repo.git
                parts = repo_url.replace('git@github.com:', '').replace('.git', '').split('/')
                owner, repo = parts[0], parts[1]
            else:
                # HTTPS format: https://github.com/owner/repo or https://github.com/owner/repo.git
                parts = repo_url.rstrip('/').replace('.git', '').split('/')
                owner, repo = parts[-2], parts[-1]
            
            print(f"[GitHub] Validating connection to {owner}/{repo}")
            
            # Get repository info
            repo_info = self._get_repo_info(owner, repo)
            
            if repo_info.get("error"):
                return {
                    "success": False,
                    "error": repo_info.get("error"),
                    "message": "Failed to connect to repository"
                }
            
            return {
                "success": True,
                "owner": owner,
                "repo": repo,
                "repo_url": repo_url,
                "repo_name": repo_info.get("name"),
                "description": repo_info.get("description"),
                "language": repo_info.get("language"),
                "branches_available": self.list_branches(owner, repo),
                "default_branch": repo_info.get("default_branch", "main"),
                "has_write_access": repo_info.get("permissions", {}).get("push", False)
            }
        except Exception as e:
            print(f"[GitHub] Connection validation error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to validate repository connection"
            }
    
    def _get_repo_info(self, owner: str, repo: str) -> Dict[str, Any]:
        """Get repository information from GitHub API"""
        try:
            import requests
            url = f"{self.github_api}/repos/{owner}/{repo}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "name": data.get("name"),
                    "description": data.get("description"),
                    "language": data.get("language"),
                    "default_branch": data.get("default_branch"),
                    "permissions": data.get("permissions", {})
                }
            else:
                return {"error": f"Repository not found or not accessible (Status: {response.status_code})"}
        except Exception as e:
            return {"error": str(e)}
    
    def list_branches(self, owner: str, repo: str) -> List[Dict[str, str]]:
        """
        List all branches in repository
        
        Args:
            owner: Repository owner
            repo: Repository name
        
        Returns:
            List of branches with details
        """
        try:
            import requests
            url = f"{self.github_api}/repos/{owner}/{repo}/branches"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                branches = response.json()
                return [
                    {
                        "name": b.get("name"),
                        "commit": b.get("commit", {}).get("sha", "")[:7],
                        "protected": b.get("protected", False),
                        "is_default": b.get("name") == "main" or b.get("name") == "master"
                    }
                    for b in branches[:20]  # Limit to 20 branches
                ]
            return []
        except Exception as e:
            print(f"[GitHub] Error listing branches: {str(e)}")
            return []
    
    def list_repositories(self, username: str) -> List[Dict[str, Any]]:
        """
        List repositories for a GitHub user
        
        Args:
            username: GitHub username
        
        Returns:
            List of repositories
        """
        try:
            import requests
            url = f"{self.github_api}/users/{username}/repos"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                repos = response.json()
                return [
                    {
                        "name": r.get("name"),
                        "url": r.get("html_url"),
                        "clone_url": r.get("clone_url"),
                        "ssh_url": r.get("ssh_url"),
                        "description": r.get("description"),
                        "language": r.get("language"),
                        "stars": r.get("stargazers_count"),
                        "is_fork": r.get("fork")
                    }
                    for r in repos[:50]  # Limit to 50 repos
                ]
            return []
        except Exception as e:
            print(f"[GitHub] Error listing repositories: {str(e)}")
            return []
    
    def create_branch(self, owner: str, repo: str, branch_name: str, from_branch: str = "main") -> Dict[str, Any]:
        """
        Create a new branch based on epic/story
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch_name: New branch name (e.g., epic-2-user-story-3)
            from_branch: Base branch to create from (default: main)
        
        Returns:
            Branch creation status
        """
        try:
            import requests
            
            # Get the commit SHA from the base branch
            url = f"{self.github_api}/repos/{owner}/{repo}/branches/{from_branch}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Base branch '{from_branch}' not found"
                }
            
            base_commit_sha = response.json()["commit"]["sha"]
            
            # Create new branch
            create_url = f"{self.github_api}/repos/{owner}/{repo}/git/refs"
            payload = {
                "ref": f"refs/heads/{branch_name}",
                "sha": base_commit_sha
            }
            
            create_response = requests.post(
                create_url,
                headers=self.headers,
                json=payload,
                timeout=10
            )
            
            if create_response.status_code in [201, 200]:
                return {
                    "success": True,
                    "branch": branch_name,
                    "created_from": from_branch,
                    "message": f"Branch '{branch_name}' created successfully"
                }
            else:
                return {
                    "success": False,
                    "error": create_response.json().get("message", "Failed to create branch")
                }
        except Exception as e:
            print(f"[GitHub] Error creating branch: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_branch_name(self, epic_id: int, epic_title: str, 
                            story_id: int, story_title: str) -> str:
        """
        Generate branch name from epic and story information
        
        Args:
            epic_id: Epic ID
            epic_title: Epic title
            story_id: Story ID
            story_title: Story title
        
        Returns:
            Generated branch name (e.g., epic-2-auth-system-story-3-user-login)
        """
        def sanitize(text: str) -> str:
            """Sanitize text for branch naming"""
            return text.lower().strip()[:20].replace(' ', '-').replace('_', '-')
        
        epic_part = f"epic-{epic_id}-{sanitize(epic_title)}"
        story_part = f"story-{story_id}-{sanitize(story_title)}"
        
        branch_name = f"{epic_part}/{story_part}"
        
        # Keep it under GitHub's practical limits
        if len(branch_name) > 250:
            branch_name = f"epic-{epic_id}/story-{story_id}"
        
        return branch_name
    
    def get_folder_structure(self, owner: str, repo: str, path: str = "") -> Dict[str, Any]:
        """
        Get folder structure of repository
        
        Args:
            owner: Repository owner
            repo: Repository name
            path: Path to list (empty for root)
        
        Returns:
            Folder structure with files and directories
        """
        try:
            import requests
            
            url = f"{self.github_api}/repos/{owner}/{repo}/contents/{path}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": "Failed to fetch folder structure",
                    "items": []
                }
            
            items = response.json() if isinstance(response.json(), list) else [response.json()]
            
            structure = {
                "success": True,
                "path": path,
                "items": [
                    {
                        "name": item.get("name"),
                        "type": item.get("type"),  # "file" or "dir"
                        "size": item.get("size"),
                        "url": item.get("html_url"),
                        "path": item.get("path"),
                        "download_url": item.get("download_url") if item.get("type") == "file" else None
                    }
                    for item in items
                ]
            }
            
            return structure
        except Exception as e:
            print(f"[GitHub] Error getting folder structure: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "items": []
            }
    
    def push_code(self, owner: str, repo: str, branch: str, 
                  files: Dict[str, str], commit_message: str,
                  epic_id: Optional[int] = None, story_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Push generated code files to GitHub
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch: Target branch
            files: Dictionary of {file_path: content}
            commit_message: Commit message
            epic_id: Epic ID for reference
            story_id: Story ID for reference
        
        Returns:
            Push status with details
        """
        try:
            import requests
            
            print(f"[GitHub] Pushing {len(files)} files to {owner}/{repo}/{branch}")
            
            # Get current branch tip
            url = f"{self.github_api}/repos/{owner}/{repo}/branches/{branch}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Branch '{branch}' not found"
                }
            
            current_commit = response.json()["commit"]["sha"]
            
            # Get the tree SHA
            tree_url = f"{self.github_api}/repos/{owner}/{repo}/git/trees/{current_commit}"
            tree_response = requests.get(tree_url, headers=self.headers, timeout=10)
            tree_sha = tree_response.json()["sha"]
            
            # Create blob for each file and collect tree items
            tree_items = []
            
            for file_path, content in files.items():
                # Create blob
                blob_url = f"{self.github_api}/repos/{owner}/{repo}/git/blobs"
                blob_payload = {
                    "content": content,
                    "encoding": "utf-8"
                }
                
                blob_response = requests.post(
                    blob_url,
                    headers=self.headers,
                    json=blob_payload,
                    timeout=10
                )
                
                if blob_response.status_code != 201:
                    return {
                        "success": False,
                        "error": f"Failed to create blob for {file_path}",
                        "details": blob_response.text
                    }
                
                blob_sha = blob_response.json()["sha"]
                
                # Add to tree items
                tree_items.append({
                    "path": file_path,
                    "mode": "100644",
                    "type": "blob",
                    "sha": blob_sha
                })
            
            # Create new tree
            new_tree_url = f"{self.github_api}/repos/{owner}/{repo}/git/trees"
            new_tree_payload = {
                "base_tree": tree_sha,
                "tree": tree_items
            }
            
            new_tree_response = requests.post(
                new_tree_url,
                headers=self.headers,
                json=new_tree_payload,
                timeout=10
            )
            
            if new_tree_response.status_code != 201:
                return {
                    "success": False,
                    "error": "Failed to create tree",
                    "details": new_tree_response.text
                }
            
            new_tree_sha = new_tree_response.json()["sha"]
            
            # Create commit
            author = {
                "name": "TAO SDLC",
                "email": "tao-sdlc@example.com"
            }
            
            commit_payload = {
                "message": f"{commit_message}\n\nEpic: #{epic_id}\nStory: #{story_id}" if epic_id and story_id else commit_message,
                "tree": new_tree_sha,
                "parents": [current_commit],
                "author": author,
                "committer": author
            }
            
            commit_url = f"{self.github_api}/repos/{owner}/{repo}/git/commits"
            commit_response = requests.post(
                commit_url,
                headers=self.headers,
                json=commit_payload,
                timeout=10
            )
            
            if commit_response.status_code != 201:
                return {
                    "success": False,
                    "error": "Failed to create commit",
                    "details": commit_response.text
                }
            
            new_commit_sha = commit_response.json()["sha"]
            
            # Update reference
            ref_url = f"{self.github_api}/repos/{owner}/{repo}/git/refs/heads/{branch}"
            ref_payload = {"sha": new_commit_sha}
            
            ref_response = requests.patch(
                ref_url,
                headers=self.headers,
                json=ref_payload,
                timeout=10
            )
            
            if ref_response.status_code != 200:
                return {
                    "success": False,
                    "error": "Failed to update branch reference",
                    "details": ref_response.text
                }
            
            return {
                "success": True,
                "owner": owner,
                "repo": repo,
                "branch": branch,
                "commit_sha": new_commit_sha[:7],
                "files_pushed": len(files),
                "commit_message": commit_message,
                "pr_url": f"https://github.com/{owner}/{repo}/compare/{branch}?expand=1",
                "commit_url": f"https://github.com/{owner}/{repo}/commit/{new_commit_sha}"
            }
        except Exception as e:
            print(f"[GitHub] Error pushing code: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def pull_code(self, owner: str, repo: str, branch: str = "main",
                  path: str = "") -> Dict[str, Any]:
        """
        Pull code from GitHub repository
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch: Branch to pull from
            path: Optional specific path
        
        Returns:
            Files and structure from repository
        """
        try:
            import requests
            
            print(f"[GitHub] Pulling from {owner}/{repo}/{branch}")
            
            # Get repository info
            repo_info_url = f"{self.github_api}/repos/{owner}/{repo}"
            repo_info = requests.get(repo_info_url, headers=self.headers, timeout=10).json()
            
            # Get folder structure
            folder_structure = self.get_folder_structure(owner, repo, path)
            
            files = {}
            file_details = []
            
            if folder_structure.get("success"):
                for item in folder_structure.get("items", []):
                    if item.get("type") == "file" and item.get("download_url"):
                        try:
                            file_response = requests.get(
                                item.get("download_url"),
                                timeout=10
                            )
                            if file_response.status_code == 200:
                                files[item.get("path")] = file_response.text
                                file_details.append({
                                    "name": item.get("name"),
                                    "path": item.get("path"),
                                    "size": item.get("size"),
                                    "url": item.get("url")
                                })
                        except Exception as e:
                            print(f"[GitHub] Error downloading file {item.get('path')}: {str(e)}")
            
            return {
                "success": True,
                "owner": owner,
                "repo": repo,
                "branch": branch,
                "repository_info": {
                    "name": repo_info.get("name"),
                    "description": repo_info.get("description"),
                    "language": repo_info.get("language"),
                    "last_updated": repo_info.get("pushed_at")
                },
                "files_found": len(files),
                "file_details": file_details,
                "structure": folder_structure.get("items", [])
            }
        except Exception as e:
            print(f"[GitHub] Error pulling code: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def create_pull_request(self, owner: str, repo: str, title: str,
                           body: str, head_branch: str, base_branch: str = "main",
                           epic_id: Optional[int] = None,
                           story_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Create a pull request for generated code
        
        Args:
            owner: Repository owner
            repo: Repository name
            title: PR title
            body: PR description
            head_branch: Branch with changes
            base_branch: Target branch
            epic_id: Epic ID for reference
            story_id: Story ID for reference
        
        Returns:
            PR creation status
        """
        try:
            import requests
            
            pr_body = body
            if epic_id and story_id:
                pr_body += f"\n\n### References\n- Epic: #{epic_id}\n- Story: #{story_id}"
            
            url = f"{self.github_api}/repos/{owner}/{repo}/pulls"
            payload = {
                "title": title,
                "body": pr_body,
                "head": head_branch,
                "base": base_branch,
                "draft": False
            }
            
            response = requests.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 201:
                pr_data = response.json()
                return {
                    "success": True,
                    "pr_number": pr_data.get("number"),
                    "pr_title": pr_data.get("title"),
                    "pr_url": pr_data.get("html_url"),
                    "state": pr_data.get("state"),
                    "message": f"Pull Request #{pr_data.get('number')} created successfully"
                }
            else:
                return {
                    "success": False,
                    "error": response.json().get("message", "Failed to create PR")
                }
        except Exception as e:
            print(f"[GitHub] Error creating PR: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def create_repository(self, repo_name: str, description: str = "", is_private: bool = False, 
                         epic_id: Optional[str] = None, epic_title: Optional[str] = None,
                         story_id: Optional[str] = None, story_title: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new repository with epic/story context
        
        Args:
            repo_name: Name for the new repository
            description: Repository description
            is_private: Whether to create as private repository
            epic_id: Epic ID for context
            epic_title: Epic title for context
            story_id: User story ID for context
            story_title: User story title for context
        
        Returns:
            Created repository info with success status
        """
        try:
            import requests
            
            # Generate description with epic/story context
            full_description = description
            if epic_id or story_id:
                context_parts = []
                if epic_id:
                    context_parts.append(f"Epic #{epic_id}")
                if epic_title:
                    context_parts.append(epic_title)
                if story_id:
                    context_parts.append(f"Story #{story_id}")
                if story_title:
                    context_parts.append(story_title)
                
                context_str = " • ".join(context_parts)
                full_description = f"{description}\n\n[Generated from TAO SDLC: {context_str}]" if description else f"[Generated from TAO SDLC: {context_str}]"
            
            payload = {
                "name": repo_name,
                "description": full_description,
                "private": is_private,
                "auto_init": True,
                "has_issues": True,
                "has_projects": True,
                "has_downloads": True
            }
            
            print(f"[GitHub] Creating repository: {repo_name}")
            
            response = requests.post(
                f"{self.github_api}/user/repos",
                json=payload,
                headers=self.headers
            )
            
            if response.status_code == 201:
                repo_data = response.json()
                print(f"[GitHub] ✅ Repository created: {repo_data['full_name']}")
                return {
                    "success": True,
                    "repository": {
                        "id": repo_data['id'],
                        "name": repo_data['name'],
                        "full_name": repo_data['full_name'],
                        "url": repo_data['html_url'],
                        "clone_url": repo_data['clone_url'],
                        "private": repo_data['private'],
                        "description": repo_data['description'],
                        "default_branch": repo_data['default_branch']
                    },
                    "epic_context": {
                        "epic_id": epic_id,
                        "epic_title": epic_title,
                        "story_id": story_id,
                        "story_title": story_title
                    }
                }
            else:
                error_msg = response.json().get("message", "Failed to create repository")
                print(f"[GitHub] ❌ Error creating repository: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
        except Exception as e:
            print(f"[GitHub] Error creating repository: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def create_branch_with_context(self, owner: str, repo: str, branch_name: str, 
                                   base_branch: str = "main",
                                   epic_id: Optional[str] = None, 
                                   epic_title: Optional[str] = None,
                                   story_id: Optional[str] = None, 
                                   story_title: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new branch with automatic naming based on epic/story context
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch_name: Base branch name (will be enhanced with context)
            base_branch: Branch to base new branch on (default: main)
            epic_id: Epic ID for naming
            epic_title: Epic title for naming
            story_id: Story ID for naming
            story_title: Story title for naming
        
        Returns:
            Created branch info with context
        """
        try:
            import requests
            
            # Build contextual branch name
            full_branch_name = branch_name
            
            if epic_id or story_id:
                # Format: epic-{id}-{title}/story-{id}-{title}/{base_name}
                parts = []
                
                if epic_id:
                    epic_part = f"epic-{epic_id}"
                    if epic_title:
                        clean_title = epic_title.lower().replace(' ', '-').replace('_', '-')[:20]
                        epic_part += f"-{clean_title}"
                    parts.append(epic_part)
                
                if story_id:
                    story_part = f"story-{story_id}"
                    if story_title:
                        clean_title = story_title.lower().replace(' ', '-').replace('_', '-')[:20]
                        story_part += f"-{clean_title}"
                    parts.append(story_part)
                
                # Combine with provided branch name
                if branch_name and branch_name != "main":
                    parts.append(branch_name)
                
                full_branch_name = "/".join(parts) if parts else branch_name
            
            print(f"[GitHub] Creating branch: {full_branch_name} from {base_branch}")
            
            # Get base branch SHA
            base_ref_response = requests.get(
                f"{self.github_api}/repos/{owner}/{repo}/git/refs/heads/{base_branch}",
                headers=self.headers
            )
            
            if base_ref_response.status_code != 200:
                error_msg = base_ref_response.json().get("message", "Base branch not found")
                print(f"[GitHub] ❌ Error getting base branch: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
            
            base_sha = base_ref_response.json()['object']['sha']
            
            # Create new reference
            create_response = requests.post(
                f"{self.github_api}/repos/{owner}/{repo}/git/refs",
                json={
                    "ref": f"refs/heads/{full_branch_name}",
                    "sha": base_sha
                },
                headers=self.headers
            )
            
            if create_response.status_code == 201:
                ref_data = create_response.json()
                print(f"[GitHub] ✅ Branch created: {full_branch_name}")
                return {
                    "success": True,
                    "branch": {
                        "name": full_branch_name,
                        "sha": ref_data['object']['sha'],
                        "url": ref_data['url']
                    },
                    "context": {
                        "epic_id": epic_id,
                        "epic_title": epic_title,
                        "story_id": story_id,
                        "story_title": story_title,
                        "based_on": base_branch
                    }
                }
            else:
                error_msg = create_response.json().get("message", "Failed to create branch")
                print(f"[GitHub] ❌ Error creating branch: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
        except Exception as e:
            print(f"[GitHub] Error creating branch: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def push_code_with_epic_story_context(self, owner: str, repo: str, branch: str,
                                         code_files: List[Dict[str, str]],
                                         epic_id: str, epic_title: str,
                                         story_id: str, story_title: str,
                                         commit_message: str = "") -> Dict[str, Any]:
        """
        Push code files with epic and story context in commit message and branch
        
        Args:
            owner: Repository owner
            repo: Repository name  
            branch: Target branch
            code_files: List of files with 'name' and 'content' keys
            epic_id: Epic ID for context
            epic_title: Epic title
            story_id: Story ID for context
            story_title: Story title
            commit_message: Custom commit message prefix
        
        Returns:
            Push result with commit info and epic/story context
        """
        try:
            import requests
            
            # Build contextual commit message
            base_message = commit_message or f"Add code for story implementation"
            full_message = f"{base_message}\n\nEpic: #{epic_id} - {epic_title}\nStory: #{story_id} - {story_title}\n\nGenerated by TAO SDLC at {datetime.now().isoformat()}"
            
            print(f"[GitHub] Pushing {len(code_files)} files to {owner}/{repo}/{branch}")
            print(f"[GitHub] Epic: #{epic_id} - {epic_title}")
            print(f"[GitHub] Story: #{story_id} - {story_title}")
            
            # Get current branch ref to get latest commit
            branch_response = requests.get(
                f"{self.github_api}/repos/{owner}/{repo}/git/refs/heads/{branch}",
                headers=self.headers
            )
            
            if branch_response.status_code != 200:
                error_msg = branch_response.json().get("message", "Branch not found")
                return {
                    "success": False,
                    "error": error_msg
                }
            
            parent_sha = branch_response.json()['object']['sha']
            
            # Create tree with all files
            tree_items = []
            for code_file in code_files:
                file_content = code_file.get('content', '')
                file_name = code_file.get('name', code_file.get('file', 'file.txt'))
                
                # Create blob for file
                blob_response = requests.post(
                    f"{self.github_api}/repos/{owner}/{repo}/git/blobs",
                    json={
                        "content": file_content,
                        "encoding": "utf-8"
                    },
                    headers=self.headers
                )
                
                if blob_response.status_code == 201:
                    blob_sha = blob_response.json()['sha']
                    tree_items.append({
                        "path": file_name,
                        "mode": "100644",
                        "type": "blob",
                        "sha": blob_sha
                    })
                    print(f"[GitHub]   ✅ File blob created: {file_name}")
                else:
                    print(f"[GitHub]   ❌ Failed to create blob for {file_name}")
            
            if not tree_items:
                return {
                    "success": False,
                    "error": "Failed to create blobs for files"
                }
            
            # Create tree
            tree_response = requests.post(
                f"{self.github_api}/repos/{owner}/{repo}/git/trees",
                json={
                    "base_tree": parent_sha,
                    "tree": tree_items
                },
                headers=self.headers
            )
            
            if tree_response.status_code != 201:
                error_msg = tree_response.json().get("message", "Failed to create tree")
                return {
                    "success": False,
                    "error": error_msg
                }
            
            tree_sha = tree_response.json()['sha']
            print(f"[GitHub] ✅ Tree created: {tree_sha}")
            
            # Create commit
            commit_response = requests.post(
                f"{self.github_api}/repos/{owner}/{repo}/git/commits",
                json={
                    "message": full_message,
                    "tree": tree_sha,
                    "parents": [parent_sha]
                },
                headers=self.headers
            )
            
            if commit_response.status_code != 201:
                error_msg = commit_response.json().get("message", "Failed to create commit")
                return {
                    "success": False,
                    "error": error_msg
                }
            
            commit_sha = commit_response.json()['sha']
            print(f"[GitHub] ✅ Commit created: {commit_sha}")
            
            # Update branch reference
            update_response = requests.patch(
                f"{self.github_api}/repos/{owner}/{repo}/git/refs/heads/{branch}",
                json={"sha": commit_sha},
                headers=self.headers
            )
            
            if update_response.status_code != 200:
                error_msg = update_response.json().get("message", "Failed to update branch")
                return {
                    "success": False,
                    "error": error_msg
                }
            
            print(f"[GitHub] ✅ Branch updated to commit: {commit_sha}")
            
            return {
                "success": True,
                "commit": {
                    "sha": commit_sha,
                    "message": full_message,
                    "files_pushed": len(code_files),
                    "url": f"https://github.com/{owner}/{repo}/commit/{commit_sha}"
                },
                "epic_context": {
                    "epic_id": epic_id,
                    "epic_title": epic_title,
                    "story_id": story_id,
                    "story_title": story_title
                }
            }
        except Exception as e:
            print(f"[GitHub] Error pushing code: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


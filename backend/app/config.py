"""
Configuration Module
Stores default settings like GitHub token and other credentials
"""

import json
import os
from pathlib import Path
from typing import Optional, Dict, Any

class Config:
    """Configuration management for TAO SDLC"""
    
    CONFIG_FILE = Path(__file__).parent / ".config.json"
    
    # GitHub token is now loaded from environment (.env file)
    # See: GITHUB_TOKEN in .env
    
    @classmethod
    def load_config(cls) -> Dict[str, Any]:
        """Load configuration from file"""
        if cls.CONFIG_FILE.exists():
            try:
                with open(cls.CONFIG_FILE, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Config] Error loading config: {e}")
                return cls.get_default_config()
        return cls.get_default_config()
    
    @classmethod
    def get_default_config(cls) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "github_token": cls.get_github_token(),
            "github_username": "raghavendra.thummala",
            "github_org_name": None,
            "default_repo_url": "",
            "default_branch": "main",
            "auto_connect_github": True,
            "created_at": str(datetime.now())
        }
    
    @classmethod
    def save_config(cls, config: Dict[str, Any]) -> bool:
        """Save configuration to file"""
        try:
            with open(cls.CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=2)
            return True
        except Exception as e:
            print(f"[Config] Error saving config: {e}")
            return False
    
    @classmethod
    def get_github_token(cls) -> str:
        """Get GitHub token from environment (.env file)"""
        # Check environment variable first (from .env)
        env_token = os.getenv('GITHUB_TOKEN')
        if env_token:
            return env_token
        
        # Fallback: Load from config file
        config = cls.load_config()
        token = config.get("github_token")
        if token:
            return token
        
        raise ValueError("GITHUB_TOKEN not found in environment or config. Please set GITHUB_TOKEN in .env file")
    
    @classmethod
    def set_github_token(cls, token: str) -> bool:
        """Set and save GitHub token"""
        config = cls.load_config()
        config["github_token"] = token
        return cls.save_config(config)
    
    @classmethod
    def get_github_config(cls) -> Dict[str, Any]:
        """Get all GitHub configuration"""
        config = cls.load_config()
        return {
            "token": config.get("github_token"),
            "username": config.get("github_username"),
            "org_name": config.get("github_org_name"),
            "repo_url": config.get("default_repo_url"),
            "branch": config.get("default_branch"),
            "auto_connect": config.get("auto_connect_github", True)
        }

from datetime import datetime

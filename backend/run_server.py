"""
Simple script to run the backend server with correct environment variables
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

print("=" * 60)
print("TAO SDLC - Backend Server")
print("=" * 60)
print(f"Database: sdlc")
print(f"Username: admin_user")
print(f"Current directory: {os.getcwd()}")
print(f"DATABASE_URL loaded: {bool(os.getenv('DATABASE_URL'))}")
print("=" * 60)
print()

# Run uvicorn
import uvicorn

if __name__ == "__main__":
    # Disable reload if RUN_WITHOUT_RELOAD environment variable is set
    use_reload = os.getenv("RUN_WITHOUT_RELOAD", "false").lower() != "true"
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=use_reload,
        reload_dirs=["app"] if use_reload else None
    )

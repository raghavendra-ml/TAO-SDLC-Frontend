from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration - Works with both SQLite and PostgreSQL
# Change DATABASE_URL in .env to switch databases without changing this code:
#
# SQLite (Local Development):
#   DATABASE_URL=sqlite:///./sdlc.db
#
# PostgreSQL (Production/Servers):
#   DATABASE_URL=postgresql://user:password@localhost:5432/sdlc
#   DATABASE_URL=postgresql://user:password@cloud-db:5432/sdlc
#
# See .env.example for more database URL examples
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sdlc.db")

# Create database engine - automatically detects SQLite vs PostgreSQL
engine = create_engine(
    DATABASE_URL,
    # SQLite needs special connection args, PostgreSQL doesn't
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


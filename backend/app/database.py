import os
from dotenv import load_dotenv
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from .config import get_database_url, is_production

load_dotenv()

database_url = get_database_url()

# Configure connection pooling based on environment
if is_production():
    # Production settings: More restrictive pooling
    engine = create_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=10,              # Number of connections to maintain
        max_overflow=20,           # Maximum number of connections that can be created beyond pool_size
        pool_timeout=30,           # Timeout for getting a connection from pool
        pool_recycle=3600,         # Recycle connections after 1 hour
        pool_pre_ping=True,        # Test connections before using them
        echo=False                 # Don't log SQL queries in production
    )
else:
    # Development settings: More relaxed pooling
    engine = create_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=5,               # Smaller pool for development
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=3600,
        pool_pre_ping=True,
        echo=False                 # Set to True if you want to see SQL queries
    )

Base = declarative_base()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def get_db_connection():
    return psycopg2.connect(database_url)

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")
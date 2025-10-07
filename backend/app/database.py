import os
from dotenv import load_dotenv
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine)
def get_db_connection():
    return psycopg2.connect(database_url)


if __name__ == "__main__":
    
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")
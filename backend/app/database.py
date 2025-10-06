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
    try:
        conn = get_db_connection()
        print("Database connection successful!")
        conn.close()
    except Exception as e:
        print(f"Database connection failed: {e}")
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

database_url = os.getenv("DATABASE_URL")

def get_db_connection():
    return psycopg2.connect(database_url)


if __name__ == "__main__":
    try:
        conn = get_db_connection()
        print("Database connection successful!")
        conn.close()
    except Exception as e:
        print(f"Database connection failed: {e}")
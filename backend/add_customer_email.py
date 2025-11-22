from app.database import engine
import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

def add_customer_email_column():
    """Add customer_email column to orders table"""
    database_url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='customer_email'
        """)
        
        if cursor.fetchone():
            print("✓ customer_email column already exists")
        else:
            # Add the column with a default empty string for existing rows
            cursor.execute("""
                ALTER TABLE orders 
                ADD COLUMN customer_email VARCHAR(255) DEFAULT ''
            """)
            
            # After adding, make it NOT NULL
            cursor.execute("""
                ALTER TABLE orders 
                ALTER COLUMN customer_email SET NOT NULL
            """)
            
            conn.commit()
            print("✓ customer_email column added successfully")
            
    except Exception as e:
        conn.rollback()
        print(f"✗ Error adding customer_email column: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    add_customer_email_column()

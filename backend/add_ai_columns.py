"""
Migration script to add AI insights rate limiting columns to the users table.
Run this script to add the necessary columns for AI insights feature.

Usage:
    python add_ai_columns.py
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text

def get_database_url():
    """Get database URL from environment variables."""
    return os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/salesorders"
    )

def add_ai_columns():
    """Add AI insights rate limiting columns to users table."""
    database_url = get_database_url()
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('ai_insights_count', 'ai_insights_reset_date')
        """))
        existing_columns = [row[0] for row in result]
        
        # Add ai_insights_count column if it doesn't exist
        if 'ai_insights_count' not in existing_columns:
            print("Adding ai_insights_count column...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN ai_insights_count INTEGER NOT NULL DEFAULT 0
            """))
            print("✓ Added ai_insights_count column")
        else:
            print("✓ ai_insights_count column already exists")
        
        # Add ai_insights_reset_date column if it doesn't exist
        if 'ai_insights_reset_date' not in existing_columns:
            print("Adding ai_insights_reset_date column...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN ai_insights_reset_date DATE NULL
            """))
            print("✓ Added ai_insights_reset_date column")
        else:
            print("✓ ai_insights_reset_date column already exists")
        
        conn.commit()
        print("\n✅ Migration complete!")

if __name__ == "__main__":
    print("=" * 50)
    print("AI Insights Columns Migration")
    print("=" * 50)
    add_ai_columns()


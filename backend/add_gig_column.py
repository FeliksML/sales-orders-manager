"""
Migration script to add has_gig column to orders table.
Run with: python add_gig_column.py
"""

from app.database import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        # Add has_gig column
        db.execute(text("""
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS has_gig BOOLEAN NOT NULL DEFAULT FALSE;
        """))
        
        db.commit()
        print("✅ has_gig column added to orders table!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()


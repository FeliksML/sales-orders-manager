"""
Migration script to add tax columns to commission_settings table.
Run with: python add_tax_columns.py
"""

from app.database import SessionLocal
from sqlalchemy import text


def migrate():
    db = SessionLocal()
    try:
        # Add federal_bracket column
        db.execute(text("""
            ALTER TABLE commission_settings 
            ADD COLUMN IF NOT EXISTS federal_bracket DECIMAL(5,4) NOT NULL DEFAULT 0.22;
        """))
        
        # Add state_code column
        db.execute(text("""
            ALTER TABLE commission_settings 
            ADD COLUMN IF NOT EXISTS state_code VARCHAR(2) NOT NULL DEFAULT 'CA';
        """))
        
        # Add state_tax_rate column
        db.execute(text("""
            ALTER TABLE commission_settings 
            ADD COLUMN IF NOT EXISTS state_tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.093;
        """))
        
        db.commit()
        print("✅ Tax columns added to commission_settings table!")
        print("   - federal_bracket (default: 22%)")
        print("   - state_code (default: CA)")
        print("   - state_tax_rate (default: 9.3%)")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()


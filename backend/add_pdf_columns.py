"""
Migration script to add PDF extraction columns to orders table
Run this script to add: internet_tier, monthly_total, initial_payment
"""
from app.database import SessionLocal, engine
from sqlalchemy import text

def migrate():
    """Add new columns for PDF extraction data"""
    db = SessionLocal()
    
    try:
        # Check if columns already exist and add them if they don't
        columns_to_add = [
            ("internet_tier", "VARCHAR(100)"),
            ("monthly_total", "FLOAT"),
            ("initial_payment", "FLOAT"),
        ]
        
        for column_name, column_type in columns_to_add:
            try:
                # Try to add the column
                db.execute(text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}"))
                print(f"✅ Added column: {column_name}")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"⏭️  Column {column_name} already exists, skipping")
                else:
                    print(f"⚠️  Error adding {column_name}: {e}")
        
        db.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()


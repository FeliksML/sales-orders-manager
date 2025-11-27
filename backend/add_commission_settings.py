"""
Migration script to create commission_settings table
Run this script to add the commission settings table for tracking AE type, new hire status, and overrides.
"""
from app.database import SessionLocal, engine
from sqlalchemy import text

def migrate():
    """Create commission_settings table if it doesn't exist"""
    db = SessionLocal()
    
    try:
        # Create the commission_settings table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS commission_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
            ae_type VARCHAR(50) NOT NULL DEFAULT 'Account Executive',
            is_new_hire BOOLEAN NOT NULL DEFAULT FALSE,
            new_hire_month INTEGER,
            rate_overrides JSON,
            value_overrides JSON,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        db.execute(text(create_table_sql))
        print("✅ Created commission_settings table")
        
        # Create index on user_id for faster lookups
        try:
            db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_commission_settings_user_id 
                ON commission_settings(user_id);
            """))
            print("✅ Created index on user_id")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("⏭️  Index already exists, skipping")
            else:
                print(f"⚠️  Error creating index: {e}")
        
        db.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        if "already exists" in str(e).lower():
            print("⏭️  Table already exists, skipping")
        else:
            print(f"❌ Migration failed: {e}")
        db.rollback()
    finally:
        db.close()


def verify():
    """Verify the table was created correctly"""
    db = SessionLocal()
    
    try:
        result = db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'commission_settings'
            ORDER BY ordinal_position;
        """))
        
        columns = result.fetchall()
        
        if columns:
            print("\n📋 commission_settings table structure:")
            print("-" * 40)
            for col_name, col_type in columns:
                print(f"  {col_name}: {col_type}")
            print("-" * 40)
        else:
            print("⚠️  Table not found or has no columns")
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
    verify()


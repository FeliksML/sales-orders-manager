"""
Migration script to create sales_goals table
Run this script to add the sales goals table for tracking monthly targets.
"""
from app.database import SessionLocal, engine
from sqlalchemy import text


def migrate():
    """Create sales_goals table if it doesn't exist"""
    db = SessionLocal()
    
    try:
        # Create the sales_goals table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS sales_goals (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            target_orders INTEGER,
            target_revenue FLOAT,
            target_internet INTEGER,
            target_mobile INTEGER,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_user_year_month UNIQUE (user_id, year, month)
        );
        """
        
        db.execute(text(create_table_sql))
        print("✅ Created sales_goals table")
        
        # Create index on user_id for faster lookups
        try:
            db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_sales_goals_user_id 
                ON sales_goals(user_id);
            """))
            print("✅ Created index on user_id")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("⏭️  Index already exists, skipping")
            else:
                print(f"⚠️  Error creating index: {e}")
        
        # Create index on year/month for period lookups
        try:
            db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_sales_goals_period 
                ON sales_goals(year, month);
            """))
            print("✅ Created index on year/month")
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
            WHERE table_name = 'sales_goals'
            ORDER BY ordinal_position;
        """))
        
        columns = result.fetchall()
        
        if columns:
            print("\n📋 sales_goals table structure:")
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


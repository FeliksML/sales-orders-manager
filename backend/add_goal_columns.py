"""
Migration script to add new goal target columns to sales_goals table.
Adds: target_tv, target_voice, target_sbc, target_wib
Run this script after deploying the expanded goals update.
"""
from app.database import SessionLocal
from sqlalchemy import text


def migrate():
    """Add new target columns to sales_goals table"""
    db = SessionLocal()
    
    new_columns = [
        ('target_tv', 'INTEGER'),
        ('target_voice', 'INTEGER'),
        ('target_sbc', 'INTEGER'),
        ('target_wib', 'INTEGER')
    ]
    
    try:
        for col_name, col_type in new_columns:
            # Check if column already exists
            result = db.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sales_goals' AND column_name = '{col_name}';
            """))
            
            if result.fetchone():
                print(f"⏭️  Column '{col_name}' already exists, skipping")
            else:
                db.execute(text(f"""
                    ALTER TABLE sales_goals 
                    ADD COLUMN {col_name} {col_type};
                """))
                print(f"✅ Added column '{col_name}'")
        
        db.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
    finally:
        db.close()


def verify():
    """Verify the columns were added correctly"""
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
            
            # Check for new columns
            col_names = [c[0] for c in columns]
            new_cols = ['target_tv', 'target_voice', 'target_sbc', 'target_wib']
            missing = [c for c in new_cols if c not in col_names]
            
            if missing:
                print(f"\n⚠️  Missing columns: {', '.join(missing)}")
            else:
                print("\n✅ All new columns present")
        else:
            print("⚠️  Table not found or has no columns")
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
    verify()


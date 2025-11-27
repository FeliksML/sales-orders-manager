"""
Migration script to rename target_orders to target_psu in sales_goals table.
PSU = Primary Service Unit (Internet + Voice + Mobile + TV + SBC)
Run this script after deploying the PSU-based goals update.
"""
from app.database import SessionLocal
from sqlalchemy import text


def migrate():
    """Rename target_orders column to target_psu"""
    db = SessionLocal()
    
    try:
        # Check if column needs to be renamed
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sales_goals' AND column_name = 'target_orders';
        """))
        
        if result.fetchone():
            # Column exists with old name, rename it
            db.execute(text("""
                ALTER TABLE sales_goals 
                RENAME COLUMN target_orders TO target_psu;
            """))
            print("✅ Renamed column 'target_orders' to 'target_psu'")
            db.commit()
        else:
            # Check if new column already exists
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sales_goals' AND column_name = 'target_psu';
            """))
            
            if result.fetchone():
                print("⏭️  Column 'target_psu' already exists, skipping rename")
            else:
                print("⚠️  Neither 'target_orders' nor 'target_psu' found!")
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
    finally:
        db.close()


def verify():
    """Verify the column was renamed correctly"""
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
                # Highlight the PSU column
                if col_name == 'target_psu':
                    print(f"  {col_name}: {col_type} ← PSU (Primary Service Unit)")
                else:
                    print(f"  {col_name}: {col_type}")
            print("-" * 40)
            
            # Verify target_psu exists
            col_names = [c[0] for c in columns]
            if 'target_psu' in col_names and 'target_orders' not in col_names:
                print("\n✅ Column successfully renamed to 'target_psu'")
            elif 'target_orders' in col_names:
                print("\n⚠️  Column still named 'target_orders' - run migrate() first")
        else:
            print("⚠️  Table not found or has no columns")
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
    verify()


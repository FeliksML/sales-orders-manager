"""
Migration script to create the followups table for follow-up reminders.
Run this script after deploying the follow-up reminders feature.
"""
from app.database import SessionLocal
from sqlalchemy import text


def migrate():
    """Create followups table"""
    db = SessionLocal()
    
    try:
        # Check if table already exists
        result = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'followups';
        """))
        
        if result.fetchone():
            print("⏭️  Table 'followups' already exists, skipping creation")
        else:
            db.execute(text("""
                CREATE TABLE followups (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders(orderid) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
                    due_date TIMESTAMP NOT NULL,
                    note TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    completed_at TIMESTAMP,
                    snoozed_until TIMESTAMP,
                    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
            """))
            print("✅ Created 'followups' table")
            
            # Create indexes for common queries
            db.execute(text("""
                CREATE INDEX idx_followups_user_id ON followups(user_id);
            """))
            print("✅ Created index on user_id")
            
            db.execute(text("""
                CREATE INDEX idx_followups_order_id ON followups(order_id);
            """))
            print("✅ Created index on order_id")
            
            db.execute(text("""
                CREATE INDEX idx_followups_due_date ON followups(due_date);
            """))
            print("✅ Created index on due_date")
            
            db.execute(text("""
                CREATE INDEX idx_followups_status ON followups(status);
            """))
            print("✅ Created index on status")
        
        db.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
    finally:
        db.close()


def verify():
    """Verify the table was created correctly"""
    db = SessionLocal()
    
    try:
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'followups'
            ORDER BY ordinal_position;
        """))
        
        columns = result.fetchall()
        
        if columns:
            print("\n📋 followups table structure:")
            print("-" * 50)
            for col_name, col_type, nullable in columns:
                null_str = "NULL" if nullable == "YES" else "NOT NULL"
                print(f"  {col_name}: {col_type} {null_str}")
            print("-" * 50)
            
            # Check for expected columns
            col_names = [c[0] for c in columns]
            expected_cols = ['id', 'order_id', 'user_id', 'due_date', 'note', 
                           'status', 'completed_at', 'snoozed_until', 
                           'notification_sent', 'created_at', 'updated_at']
            missing = [c for c in expected_cols if c not in col_names]
            
            if missing:
                print(f"\n⚠️  Missing columns: {', '.join(missing)}")
            else:
                print("\n✅ All expected columns present")
        else:
            print("⚠️  Table not found or has no columns")
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
    verify()


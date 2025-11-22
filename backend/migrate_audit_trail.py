"""
Migration script to add audit trail functionality
Adds:
1. audit_logs table for tracking all changes
2. created_at, updated_at, created_by columns to orders table
"""

import os
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql

load_dotenv()

def migrate():
    database_url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()

    try:
        print("Starting audit trail migration...")

        # Check if audit_logs table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'audit_logs'
            );
        """)
        audit_logs_exists = cursor.fetchone()[0]

        if not audit_logs_exists:
            print("Creating audit_logs table...")
            cursor.execute("""
                CREATE TABLE audit_logs (
                    auditid SERIAL PRIMARY KEY,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL REFERENCES users(userid),
                    user_name VARCHAR(255) NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    field_name VARCHAR(255),
                    old_value TEXT,
                    new_value TEXT,
                    snapshot JSONB,
                    change_reason TEXT,
                    ip_address VARCHAR(45),
                    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """)
            print("✓ audit_logs table created")

            # Create indexes for better query performance
            print("Creating indexes on audit_logs...")
            cursor.execute("""
                CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
            """)
            cursor.execute("""
                CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
            """)
            cursor.execute("""
                CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
            """)
            print("✓ Indexes created")
        else:
            print("⊙ audit_logs table already exists")

        # Add columns to orders table
        print("Adding audit columns to orders table...")

        # Check if created_at exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' AND column_name='created_at';
        """)
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE orders
                ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
            """)
            print("✓ created_at column added")
        else:
            print("⊙ created_at column already exists")

        # Check if updated_at exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' AND column_name='updated_at';
        """)
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE orders
                ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
            """)
            print("✓ updated_at column added")
        else:
            print("⊙ updated_at column already exists")

        # Check if created_by exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' AND column_name='created_by';
        """)
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE orders
                ADD COLUMN created_by INTEGER REFERENCES users(userid);
            """)
            # Set created_by to userid for existing orders
            cursor.execute("""
                UPDATE orders
                SET created_by = userid
                WHERE created_by IS NULL;
            """)
            print("✓ created_by column added and populated")
        else:
            print("⊙ created_by column already exists")

        # Create trigger to automatically update updated_at
        print("Creating trigger for updated_at...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """)

        # Drop trigger if exists and recreate
        cursor.execute("""
            DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
        """)
        cursor.execute("""
            CREATE TRIGGER update_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """)
        print("✓ Trigger created for automatic updated_at")

        conn.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()

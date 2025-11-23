"""
Migration script to add is_admin field to users table and create error_logs table
Run this script to update your database schema
"""

from sqlalchemy import text
from app.database import engine

def run_migration():
    with engine.connect() as connection:
        # Start transaction
        trans = connection.begin()

        try:
            # Add is_admin column to users table
            print("Adding is_admin column to users table...")
            connection.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL
            """))
            print("✓ is_admin column added")

            # Create error_logs table
            print("\nCreating error_logs table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS error_logs (
                    errorid SERIAL PRIMARY KEY,
                    error_type VARCHAR(100) NOT NULL,
                    error_message TEXT NOT NULL,
                    stack_trace TEXT,
                    endpoint VARCHAR(255),
                    method VARCHAR(10),
                    status_code INTEGER,
                    user_id INTEGER REFERENCES users(userid),
                    user_email VARCHAR(255),
                    ip_address VARCHAR(45),
                    request_data JSON,
                    user_agent VARCHAR(500),
                    is_resolved BOOLEAN DEFAULT FALSE NOT NULL,
                    resolved_at TIMESTAMP,
                    resolved_by INTEGER REFERENCES users(userid),
                    resolution_notes TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
            """))
            print("✓ error_logs table created")

            # Create index on timestamp for performance
            print("\nCreating index on error_logs.timestamp...")
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp
                ON error_logs(timestamp)
            """))
            print("✓ Index created")

            # Commit transaction
            trans.commit()
            print("\n✅ Migration completed successfully!")
            print("\nNote: All existing users have is_admin=False by default.")
            print("To make a user an admin, run:")
            print("  UPDATE users SET is_admin=TRUE WHERE email='your-email@example.com';")

        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"\n❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    run_migration()

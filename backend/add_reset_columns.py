"""
Migration script to add password reset columns to users table
"""
from app.database import get_db_connection
import sys

def add_reset_columns():
    """Add reset_token and reset_token_expiry columns to users table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if columns already exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='users' AND column_name IN ('reset_token', 'reset_token_expiry')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]

        if 'reset_token' in existing_columns and 'reset_token_expiry' in existing_columns:
            print("✓ Columns already exist. No migration needed.")
            cursor.close()
            conn.close()
            return

        # Add reset_token column if it doesn't exist
        if 'reset_token' not in existing_columns:
            print("Adding reset_token column...")
            cursor.execute("""
                ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)
            """)
            print("✓ Added reset_token column")

        # Add reset_token_expiry column if it doesn't exist
        if 'reset_token_expiry' not in existing_columns:
            print("Adding reset_token_expiry column...")
            cursor.execute("""
                ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP
            """)
            print("✓ Added reset_token_expiry column")

        conn.commit()
        cursor.close()
        conn.close()

        print("\n✅ Migration completed successfully!")
        print("The forgot password feature is now ready to use.")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    add_reset_columns()

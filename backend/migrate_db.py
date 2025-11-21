"""
Quick migration script to add email verification columns to users table
"""
from app.database import SessionLocal, engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # Add email_verified column
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
            """))
            print("✓ Added email_verified column")

            # Add verification_token column
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)
            """))
            print("✓ Added verification_token column")

            # Add verification_token_expiry column
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMP
            """))
            print("✓ Added verification_token_expiry column")

            conn.commit()
            print("\n✅ Database migration completed successfully!")

        except Exception as e:
            print(f"❌ Error during migration: {e}")
            conn.rollback()

if __name__ == "__main__":
    migrate()

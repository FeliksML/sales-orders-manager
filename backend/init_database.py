"""
Initialize the production database with tables and admin user

This script will:
1. Create all database tables (users, orders, notifications, audit_logs, error_logs)
2. Create an admin user account

Run this script locally with the production DATABASE_URL environment variable set.
"""
import os
import sys

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.models import User, Order, Notification, AuditLog, ErrorLog
import bcrypt
import secrets
import string

def generate_strong_password(length=16):
    """Generate a strong random password"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice(string.punctuation),
    ]
    password += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)

def init_database():
    """Initialize the database with tables and admin user"""

    print("=" * 80)
    print("🚀 INITIALIZING DATABASE")
    print("=" * 80)

    # Step 1: Create all tables
    print("\n📋 Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
        print("   - users")
        print("   - orders")
        print("   - notifications")
        print("   - audit_logs")
        print("   - error_logs")
    except Exception as e:
        print(f"❌ Failed to create tables: {str(e)}")
        return False

    # Step 2: Create admin user
    print("\n👤 Creating admin user...")
    db = SessionLocal()

    try:
        # Admin account details
        admin_email = "wursts.baryon0d@icloud.com"
        admin_name = "Admin User"
        admin_salesid = 99999

        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if existing_admin:
            print(f"ℹ️  Admin user already exists: {admin_email}")
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
                db.commit()
                print("✅ Updated existing user to admin status")
            return True

        # Generate strong password
        admin_password = generate_strong_password()

        # Hash the password
        password_bytes = admin_password.encode('utf-8')
        hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

        # Create admin user
        admin_user = User(
            email=admin_email,
            password=hashed_password,
            salesid=admin_salesid,
            name=admin_name,
            email_verified=True,
            is_admin=True,
            verification_token=None,
            verification_token_expiry=None
        )

        db.add(admin_user)
        db.commit()

        print("\n" + "=" * 80)
        print("✅ ADMIN ACCOUNT CREATED")
        print("=" * 80)
        print(f"Email:     {admin_email}")
        print(f"Password:  {admin_password}")
        print(f"Sales ID:  {admin_salesid}")
        print(f"Name:      {admin_name}")
        print("=" * 80)
        print("⚠️  IMPORTANT: Save this password! It cannot be recovered.")
        print("=" * 80)

        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create admin user: {str(e)}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("\n🔍 Checking DATABASE_URL...")
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        print("❌ DATABASE_URL environment variable not set!")
        print("\nSet it with:")
        print('export DATABASE_URL="postgresql://..."')
        sys.exit(1)

    # Mask the password in the URL for display
    masked_url = database_url.split("@")[1] if "@" in database_url else "..."
    print(f"✅ Connected to: ...@{masked_url}")

    print("\n⚠️  Starting database initialization...")

    success = init_database()

    if success:
        print("\n✅ Database initialization completed successfully!")
        print("   You can now use the application.")
    else:
        print("\n❌ Database initialization failed!")
        print("   Check the error messages above.")
        sys.exit(1)

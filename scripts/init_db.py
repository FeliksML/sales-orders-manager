#!/usr/bin/env python3
"""
Database Initialization Script
Creates all tables and an admin user with a random password
"""

import os
import sys
import secrets
import string
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.database import engine, SessionLocal
from app.models import Base, User
from app.auth import get_password_hash


def generate_password(length=16):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def init_database():
    """Initialize the database with tables and admin user"""
    print("=" * 60)
    print("Database Initialization")
    print("=" * 60)
    print()

    # Create all tables
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ All tables created successfully")
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        sys.exit(1)

    # Create admin user
    print()
    print("Creating admin user...")

    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_email = "wursts.baryon0d@icloud.com"
        existing_admin = db.query(User).filter(User.email == admin_email).first()

        if existing_admin:
            print(f"✓ Admin user already exists: {admin_email}")
            print("  Skipping admin user creation")
        else:
            # Generate random password
            admin_password = generate_password(16)

            # Create admin user
            admin_user = User(
                email=admin_email,
                password=get_password_hash(admin_password),
                salesid="99999",
                name="System Administrator",
                email_verified=True,
                is_admin=True
            )

            db.add(admin_user)
            db.commit()

            print("✓ Admin user created successfully")
            print()
            print("-" * 60)
            print("ADMIN CREDENTIALS - SAVE THESE!")
            print("-" * 60)
            print(f"Email:    {admin_email}")
            print(f"Password: {admin_password}")
            print("-" * 60)
            print()
            print("IMPORTANT: Change this password after first login!")
            print()
    except Exception as e:
        print(f"✗ Error creating admin user: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

    print()
    print("=" * 60)
    print("Database initialization complete!")
    print("=" * 60)


if __name__ == "__main__":
    init_database()

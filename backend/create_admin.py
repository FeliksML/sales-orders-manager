"""
Script to create an admin user account
"""
import bcrypt
import secrets
import string
from app.database import SessionLocal
from app.models import User

def generate_strong_password(length=16):
    """Generate a strong random password"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    # Ensure password has at least one of each type
    password = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice(string.punctuation),
    ]
    # Fill the rest with random characters
    password += [secrets.choice(alphabet) for _ in range(length - 4)]
    # Shuffle the password
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)

def create_admin_user(email, name, salesid):
    """Create an admin user with a random password"""
    db = SessionLocal()

    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ User with email {email} already exists!")
            print(f"   To make them admin, run:")
            print(f"   UPDATE users SET is_admin=TRUE WHERE email='{email}';")
            return None

        # Check if sales ID is taken
        existing_salesid = db.query(User).filter(User.salesid == salesid).first()
        if existing_salesid:
            print(f"❌ Sales ID {salesid} is already taken!")
            return None

        # Generate strong password
        password = generate_strong_password()

        # Hash the password
        password_bytes = password.encode('utf-8')
        hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

        # Create the user
        new_user = User(
            email=email,
            password=hashed_password,
            salesid=salesid,
            name=name,
            email_verified=True,  # Auto-verify admin accounts
            is_admin=True,  # Make them admin
            verification_token=None,
            verification_token_expiry=None
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        print("=" * 80)
        print("✅ Admin account created successfully!")
        print("=" * 80)
        print(f"Email:     {email}")
        print(f"Password:  {password}")
        print(f"Sales ID:  {salesid}")
        print(f"Name:      {name}")
        print(f"Admin:     Yes ✓")
        print(f"Verified:  Yes ✓")
        print("=" * 80)
        print("⚠️  IMPORTANT: Save this password! It cannot be recovered.")
        print("=" * 80)

        return password

    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create admin user: {str(e)}")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    # Admin account details
    email = "wursts.baryon0d@icloud.com"
    name = "Admin User"
    salesid = 99999  # Using a high number for admin

    create_admin_user(email, name, salesid)

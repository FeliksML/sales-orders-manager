from fastapi import APIRouter, Path, HTTPException
from fastapi.responses import JSONResponse
from .schemas import UserSignup, UserLogin
from .models import User
from .database import SessionLocal
from .email_config import send_verification_email
import bcrypt
import secrets
from datetime import datetime, timedelta
import os
import httpx

router = APIRouter()

async def verify_recaptcha(token: str) -> bool:
    """Verify reCAPTCHA token with Google"""
    if not token:
        print("❌ No reCAPTCHA token provided")
        return False

    secret_key = os.getenv("RECAPTCHA_SECRET_KEY")
    print(f"🔑 Using secret key: {secret_key[:15]}..." if secret_key else "❌ No secret key found in environment")

    # If no secret key is configured, check if it's a test key
    if not secret_key:
        # Google's test key for development
        if token == "test-token" or os.getenv("ENVIRONMENT") == "development":
            print("⚠️  WARNING: Using development mode - CAPTCHA verification bypassed")
            return True
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": secret_key,
                    "response": token
                }
            )
            result = response.json()

            if result.get("success"):
                print(f"✓ reCAPTCHA verification successful")
                return True
            else:
                print(f"✗ reCAPTCHA verification failed: {result.get('error-codes', [])}")
                return False
    except Exception as e:
        print(f"✗ reCAPTCHA verification error: {str(e)}")
        return False

@router.get("/check-salesid/{salesid}")
def check_salesid(salesid: str = Path(..., min_length=5, max_length=5, pattern=r"^\d{5}$")):
    """Check if a Sales ID already exists in the database"""
    with SessionLocal() as db:
        existing_user = db.query(User).filter(User.salesid == salesid).first()
        return {"exists": existing_user is not None}

@router.get("/check-email/{email}")
def check_email(email: str):
    """Check if an email already exists in the database"""
    with SessionLocal() as db:
        existing_user = db.query(User).filter(User.email == email).first()
        return {"exists": existing_user is not None}

@router.post("/signup")
async def signup(user_data: UserSignup):
    # Verify reCAPTCHA
    if not await verify_recaptcha(user_data.recaptcha_token):
        return JSONResponse(
            status_code=400,
            content={"error": "CAPTCHA verification failed. Please try again."}
        )

    # Check for duplicate email and sales ID
    with SessionLocal() as db:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            return {"error": "This email is already registered. Please use a different email or login."}

        existing_salesid = db.query(User).filter(User.salesid == user_data.salesid).first()
        if existing_salesid:
            return {"error": "This Sales ID is already registered. Please contact your administrator."}

        # Generate verification token
        verification_token = secrets.token_urlsafe(32)
        token_expiry = datetime.utcnow() + timedelta(hours=24)  # Token valid for 24 hours

        # Hash password and create new user
        password_bytes = user_data.password.encode('utf-8')
        hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

        new_user = User(
            email = user_data.email,
            password = hashed_password,
            salesid = user_data.salesid,
            name = user_data.name,
            email_verified = False,
            verification_token = verification_token,
            verification_token_expiry = token_expiry
        )

        db.add(new_user)
        db.commit()

        # Construct verification link
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"

        # Send verification email
        try:
            await send_verification_email(
                email=user_data.email,
                name=user_data.name,
                verification_link=verification_link
            )
            email_sent = True
            print(f"✓ Verification email sent to {user_data.email}")
        except Exception as e:
            # Log the error but don't fail the signup
            print(f"✗ Failed to send verification email: {str(e)}")
            print(f"Verification link: {verification_link}")
            email_sent = False

    return {
        "message": "successful signup",
        "verification_required": True,
        "email_sent": email_sent,
        "note": "Please check your email to verify your account. If you don't receive an email within a few minutes, please check your spam folder."
    }

@router.get("/verify-email/{token}")
def verify_email(token: str):
    """Verify user email with the provided token"""
    print(f"📧 Verification attempt for token: {token[:10]}...")

    with SessionLocal() as db:
        user = db.query(User).filter(User.verification_token == token).first()

        if not user:
            print(f"❌ Verification failed: Invalid token")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid verification token"}
            )

        # Check if token has expired
        if user.verification_token_expiry < datetime.utcnow():
            print(f"❌ Verification failed: Token expired for {user.email}")
            return JSONResponse(
                status_code=400,
                content={"error": "Verification link has expired. Please request a new one."}
            )

        # Mark email as verified
        user.email_verified = True
        user.verification_token = None  # Clear the token
        user.verification_token_expiry = None
        db.commit()

        print(f"✅ Email verified successfully for {user.email}")
        return JSONResponse(
            status_code=200,
            content={"success": True, "message": "Email verified successfully! You can now log in."}
        )

@router.post("/login")
async def login(user_data: UserLogin):
    # Verify reCAPTCHA
    if not await verify_recaptcha(user_data.recaptcha_token):
        return JSONResponse(
            status_code=400,
            content={"error": "CAPTCHA verification failed. Please try again."}
        )

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == user_data.email).first()

    if user == None:
        return {"message":"Incorrect Login or Password"}
    else:
        # Check if email is verified
        if not user.email_verified:
            return {"error": "Please verify your email address before logging in. Check your email for the verification link."}

        password_bytes = user_data.password.encode('utf-8')
        if bcrypt.checkpw(password_bytes, user.password):
            return {
                "message": "Welcome!",
                "email": user.email,
                "name": user.name,
                "salesid": str(user.salesid)
            }
        else:
            return {"message":"Incorrect Login or Password"}
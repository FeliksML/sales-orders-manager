from fastapi import APIRouter, Path, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .schemas import UserSignup, UserLogin, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from .models import User
from .database import SessionLocal, get_db
from .email_config import send_verification_email, send_password_reset_email
from .config import get_secret_key
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
import bcrypt
import secrets
from datetime import datetime, timedelta
import os
import httpx

# JWT Configuration
SECRET_KEY = get_secret_key()  # No fallback - will fail if not set
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days (TODO: reduce to 60 and implement refresh tokens)

security = HTTPBearer()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

def create_access_token(data: dict):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    print(f"🔐 Validating token: {token[:20]}..." if token else "❌ No token received")

    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        print(f"✅ Token decoded successfully, user_id: {user_id_str}")
        if user_id_str is None:
            print("❌ No user_id in token payload")
            raise credentials_exception
        user_id = int(user_id_str)  # Convert string back to int
    except JWTError as e:
        print(f"❌ JWT decode error: {str(e)}")
        raise credentials_exception
    except ValueError:
        print("❌ Invalid user_id format in token")
        raise credentials_exception

    user = db.query(User).filter(User.userid == user_id).first()
    if user is None:
        print(f"❌ User {user_id} not found in database")
        raise credentials_exception

    print(f"✅ User authenticated: {user.email}")
    return user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin privileges"""
    if not current_user.is_admin:
        print(f"❌ Access denied: {current_user.email} is not an admin")
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    print(f"✅ Admin access granted: {current_user.email}")
    return current_user

async def verify_recaptcha(token: str) -> bool:
    """Verify reCAPTCHA token with Google"""
    if not token:
        print("❌ No reCAPTCHA token provided")
        return False

    # Check development mode FIRST - bypass CAPTCHA entirely in dev
    if os.getenv("ENVIRONMENT") == "development":
        print("⚠️  WARNING: Using development mode - CAPTCHA verification bypassed")
        return True

    secret_key = os.getenv("RECAPTCHA_SECRET_KEY")
    print(f"🔑 Using secret key: {secret_key[:15]}..." if secret_key else "❌ No secret key found in environment")

    # If no secret key is configured in production
    if not secret_key:
        print("❌ No RECAPTCHA_SECRET_KEY configured")
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
@limiter.limit("5/hour")  # Strict limit for signup to prevent abuse
async def signup(request: Request, user_data: UserSignup):
    print("\n" + "="*60)
    print("📝 SIGNUP REQUEST RECEIVED")
    print("="*60)
    print(f"   Email: {user_data.email}")
    print(f"   Name: {user_data.name}")
    print(f"   Sales ID: {user_data.salesid}")
    print(f"   reCAPTCHA token: {user_data.recaptcha_token[:20]}..." if user_data.recaptcha_token else "   reCAPTCHA token: MISSING")
    
    # Verify reCAPTCHA
    print("\n🔐 Step 1: Verifying reCAPTCHA...")
    if not await verify_recaptcha(user_data.recaptcha_token):
        print("❌ reCAPTCHA verification FAILED")
        return JSONResponse(
            status_code=400,
            content={"error": "CAPTCHA verification failed. Please try again."}
        )
    print("✅ reCAPTCHA verification PASSED")

    # Check for duplicate email and sales ID
    print("\n🔍 Step 2: Checking for duplicates...")
    with SessionLocal() as db:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            print(f"❌ Email {user_data.email} already exists")
            return {"error": "This email is already registered. Please use a different email or login."}
        print(f"✅ Email {user_data.email} is available")

        existing_salesid = db.query(User).filter(User.salesid == user_data.salesid).first()
        if existing_salesid:
            print(f"❌ Sales ID {user_data.salesid} already exists")
            return {"error": "This Sales ID is already registered. Please contact your administrator."}
        print(f"✅ Sales ID {user_data.salesid} is available")

        # Generate verification token
        print("\n🔑 Step 3: Creating user account...")
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
        print(f"✅ User created with ID: {new_user.userid}")

        # Construct verification link
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        print(f"🔗 Verification link: {verification_link}")

        # Send verification email
        print("\n📧 Step 4: Sending verification email...")
        try:
            await send_verification_email(
                email=user_data.email,
                name=user_data.name,
                verification_link=verification_link
            )
            email_sent = True
            print(f"✅ Verification email sent successfully to {user_data.email}")
        except Exception as e:
            # Log the error but don't fail the signup
            print(f"❌ Failed to send verification email!")
            print(f"   Error type: {type(e).__name__}")
            print(f"   Error message: {str(e)}")
            print(f"   Manual verification link: {verification_link}")
            email_sent = False

    print("\n" + "="*60)
    print(f"✅ SIGNUP COMPLETE - Email sent: {email_sent}")
    print("="*60 + "\n")

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
@limiter.limit("10/15minutes")  # Prevent brute force attacks
async def login(request: Request, user_data: UserLogin):
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
            # Create JWT token (sub must be a string)
            access_token = create_access_token(data={"sub": str(user.userid)})

            return {
                "message": "Welcome!",
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "email": user.email,
                    "name": user.name,
                    "salesid": str(user.salesid),
                    "userid": user.userid,
                    "email_verified": user.email_verified,
                    "is_admin": user.is_admin
                }
            }
        else:
            return {"message":"Incorrect Login or Password"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/forgot-password")
@limiter.limit("3/hour")  # Strict limit for password reset requests
async def forgot_password(request: Request, reset_request: ForgotPasswordRequest):
    """Send password reset email to user"""
    # Verify reCAPTCHA
    if not await verify_recaptcha(reset_request.recaptcha_token):
        return JSONResponse(
            status_code=400,
            content={"error": "CAPTCHA verification failed. Please try again."}
        )

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == reset_request.email).first()

        # Always return success to prevent email enumeration attacks
        # but only send email if user exists
        if user:
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            reset_token_expiry = datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour

            # Save token to database
            user.reset_token = reset_token
            user.reset_token_expiry = reset_token_expiry
            db.commit()

            # Construct reset link
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            reset_link = f"{frontend_url}/reset-password?token={reset_token}"

            # Send reset email
            try:
                await send_password_reset_email(
                    email=user.email,
                    name=user.name,
                    reset_link=reset_link
                )
                print(f"✓ Password reset email sent to {user.email}")
            except Exception as e:
                print(f"✗ Failed to send password reset email: {str(e)}")
                print(f"Reset link: {reset_link}")

    return {
        "message": "If an account with that email exists, a password reset link has been sent.",
        "success": True
    }

@router.post("/reset-password")
@limiter.limit("5/hour")  # Limit password reset attempts
async def reset_password(request: Request, reset_request: ResetPasswordRequest):
    """Reset user password with token"""
    # Verify reCAPTCHA
    if not await verify_recaptcha(reset_request.recaptcha_token):
        return JSONResponse(
            status_code=400,
            content={"error": "CAPTCHA verification failed. Please try again."}
        )

    # Validate password length
    if len(reset_request.new_password) < 8:
        return JSONResponse(
            status_code=400,
            content={"error": "Password must be at least 8 characters long."}
        )

    with SessionLocal() as db:
        user = db.query(User).filter(User.reset_token == reset_request.token).first()

        if not user:
            print(f"❌ Password reset failed: Invalid token")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid or expired reset token."}
            )

        # Check if token has expired
        if user.reset_token_expiry < datetime.utcnow():
            print(f"❌ Password reset failed: Token expired for {user.email}")
            return JSONResponse(
                status_code=400,
                content={"error": "Reset token has expired. Please request a new password reset."}
            )

        # Hash new password
        password_bytes = reset_request.new_password.encode('utf-8')
        hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

        # Update password and clear reset token
        user.password = hashed_password
        user.reset_token = None
        user.reset_token_expiry = None
        db.commit()

        print(f"✅ Password reset successfully for {user.email}")
        return JSONResponse(
            status_code=200,
            content={"success": True, "message": "Password reset successfully! You can now log in with your new password."}
        )
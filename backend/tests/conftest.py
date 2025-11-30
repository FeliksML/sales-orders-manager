"""
Pytest configuration and fixtures for testing.

This conftest.py is designed to work in Docker containers where DATABASE_URL
is already set to the correct PostgreSQL connection string.
"""
import pytest
import os
import bcrypt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set minimal test environment variables (don't override DATABASE_URL - use container's value)
if not os.getenv("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only-min-32-chars"
os.environ["ENVIRONMENT"] = "development"
# Disable scheduler during tests to prevent background job interference
os.environ["SCHEDULER_ENABLED"] = "false"
if not os.getenv("FRONTEND_URL"):
    os.environ["FRONTEND_URL"] = "http://localhost:5173"
os.environ["RECAPTCHA_SECRET_KEY"] = "test-key"

# Import app modules AFTER setting environment variables
from app.database import Base, get_db
from app.main import app
from app.models import User
from app.auth import create_access_token

# Use the DATABASE_URL from the container environment directly
# In production Docker, this is already set to the correct PostgreSQL connection
TEST_DATABASE_URL = os.getenv("DATABASE_URL")
if not TEST_DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required for tests")

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """
    Create a fresh database for each test function.
    """
    # Create tables
    Base.metadata.create_all(bind=engine)

    # Create session
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """
    Create a test client with a test database session.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    """
    Sample user data for testing
    """
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "name": "Test User",
        "salesid": "12345",
        "recaptcha_token": "test-token"
    }


@pytest.fixture
def auth_headers(client: TestClient, db) -> dict:
    """
    Get authentication headers for a regular (non-admin) user.
    Creates a verified user and returns JWT auth headers.
    """
    password = "testpassword123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        email="testuser@example.com",
        password=hashed_password,
        salesid=77777,
        name="Test User",
        email_verified=True,
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(data={"sub": str(user.userid)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(client: TestClient, db) -> dict:
    """
    Get authentication headers for an admin user.
    Creates a verified admin user and returns JWT auth headers.
    """
    password = "adminpassword123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        email="adminuser@example.com",
        password=hashed_password,
        salesid=88888,
        name="Admin User",
        email_verified=True,
        is_admin=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(data={"sub": str(user.userid)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_user_id(db) -> int:
    """
    Create a test user and return their ID.
    """
    password = "testuserpassword123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        email="targetuser@example.com",
        password=hashed_password,
        salesid=66666,
        name="Target User",
        email_verified=False,  # Unverified so we can test manual verification
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user.userid


@pytest.fixture
def admin_user_id(db) -> int:
    """
    Get the admin user's ID.
    Creates the admin if not already created.
    """
    # Check if admin already exists
    existing_admin = db.query(User).filter(User.email == "adminuser@example.com").first()
    if existing_admin:
        return existing_admin.userid
    
    password = "adminpassword123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        email="adminuser@example.com",
        password=hashed_password,
        salesid=88888,
        name="Admin User",
        email_verified=True,
        is_admin=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user.userid

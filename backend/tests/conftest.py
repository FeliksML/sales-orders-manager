"""
Pytest configuration and fixtures for testing.

This conftest.py is designed to work in Docker containers where DATABASE_URL
is already set to the correct PostgreSQL connection string.
"""
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set minimal test environment variables (don't override DATABASE_URL - use container's value)
if not os.getenv("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only-min-32-chars"
os.environ["ENVIRONMENT"] = "development"
if not os.getenv("FRONTEND_URL"):
    os.environ["FRONTEND_URL"] = "http://localhost:5173"
os.environ["RECAPTCHA_SECRET_KEY"] = "test-key"

# Import app modules AFTER setting environment variables
from app.database import Base, get_db
from app.main import app

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

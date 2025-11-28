"""
Pytest configuration and fixtures for testing
"""
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app

# Set test environment variables
# Use 'database' for Docker prod, 'db' for dev, fallback to 'localhost' for local
DB_HOST = os.getenv("DB_HOST", "database")  # 'database' is the prod Docker service name
DB_USER = os.getenv("POSTGRES_USER", "sales_order_user")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_NAME = os.getenv("POSTGRES_DB", "sales_order_db")
os.environ["DATABASE_URL"] = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only-min-32-chars"
os.environ["ENVIRONMENT"] = "development"
os.environ["FRONTEND_URL"] = "http://localhost:5173"
os.environ["RECAPTCHA_SECRET_KEY"] = "test-key"


# Create test database engine - use the production database for integration tests
TEST_DATABASE_URL = os.getenv("DATABASE_URL")
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

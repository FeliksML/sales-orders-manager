"""Quick database initialization - creates tables only"""
import os
import sys

os.environ["DATABASE_URL"] = "postgresql://doadmin:AVNS_UWagqbikulP2lN6_0Jw@db-postgresql-sfo3-98348-do-user-18370984-0.i.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
os.environ["SECRET_KEY"] = "temp-key-for-init"
os.environ["ENVIRONMENT"] = "production"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Importing database modules...")
from app.database import Base, engine

print("Creating all tables...")
Base.metadata.create_all(bind=engine)

print("✅ Tables created successfully!")
print("   - users")
print("   - orders")
print("   - notifications")
print("   - audit_logs")
print("   - error_logs")

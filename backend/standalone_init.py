"""Standalone database initialization - no app imports"""
import sys
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, LargeBinary, DateTime, Date, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://doadmin:AVNS_UWagqbikulP2lN6_0Jw@db-postgresql-sfo3-98348-do-user-18370984-0.i.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

print("Connecting to database...")
engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
Base = declarative_base()

print("Defining models...")

# Define all models inline
class User(Base):
    __tablename__ = 'users'
    userid = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(LargeBinary, nullable=False)
    salesid = Column(Integer, unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    verification_token_expiry = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    phone_number = Column(String(20), nullable=True)
    email_notifications = Column(Boolean, default=True, nullable=False)
    sms_notifications = Column(Boolean, default=False, nullable=False)
    browser_notifications = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

class Order(Base):
    __tablename__ = 'orders'
    orderid = Column(Integer, primary_key=True)
    userid = Column(Integer, ForeignKey('users.userid'), nullable=False)
    spectrum_reference = Column(String(255), nullable=False)
    customer_account_number = Column(String(255), nullable=False)
    customer_security_code = Column(String(255))
    job_number = Column(String(255))
    business_name = Column(String(255), nullable=False)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_address = Column(String(255))
    customer_phone = Column(String(255), nullable=False)
    install_date = Column(Date, nullable=False)
    install_time = Column(String(100), nullable=False)
    has_internet = Column(Boolean, default=False)
    has_voice = Column(Integer, default=0)
    has_tv = Column(Boolean, default=False)
    has_sbc = Column(Integer, default=0)
    has_mobile = Column(Integer, default=0)
    mobile_activated = Column(Integer, default=0)
    has_wib = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    created_by = Column(Integer, ForeignKey('users.userid'), nullable=True)

class Notification(Base):
    __tablename__ = 'notifications'
    notificationid = Column(Integer, primary_key=True)
    userid = Column(Integer, ForeignKey('users.userid'), nullable=False)
    orderid = Column(Integer, ForeignKey('orders.orderid'), nullable=True)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    sent_via_email = Column(Boolean, default=False)
    sent_via_sms = Column(Boolean, default=False)
    sent_via_browser = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, nullable=False)
    read_at = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    auditid = Column(Integer, primary_key=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey('users.userid'), nullable=False)
    user_name = Column(String(255), nullable=False)
    action = Column(String(50), nullable=False)
    field_name = Column(String(255), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    snapshot = Column(JSON, nullable=True)
    change_reason = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, nullable=False, index=True)

class ErrorLog(Base):
    __tablename__ = 'error_logs'
    errorid = Column(Integer, primary_key=True)
    error_type = Column(String(100), nullable=False)
    error_message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    endpoint = Column(String(255), nullable=True)
    method = Column(String(10), nullable=True)
    status_code = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey('users.userid'), nullable=True)
    user_email = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    request_data = Column(JSON, nullable=True)
    user_agent = Column(String(500), nullable=True)
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey('users.userid'), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, nullable=False, index=True)

print("Creating tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("\n✅ SUCCESS! All tables created:")
    print("   ✓ users")
    print("   ✓ orders")
    print("   ✓ notifications")
    print("   ✓ audit_logs")
    print("   ✓ error_logs")
    print("\nDatabase is ready to use!")
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    sys.exit(1)

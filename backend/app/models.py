from .database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, Date, Boolean, Text, LargeBinary, DateTime, JSON
from datetime import datetime

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

    # Notification preferences
    phone_number = Column(String(20), nullable=True)
    email_notifications = Column(Boolean, default=True, nullable=False)
    sms_notifications = Column(Boolean, default=False, nullable=False)
    browser_notifications = Column(Boolean, default=True, nullable=False)

class Order(Base):
    __tablename__ = 'orders'

    orderid = Column(Integer, primary_key=True)
    userid = Column(Integer, ForeignKey('users.userid'), nullable=False)

    # Order reference information
    spectrum_reference = Column(String(255), nullable=False)
    customer_account_number = Column(String(255), nullable=False)
    customer_security_code = Column(String(255))
    job_number = Column(String(255))

    # Customer information
    business_name = Column(String(255), nullable=False)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_address = Column(String(255))
    customer_phone = Column(String(255), nullable=False)

    # Installation details
    install_date = Column(Date, nullable=False)
    install_time = Column(String(100), nullable=False)

    # Product booleans and quantities
    has_internet = Column(Boolean, default=False)
    has_voice = Column(Integer, default=0)
    has_tv = Column(Boolean, default=False)
    has_sbc = Column(Integer, default=0)
    has_mobile = Column(Integer, default=0)
    mobile_activated = Column(Integer, default=0)
    has_wib = Column(Boolean, default=False)

    # Additional notes
    notes = Column(Text)

    # Audit trail timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey('users.userid'), nullable=True)

class Notification(Base):
    __tablename__ = 'notifications'

    notificationid = Column(Integer, primary_key=True)
    userid = Column(Integer, ForeignKey('users.userid'), nullable=False)
    orderid = Column(Integer, ForeignKey('orders.orderid'), nullable=True)

    # Notification details
    notification_type = Column(String(50), nullable=False)  # 'install_reminder', 'today_install', etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Delivery channels
    sent_via_email = Column(Boolean, default=False)
    sent_via_sms = Column(Boolean, default=False)
    sent_via_browser = Column(Boolean, default=False)

    # Status
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    auditid = Column(Integer, primary_key=True)

    # What was changed
    entity_type = Column(String(50), nullable=False)  # 'order', 'user', etc.
    entity_id = Column(Integer, nullable=False)  # orderid, userid, etc.

    # Who made the change
    user_id = Column(Integer, ForeignKey('users.userid'), nullable=False)
    user_name = Column(String(255), nullable=False)  # Denormalized for historical accuracy

    # What action was performed
    action = Column(String(50), nullable=False)  # 'create', 'update', 'delete', 'bulk_update', 'bulk_delete'

    # Change details
    field_name = Column(String(255), nullable=True)  # Which field changed (null for create/delete)
    old_value = Column(Text, nullable=True)  # Previous value (JSON for complex types)
    new_value = Column(Text, nullable=True)  # New value (JSON for complex types)

    # Full snapshot for create/delete/revert operations
    snapshot = Column(JSON, nullable=True)  # Complete state of the entity

    # Additional context
    change_reason = Column(Text, nullable=True)  # Optional reason for the change
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6

    # When
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
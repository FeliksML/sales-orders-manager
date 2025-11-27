from .database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, Date, Boolean, Text, LargeBinary, DateTime, JSON, Float, Numeric, UniqueConstraint
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

    # Password reset fields
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    # Notification preferences
    phone_number = Column(String(20), nullable=True)
    email_notifications = Column(Boolean, default=True, nullable=False)
    sms_notifications = Column(Boolean, default=False, nullable=False)
    browser_notifications = Column(Boolean, default=True, nullable=False)

    # Admin role
    is_admin = Column(Boolean, default=False, nullable=False)

    # AI Insights rate limiting (max 3 per day)
    ai_insights_count = Column(Integer, default=0, nullable=False)
    ai_insights_reset_date = Column(Date, nullable=True)

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
    has_gig = Column(Boolean, default=False)  # Gig Internet bonus eligible

    # PDF extracted fields
    internet_tier = Column(String(100), nullable=True)
    monthly_total = Column(Float, nullable=True)
    initial_payment = Column(Float, nullable=True)

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

class ErrorLog(Base):
    __tablename__ = 'error_logs'

    errorid = Column(Integer, primary_key=True)

    # Error details
    error_type = Column(String(100), nullable=False)  # 'api_error', 'frontend_error', 'validation_error', etc.
    error_message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)

    # Context
    endpoint = Column(String(255), nullable=True)  # API endpoint where error occurred
    method = Column(String(10), nullable=True)  # HTTP method (GET, POST, etc.)
    status_code = Column(Integer, nullable=True)  # HTTP status code

    # User context
    user_id = Column(Integer, ForeignKey('users.userid'), nullable=True)  # null if not authenticated
    user_email = Column(String(255), nullable=True)  # Denormalized for historical accuracy
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6

    # Request details
    request_data = Column(JSON, nullable=True)  # Request payload (sanitized)
    user_agent = Column(String(500), nullable=True)  # Browser/client info

    # Resolution
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey('users.userid'), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Timestamps
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class CommissionSettings(Base):
    __tablename__ = 'commission_settings'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.userid'), unique=True, nullable=False)

    # AE Type and New Hire status
    ae_type = Column(String(50), default='Account Executive', nullable=False)  # 'Account Executive' or 'Sr Account Executive'
    is_new_hire = Column(Boolean, default=False, nullable=False)
    new_hire_month = Column(Integer, nullable=True)  # 1-6 for ramp period

    # Rate overrides (JSON) - allows users to customize commission rates
    # Structure: { "internet": 100, "mobile": 75, "voice": 75, "video": 60, "mrr": 0.25, ... }
    rate_overrides = Column(JSON, nullable=True)

    # Value overrides (JSON) - allows users to correct auto-calculated totals
    # Structure: { "internet": 15, "mobile": 10, "voice": 8, "video": 5, "mrr": 2500, ... }
    value_overrides = Column(JSON, nullable=True)

    # Tax settings
    federal_bracket = Column(Numeric(5, 4), default=0.22, nullable=False)  # 22% default
    state_code = Column(String(2), default='CA', nullable=False)
    state_tax_rate = Column(Numeric(5, 4), default=0.093, nullable=False)  # CA default 9.3%

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SalesGoal(Base):
    __tablename__ = 'sales_goals'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.userid'), nullable=False)

    # Period (fiscal month - aligned with commission system)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12

    # Targets (all optional - users choose what to track)
    # PSU = Primary Service Unit (1 per product category: Internet, Voice, Mobile, TV, SBC)
    target_psu = Column(Integer, nullable=True)  # PSU target
    target_revenue = Column(Float, nullable=True)  # MRR target
    target_internet = Column(Integer, nullable=True)
    target_mobile = Column(Integer, nullable=True)
    target_tv = Column(Integer, nullable=True)
    target_voice = Column(Integer, nullable=True)
    target_sbc = Column(Integer, nullable=True)
    target_wib = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Unique constraint per user per month
    __table_args__ = (UniqueConstraint('user_id', 'year', 'month', name='uq_user_year_month'),)


class FollowUp(Base):
    """Follow-up reminders for post-installation customer contact"""
    __tablename__ = 'followups'

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.orderid'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.userid'), nullable=False)

    # When the follow-up is due
    due_date = Column(DateTime, nullable=False)
    
    # Optional note: "Ask about referral", "Check if TV working", etc.
    note = Column(Text, nullable=True)

    # Status: pending, completed, snoozed
    status = Column(String(20), default='pending', nullable=False)
    completed_at = Column(DateTime, nullable=True)
    snoozed_until = Column(DateTime, nullable=True)
    
    # Track if notification was already sent for this follow-up
    notification_sent = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
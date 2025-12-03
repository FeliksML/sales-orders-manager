from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Optional, Dict, Any, List, Generic, TypeVar
from datetime import date, datetime
import re

# Generic type for paginated responses
T = TypeVar('T')

# Regex patterns for validation
# Phone pattern: Allows common phone formats, validated more strictly in validator
PHONE_PATTERN = re.compile(r'^[\d\s\-\(\)\+\.]{7,20}$')
SALESID_PATTERN = re.compile(r'^\d{5}$')

def validate_phone_has_digits(phone: str) -> bool:
    """Validate that a phone string contains at least 7 actual digits."""
    digit_count = sum(1 for c in phone if c.isdigit())
    return digit_count >= 7

# Valid US state codes for tax settings validation
VALID_US_STATE_CODES = {
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP'  # Include territories
}


class UserSignup(BaseModel):
    """Schema for user registration with validation."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    salesid: int = Field(..., ge=10000, le=99999)  # Must be 5 digits
    name: str = Field(..., min_length=1, max_length=255)
    recaptcha_token: Optional[str] = None

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str = Field(..., min_length=1)
    recaptcha_token: Optional[str] = None

class UserResponse(BaseModel):
    """Schema for user response data."""
    model_config = ConfigDict(from_attributes=True)
    
    userid: int
    email: EmailStr
    salesid: int
    name: str
    email_verified: bool
    is_admin: bool = False


class ForgotPasswordRequest(BaseModel):
    """Schema for password reset request."""
    email: EmailStr
    recaptcha_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    """Schema for password reset with new password."""
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    recaptcha_token: Optional[str] = None

# Order Schemas
class OrderBase(BaseModel):
    """Base schema for order data with validation."""
    spectrum_reference: str = Field(..., min_length=1, max_length=255)
    customer_account_number: str = Field(..., min_length=1, max_length=255)
    customer_security_code: Optional[str] = Field(None, max_length=255)
    job_number: Optional[str] = Field(None, max_length=255)
    business_name: str = Field(..., min_length=1, max_length=255)
    customer_name: str = Field(..., min_length=1, max_length=255)
    customer_email: EmailStr
    customer_address: Optional[str] = Field(None, max_length=500)
    customer_phone: str = Field(..., min_length=7, max_length=20)
    install_date: date
    install_time: str = Field(..., min_length=1, max_length=100)
    has_internet: bool = False
    has_voice: int = Field(default=0, ge=0)
    has_tv: bool = False
    has_sbc: int = Field(default=0, ge=0)
    has_mobile: int = Field(default=0, ge=0)
    mobile_activated: int = Field(default=0, ge=0)
    has_wib: bool = False
    has_gig: bool = False
    internet_tier: Optional[str] = Field(None, max_length=100)
    monthly_total: Optional[float] = Field(None, ge=0)
    initial_payment: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator('customer_phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate phone number format and ensure it contains at least 7 digits."""
        if not PHONE_PATTERN.match(v):
            raise ValueError('Invalid phone number format')
        if not validate_phone_has_digits(v):
            raise ValueError('Phone number must contain at least 7 digits')
        return v

class OrderCreate(OrderBase):
    """Schema for creating a new order - includes past date validation."""

    @field_validator('install_date')
    @classmethod
    def validate_install_date_not_past(cls, v: date) -> date:
        """Ensure install date is not in the past for new orders."""
        if v < date.today():
            raise ValueError('Install date cannot be in the past')
        return v

class OrderUpdate(BaseModel):
    """Schema for updating order data - all fields optional."""
    spectrum_reference: Optional[str] = Field(None, min_length=1, max_length=255)
    customer_account_number: Optional[str] = Field(None, min_length=1, max_length=255)
    customer_security_code: Optional[str] = Field(None, max_length=255)
    job_number: Optional[str] = Field(None, max_length=255)
    business_name: Optional[str] = Field(None, min_length=1, max_length=255)
    customer_name: Optional[str] = Field(None, min_length=1, max_length=255)
    customer_email: Optional[EmailStr] = None
    customer_address: Optional[str] = Field(None, max_length=500)
    customer_phone: Optional[str] = Field(None, min_length=7, max_length=20)
    install_date: Optional[date] = None
    install_time: Optional[str] = Field(None, min_length=1, max_length=100)
    has_internet: Optional[bool] = None
    has_voice: Optional[int] = Field(None, ge=0)
    has_tv: Optional[bool] = None
    has_sbc: Optional[int] = Field(None, ge=0)
    has_mobile: Optional[int] = Field(None, ge=0)
    mobile_activated: Optional[int] = Field(None, ge=0)
    has_wib: Optional[bool] = None
    has_gig: Optional[bool] = None
    internet_tier: Optional[str] = Field(None, max_length=100)
    monthly_total: Optional[float] = Field(None, ge=0)
    initial_payment: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator('customer_phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number format if provided and ensure it contains at least 7 digits."""
        if v is not None:
            if not PHONE_PATTERN.match(v):
                raise ValueError('Invalid phone number format')
            if not validate_phone_has_digits(v):
                raise ValueError('Phone number must contain at least 7 digits')
        return v

class OrderResponse(OrderBase):
    model_config = ConfigDict(from_attributes=True)
    
    orderid: int
    userid: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None

class OrderStats(BaseModel):
    total_orders: int
    this_week: int
    this_month: int
    pending_installs: int
    total_internet: int
    total_tv: int
    total_mobile: int
    total_voice: int

# Pagination Schemas
class PaginationMeta(BaseModel):
    total: int
    skip: int
    limit: int
    has_more: bool

class PaginatedOrderResponse(BaseModel):
    data: List[OrderResponse]
    meta: PaginationMeta

# Audit Trail Schemas
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    auditid: int
    entity_type: str
    entity_id: int
    user_id: int
    user_name: str
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    snapshot: Optional[Dict[str, Any]] = None
    change_reason: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

class AuditHistoryResponse(BaseModel):
    order_id: int
    total_changes: int
    audit_logs: list[AuditLogResponse]

class RevertRequest(BaseModel):
    timestamp: datetime
    reason: Optional[str] = None

class UserActivitySummary(BaseModel):
    total_actions: int
    creates: int
    updates: int
    deletes: int
    bulk_operations: int
    reverts: int
    period_days: int

# Error Log Schemas
class ErrorLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    errorid: int
    error_type: str
    error_message: str
    stack_trace: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    user_agent: Optional[str] = None
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolution_notes: Optional[str] = None
    timestamp: datetime

class ErrorLogCreate(BaseModel):
    error_type: str
    error_message: str
    stack_trace: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    user_agent: Optional[str] = None
    component_name: Optional[str] = None  # For frontend errors

class ResolveErrorRequest(BaseModel):
    resolution_notes: Optional[str] = None

# Admin Schemas
class AdminUserResponse(UserResponse):
    phone_number: Optional[str] = None
    email_notifications: bool = True
    sms_notifications: bool = False
    browser_notifications: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    total_orders: int = 0
    pending_orders: int = 0

class SystemAnalytics(BaseModel):
    total_users: int
    verified_users: int
    unverified_users: int
    admin_users: int
    total_orders: int
    orders_this_week: int
    orders_this_month: int
    pending_installs: int
    total_internet: int
    total_tv: int
    total_mobile: int
    total_voice: int
    total_wib: int
    total_sbc: int
    total_errors: int
    unresolved_errors: int
    recent_errors: List[ErrorLogResponse] = []

class PaginatedErrorLogResponse(BaseModel):
    data: List[ErrorLogResponse]
    meta: PaginationMeta

class PaginatedUserResponse(BaseModel):
    data: List[AdminUserResponse]
    meta: PaginationMeta


# Commission Settings Schemas
class CommissionSettingsBase(BaseModel):
    """Base schema for commission settings."""
    ae_type: str = Field(default="Account Executive", max_length=50)
    is_new_hire: bool = False
    new_hire_month: Optional[int] = Field(None, ge=1, le=6)  # 1-6 for ramp period
    rate_overrides: Optional[Dict[str, Any]] = None
    value_overrides: Optional[Dict[str, Any]] = None
    # Tax settings
    federal_bracket: float = Field(default=0.22, ge=0, le=1)  # 0-100%
    state_code: str = Field(default="CA", min_length=2, max_length=2)
    state_tax_rate: float = Field(default=0.093, ge=0, le=1)  # 0-100%

    @field_validator('state_code')
    @classmethod
    def validate_state_code(cls, v: str) -> str:
        """Validate that state_code is a valid US state code."""
        v_upper = v.upper()
        if v_upper not in VALID_US_STATE_CODES:
            raise ValueError(f'Invalid US state code: {v}. Must be a valid 2-letter state code.')
        return v_upper


class CommissionSettingsUpdate(BaseModel):
    """Schema for updating commission settings."""
    ae_type: Optional[str] = Field(None, max_length=50)
    is_new_hire: Optional[bool] = None
    new_hire_month: Optional[int] = Field(None, ge=1, le=6)
    rate_overrides: Optional[Dict[str, Any]] = None
    value_overrides: Optional[Dict[str, Any]] = None
    # Tax settings
    federal_bracket: Optional[float] = Field(None, ge=0, le=1)
    state_code: Optional[str] = Field(None, min_length=2, max_length=2)
    state_tax_rate: Optional[float] = Field(None, ge=0, le=1)

    @field_validator('state_code')
    @classmethod
    def validate_state_code(cls, v: Optional[str]) -> Optional[str]:
        """Validate that state_code is a valid US state code if provided."""
        if v is not None:
            v_upper = v.upper()
            if v_upper not in VALID_US_STATE_CODES:
                raise ValueError(f'Invalid US state code: {v}. Must be a valid 2-letter state code.')
            return v_upper
        return v


class CommissionSettingsResponse(CommissionSettingsBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AutoTotalsResponse(BaseModel):
    """Auto-aggregated product counts from orders with override capability"""
    # Auto-calculated values
    auto_internet: int = 0
    auto_mobile: int = 0
    auto_voice: int = 0
    auto_video: int = 0
    auto_mrr: float = 0.0
    auto_wib: int = 0
    auto_gig_internet: int = 0
    auto_sbc: int = 0

    # Effective values (override if set, otherwise auto)
    internet: int = 0
    mobile: int = 0
    voice: int = 0
    video: int = 0
    mrr: float = 0.0
    wib: int = 0
    gig_internet: int = 0
    sbc: int = 0

    # Override flags
    overrides: Dict[str, bool] = {}


class ProductBreakdown(BaseModel):
    """Commission breakdown for a single product type"""
    product: str
    count: int
    rate: float
    payout: float


class TaxBreakdown(BaseModel):
    """Tax breakdown showing deductions from commission"""
    gross_commission: float
    federal_tax: float
    federal_rate: float
    state_tax: float
    state_rate: float
    state_code: str
    social_security: float  # 6.2%
    medicare: float  # 1.45%
    total_tax: float
    net_commission: float


class EarningsResponse(BaseModel):
    """Monthly commission earnings with breakdown"""
    # Period info
    period: str  # e.g., "November 2025"
    period_start: date
    period_end: date

    # Totals
    total_commission: float
    psu_total: float
    mrr_payout: float
    alacarte_total: float
    ramp_amount: float
    sae_bonus: float

    # Product breakdown
    breakdown: List[ProductBreakdown]

    # Comparison to last month
    last_month_total: float
    month_over_month_change: float
    month_over_month_percent: float

    # Order counts
    eligible_orders: int
    total_orders_this_month: int

    # Current tier info
    current_tier: str
    sae_eligible: bool

    # Tax breakdown (optional - included when user has tax settings)
    tax_breakdown: Optional[TaxBreakdown] = None


class RateTier(BaseModel):
    """Rate tier for commission calculation"""
    min_internet: int
    max_internet: Optional[int]
    internet_rate: float
    mobile_rate: float
    voice_rate: float
    video_rate: float
    mrr_rate: float


class RateTableResponse(BaseModel):
    """Commission rate tables"""
    regular_rates: List[RateTier]
    new_hire_rates: List[RateTier]
    alacarte_rates: Dict[str, float]
    ramp_table: Dict[int, float]  # month -> amount


class OrderCommissionEstimate(BaseModel):
    """Estimated commission for a single order"""
    order_id: int
    internet_payout: float
    mobile_payout: float
    voice_payout: float
    video_payout: float
    mrr_payout: float
    wib_payout: float
    gig_bonus: float
    sbc_payout: float
    total_estimate: float


# Sales Goal Schemas
class SalesGoalBase(BaseModel):
    """Base schema for sales goals
    
    PSU = Primary Service Unit (1 per product category: Internet, Voice, Mobile, TV, SBC)
    """
    target_psu: Optional[int] = None  # PSU target
    target_revenue: Optional[float] = None  # MRR target
    target_internet: Optional[int] = None
    target_mobile: Optional[int] = None
    target_tv: Optional[int] = None
    target_voice: Optional[int] = None
    target_sbc: Optional[int] = None
    target_wib: Optional[int] = None


class SalesGoalUpdate(SalesGoalBase):
    """Schema for updating a sales goal"""
    pass


class SalesGoalResponse(SalesGoalBase):
    """Schema for sales goal response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    year: int
    month: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GoalProgressItem(BaseModel):
    """Progress for a single goal metric"""
    target: int
    current: int
    percentage: float
    projected: int  # Pace projection
    status: str  # 'green', 'yellow', 'red'
    on_track: bool


class GoalProgressResponse(BaseModel):
    """Full progress response with all metrics"""
    # Period info
    period: str  # e.g., "November 2025"
    year: int
    month: int
    days_elapsed: int
    days_remaining: int
    days_total: int
    
    # Goal exists?
    has_goal: bool
    
    # Progress for each metric (only included if target is set)
    psu: Optional[GoalProgressItem] = None  # PSU progress
    revenue: Optional[GoalProgressItem] = None
    internet: Optional[GoalProgressItem] = None
    mobile: Optional[GoalProgressItem] = None
    tv: Optional[GoalProgressItem] = None
    voice: Optional[GoalProgressItem] = None
    sbc: Optional[GoalProgressItem] = None
    wib: Optional[GoalProgressItem] = None
    
    # Overall status
    overall_status: str  # 'green', 'yellow', 'red', 'none'
    goal_achieved: bool  # True if all targets met


class GoalHistoryItem(BaseModel):
    """Historical goal achievement for a single month"""
    year: int
    month: int
    period: str  # e.g., "October 2025"
    had_goal: bool
    achieved: bool
    # Breakdown if goal existed
    psu_target: Optional[int] = None
    psu_actual: Optional[int] = None
    revenue_target: Optional[float] = None
    revenue_actual: Optional[float] = None
    internet_target: Optional[int] = None
    internet_actual: Optional[int] = None
    mobile_target: Optional[int] = None
    mobile_actual: Optional[int] = None
    tv_target: Optional[int] = None
    tv_actual: Optional[int] = None
    voice_target: Optional[int] = None
    voice_actual: Optional[int] = None
    sbc_target: Optional[int] = None
    sbc_actual: Optional[int] = None
    wib_target: Optional[int] = None
    wib_actual: Optional[int] = None


class GoalHistoryResponse(BaseModel):
    """Historical goal achievement summary"""
    total_months: int
    months_with_goals: int
    goals_achieved: int
    achievement_rate: float  # Percentage
    history: List[GoalHistoryItem]


# Follow-Up Reminder Schemas
class FollowUpCreate(BaseModel):
    """Schema for creating a follow-up reminder"""
    order_id: int
    due_date: datetime
    note: Optional[str] = None


class FollowUpUpdate(BaseModel):
    """Schema for updating a follow-up reminder"""
    due_date: Optional[datetime] = None
    note: Optional[str] = None
    status: Optional[str] = None  # pending, completed, snoozed


class FollowUpSnooze(BaseModel):
    """Schema for snoozing a follow-up"""
    days: int = Field(default=1, ge=1, le=365)  # Number of days to snooze (1-365)


class FollowUpOrderInfo(BaseModel):
    """Embedded order info for follow-up response"""
    model_config = ConfigDict(from_attributes=True)
    
    orderid: int
    customer_name: str
    business_name: str
    customer_phone: str
    install_date: date


class FollowUpResponse(BaseModel):
    """Schema for follow-up response with order details"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    order_id: int
    user_id: int
    due_date: datetime
    note: Optional[str] = None
    status: str
    completed_at: Optional[datetime] = None
    snoozed_until: Optional[datetime] = None
    notification_sent: bool
    created_at: datetime
    updated_at: datetime
    # Embedded order info
    order: Optional[FollowUpOrderInfo] = None


class TodaysFollowUpsResponse(BaseModel):
    """Response for today's follow-ups dashboard section"""
    count: int
    overdue_count: int
    followups: List[FollowUpResponse]


class PaginatedFollowUpResponse(BaseModel):
    """Paginated list of follow-ups"""
    data: List[FollowUpResponse]
    meta: PaginationMeta


# Performance Insights Schemas
class PeriodMetrics(BaseModel):
    """Metrics for a single time period"""
    orders: int
    internet: int
    tv: int
    mobile: int
    voice: int
    sbc: int
    wib: int
    psu: int
    revenue: float


class PerformanceComparison(BaseModel):
    """Comparison between current and previous period"""
    current: PeriodMetrics
    previous: PeriodMetrics
    change_percent: Dict[str, float]  # {orders: +12.5, internet: -5.0, ...}
    change_absolute: Dict[str, float]


class TrendDataPoint(BaseModel):
    """Single data point in a trend series"""
    period: str  # "Nov 2025", "Week 47"
    orders: int
    internet: int
    mobile: int
    psu: int
    revenue: float


class PersonalRecord(BaseModel):
    """A personal best achievement"""
    metric: str  # "orders", "psu", "revenue", "internet"
    value: float
    period: str  # "November 2025"
    is_current_period: bool


class PerformanceInsightsResponse(BaseModel):
    """Comprehensive performance insights with comparisons and trends"""
    # Period comparisons
    month_comparison: PerformanceComparison
    week_comparison: PerformanceComparison
    
    # Trend data (last 6 months + last 8 weeks)
    monthly_trend: List[TrendDataPoint]
    weekly_trend: List[TrendDataPoint]
    
    # Personal records
    records: List[PersonalRecord]  # Best month, best week, highest PSU, etc.
    
    # Streaks
    current_streak: int  # Consecutive months of growth
    streak_type: str  # "growth" | "decline" | "none"
    
    # Smart insights (text-based)
    insights: List[str]


# Subscription & Billing Schemas
class SubscriptionResponse(BaseModel):
    """Response for subscription status endpoint"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: str  # 'free', 'active', 'canceled', 'past_due'
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_period_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SMSUsageResponse(BaseModel):
    """Response for SMS usage tracking"""
    model_config = ConfigDict(from_attributes=True)

    month: str  # 'YYYY-MM'
    sms_count: int
    limit: int  # 10 for free tier, unlimited (-1) for subscribers
    remaining: int  # Remaining SMS this month


class BillingStatusResponse(BaseModel):
    """Combined subscription and usage status for frontend"""
    # Subscription info
    subscription_status: str  # 'free', 'active', 'canceled', 'past_due'
    is_subscribed: bool

    # Usage info
    sms_used: int
    sms_limit: int  # 10 for free, -1 for unlimited
    sms_remaining: int

    # Billing info (only if subscribed)
    current_period_end: Optional[datetime] = None
    price_per_month: float = 20.00

    # Stripe publishable key for checkout
    stripe_publishable_key: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    """Response from create checkout session"""
    checkout_url: str
    session_id: str


class PortalSessionResponse(BaseModel):
    """Response from create portal session"""
    portal_url: str


# Admin Notification Schemas
class NotificationDeliveryResponse(BaseModel):
    """Response schema for notification delivery attempts"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    notification_id: int
    channel: str
    status: str
    attempt_number: int
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None
    created_at: datetime


class AdminNotificationResponse(BaseModel):
    """Response schema for admin notification listing"""
    model_config = ConfigDict(from_attributes=True)

    notificationid: int
    userid: int
    orderid: Optional[int] = None
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    # Delivery status per channel (computed from deliveries)
    email_status: Optional[str] = None   # pending/sent/delivered/failed
    sms_status: Optional[str] = None
    browser_status: Optional[str] = None
    # User info (joined)
    user_email: str
    user_name: str


class UpcomingNotificationResponse(BaseModel):
    """Response schema for upcoming notifications (predictive view)"""
    type: str  # 'install_reminder_24h', 'today_install', 'followup_due'
    expected_send_time: datetime
    order_id: int
    user_id: int
    user_email: str
    user_name: str
    business_name: str
    customer_name: str
    install_date: Optional[date] = None
    install_time: Optional[str] = None
    channels_enabled: List[str]  # ['email', 'sms', 'browser']


class PaginatedAdminNotificationResponse(BaseModel):
    """Paginated response for admin notification listing"""
    data: List[AdminNotificationResponse]
    meta: PaginationMeta


class NotificationStatsResponse(BaseModel):
    """Response schema for notification delivery statistics"""
    total_sent: int
    total_failed: int
    email_sent: int
    email_failed: int
    sms_sent: int
    sms_failed: int
    browser_sent: int
    browser_failed: int
    success_rate: float


class RetryNotificationRequest(BaseModel):
    """Request schema for retrying notification delivery"""
    channel: Optional[str] = None  # If None, retry all failed channels
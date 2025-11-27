from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Generic, TypeVar
from datetime import date, datetime

# Generic type for paginated responses
T = TypeVar('T')

class UserSignup(BaseModel):
    email : str
    password : str
    salesid : int
    name : str
    recaptcha_token : Optional[str] = None

class UserLogin(BaseModel):
    email : str
    password : str
    recaptcha_token : Optional[str] = None

class UserResponse(BaseModel):
    userid: int
    email: str
    salesid: int
    name: str
    email_verified: bool
    is_admin: bool = False

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: str
    recaptcha_token: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    recaptcha_token: Optional[str] = None

# Order Schemas
class OrderBase(BaseModel):
    spectrum_reference: str
    customer_account_number: str
    customer_security_code: Optional[str] = None
    job_number: Optional[str] = None
    business_name: str
    customer_name: str
    customer_email: str
    customer_address: Optional[str] = None
    customer_phone: str
    install_date: date
    install_time: str
    has_internet: bool = False
    has_voice: int = 0
    has_tv: bool = False
    has_sbc: int = 0
    has_mobile: int = 0
    mobile_activated: int = 0
    has_wib: bool = False
    has_gig: bool = False
    internet_tier: Optional[str] = None
    monthly_total: Optional[float] = None
    initial_payment: Optional[float] = None
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    spectrum_reference: Optional[str] = None
    customer_account_number: Optional[str] = None
    customer_security_code: Optional[str] = None
    job_number: Optional[str] = None
    business_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    customer_phone: Optional[str] = None
    install_date: Optional[date] = None
    install_time: Optional[str] = None
    has_internet: Optional[bool] = None
    has_voice: Optional[int] = None
    has_tv: Optional[bool] = None
    has_sbc: Optional[int] = None
    has_mobile: Optional[int] = None
    mobile_activated: Optional[int] = None
    has_wib: Optional[bool] = None
    has_gig: Optional[bool] = None
    internet_tier: Optional[str] = None
    monthly_total: Optional[float] = None
    initial_payment: Optional[float] = None
    notes: Optional[str] = None

class OrderResponse(OrderBase):
    orderid: int
    userid: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

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
    ae_type: str = "Account Executive"  # 'Account Executive' or 'Sr Account Executive'
    is_new_hire: bool = False
    new_hire_month: Optional[int] = None  # 1-6 for ramp period
    rate_overrides: Optional[Dict[str, Any]] = None
    value_overrides: Optional[Dict[str, Any]] = None
    # Tax settings
    federal_bracket: float = 0.22  # 22% default
    state_code: str = "CA"
    state_tax_rate: float = 0.093  # CA default 9.3%


class CommissionSettingsUpdate(BaseModel):
    ae_type: Optional[str] = None
    is_new_hire: Optional[bool] = None
    new_hire_month: Optional[int] = None
    rate_overrides: Optional[Dict[str, Any]] = None
    value_overrides: Optional[Dict[str, Any]] = None
    # Tax settings
    federal_bracket: Optional[float] = None
    state_code: Optional[str] = None
    state_tax_rate: Optional[float] = None


class CommissionSettingsResponse(CommissionSettingsBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


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
    id: int
    user_id: int
    year: int
    month: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


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
    days: int = 1  # Number of days to snooze


class FollowUpOrderInfo(BaseModel):
    """Embedded order info for follow-up response"""
    orderid: int
    customer_name: str
    business_name: str
    customer_phone: str
    install_date: date

    class Config:
        from_attributes = True


class FollowUpResponse(BaseModel):
    """Schema for follow-up response with order details"""
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

    class Config:
        from_attributes = True


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
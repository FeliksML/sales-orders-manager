from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, or_
from typing import Optional
import re
from datetime import datetime, date, timedelta
from .database import get_db
from .models import CommissionSettings, Order, User
from .schemas import (
    CommissionSettingsResponse, CommissionSettingsUpdate,
    AutoTotalsResponse, EarningsResponse, ProductBreakdown,
    RateTableResponse, RateTier, OrderCommissionEstimate, TaxBreakdown
)
from .auth import get_current_user

router = APIRouter()

# ============================================================================
# TAX RATES
# ============================================================================

TAX_RATES = {
    "social_security": 0.062,  # 6.2%
    "medicare": 0.0145,  # 1.45%
}

# Federal tax brackets for 2024 (simplified - using marginal rates)
FEDERAL_TAX_BRACKETS = {
    0.10: "10%",
    0.12: "12%",
    0.22: "22%",
    0.24: "24%",
    0.32: "32%",
    0.35: "35%",
    0.37: "37%",
}

# ============================================================================
# RATE TABLES (from SMB Commission Calculator)
# ============================================================================

REGULAR_RATE_TABLE = [
    {"min": 0, "max": 4, "internet": 0, "mobile": 0, "voice": 0, "video": 0, "mrr": 0},
    {"min": 5, "max": 9, "internet": 100, "mobile": 75, "voice": 75, "video": 60, "mrr": 0.25},
    {"min": 10, "max": 19, "internet": 200, "mobile": 150, "voice": 150, "video": 120, "mrr": 0.5},
    {"min": 20, "max": 29, "internet": 225, "mobile": 175, "voice": 175, "video": 150, "mrr": 0.55},
    {"min": 30, "max": 39, "internet": 250, "mobile": 200, "voice": 200, "video": 175, "mrr": 0.6},
    {"min": 40, "max": None, "internet": 300, "mobile": 225, "voice": 225, "video": 200, "mrr": 0.75},
]

NEW_HIRE_RATE_TABLE = [
    {"min": 0, "max": 9, "internet": 100, "mobile": 75, "voice": 75, "video": 60, "mrr": 0.25},
    {"min": 10, "max": 19, "internet": 200, "mobile": 150, "voice": 150, "video": 120, "mrr": 0.5},
    {"min": 20, "max": 29, "internet": 225, "mobile": 175, "voice": 175, "video": 150, "mrr": 0.55},
    {"min": 30, "max": 39, "internet": 250, "mobile": 200, "voice": 200, "video": 175, "mrr": 0.6},
    {"min": 40, "max": None, "internet": 300, "mobile": 225, "voice": 225, "video": 200, "mrr": 0.75},
]

RAMP_TABLE = {
    1: 1300,
    2: 1100,
    3: 1000,
    4: 750,
    5: 0,
    6: 0,
}

ALACARTE_RATES = {
    "wib": 100,
    "gig_internet": 100,
    "addl_mobile": 100,
    "addl_voice": 100,
    "addl_sbc_seats": 50,
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_fiscal_month_boundaries(reference_date: date) -> tuple:
    """Get fiscal month boundaries for a given date.
    
    Fiscal month runs from 28th 6pm of previous month to 28th 6pm of current month.
    For example, "November" fiscal month: Oct 28 6pm → Nov 28 6pm
    
    Returns (start_datetime, end_datetime, label) for the fiscal month that 
    encompasses the reference_date.
    """
    # First, determine which fiscal month the reference_date falls into
    # If we're past the 28th, we're in the next fiscal month
    reference_datetime = datetime.combine(reference_date, datetime.min.time())
    
    # The 28th 6pm cutoff of this calendar month
    this_month_cutoff = datetime(reference_date.year, reference_date.month, 28, 18, 0, 0)
    
    if reference_datetime >= this_month_cutoff:
        # We're in the NEXT fiscal month (current month 28th 6pm → next month 28th 6pm)
        start_dt = this_month_cutoff
        if reference_date.month == 12:
            end_dt = datetime(reference_date.year + 1, 1, 28, 18, 0, 0)
            label = f"January {reference_date.year + 1}"
        else:
            end_dt = datetime(reference_date.year, reference_date.month + 1, 28, 18, 0, 0)
            # Label is the end month
            end_month = reference_date.month + 1
            label = datetime(reference_date.year, end_month, 1).strftime("%B %Y")
    else:
        # We're in the CURRENT fiscal month (prev month 28th 6pm → this month 28th 6pm)
        end_dt = this_month_cutoff
        if reference_date.month == 1:
            start_dt = datetime(reference_date.year - 1, 12, 28, 18, 0, 0)
        else:
            start_dt = datetime(reference_date.year, reference_date.month - 1, 28, 18, 0, 0)
        label = reference_date.strftime("%B %Y")
    
    return start_dt, end_dt, label


def get_previous_fiscal_month(start_dt: datetime, end_dt: datetime) -> tuple:
    """Get the previous fiscal month boundaries given current fiscal month."""
    # Previous fiscal month ends where current one starts
    prev_end_dt = start_dt
    
    # Previous fiscal month starts one month before that
    if prev_end_dt.month == 1:
        prev_start_dt = datetime(prev_end_dt.year - 1, 12, 28, 18, 0, 0)
    else:
        prev_start_dt = datetime(prev_end_dt.year, prev_end_dt.month - 1, 28, 18, 0, 0)
    
    # Label for previous fiscal month
    if prev_end_dt.month == 1:
        label = f"January {prev_end_dt.year}"
    else:
        label = datetime(prev_end_dt.year, prev_end_dt.month, 1).strftime("%B %Y")
    
    return prev_start_dt, prev_end_dt, label


def get_install_datetime(order) -> datetime:
    """Convert order install date and time to a datetime object.
    
    Returns the datetime at the START of the install time slot.
    """
    if not order.install_date:
        return None
    
    install_time = order.install_time or ""
    
    # Default to midnight if no time specified
    hour = 0
    
    # Parse install time (format: "X:00 AM - Y:00 AM")
    try:
        match = re.match(r'(\d{1,2}):00\s*(AM|PM)', install_time.upper())
        if match:
            hour = int(match.group(1))
            period = match.group(2)
            
            if period == 'AM':
                if hour == 12:
                    hour = 0
            else:  # PM
                if hour != 12:
                    hour = hour + 12
    except Exception:
        pass
    
    return datetime.combine(order.install_date, datetime.min.time().replace(hour=hour))


def is_order_in_fiscal_month(order, start_dt: datetime, end_dt: datetime) -> bool:
    """Check if order's install datetime falls within the fiscal month boundaries.
    
    Order is eligible if: start_dt <= install_datetime < end_dt
    """
    install_dt = get_install_datetime(order)
    if not install_dt:
        return False
    
    return start_dt <= install_dt < end_dt


def get_rate_tier(internet_count: int, is_new_hire: bool) -> dict:
    """Get the rate tier based on internet count and new hire status"""
    rate_table = NEW_HIRE_RATE_TABLE if is_new_hire else REGULAR_RATE_TABLE
    
    for tier in rate_table:
        max_val = tier["max"] if tier["max"] is not None else float('inf')
        if tier["min"] <= internet_count <= max_val:
            return tier
    
    # Default to first tier if somehow nothing matches
    return rate_table[0]


def get_effective_rates(internet_count: int, is_new_hire: bool) -> dict:
    """Get effective rates based on internet count - for regular reps, mobile/voice/video require >4 internet"""
    tier = get_rate_tier(internet_count, is_new_hire)
    
    if is_new_hire:
        return tier
    
    # For regular reps, mobile/voice/video only pay if internet > 4
    return {
        "internet": tier["internet"],
        "mobile": tier["mobile"] if internet_count > 4 else 0,
        "voice": tier["voice"] if internet_count > 4 else 0,
        "video": tier["video"] if internet_count > 4 else 0,
        "mrr": tier["mrr"],
    }


def calculate_order_commission(order: Order, rates: dict, alacarte_eligible: bool) -> dict:
    """Calculate commission for a single order"""
    # PSU payouts
    internet_payout = rates["internet"] if order.has_internet else 0
    mobile_payout = (order.has_mobile or 0) * rates["mobile"]
    voice_payout = (order.has_voice or 0) * rates["voice"]
    video_payout = rates["video"] if order.has_tv else 0
    
    # MRR payout
    mrr_payout = (order.monthly_total or 0) * rates["mrr"]
    
    # A-la-carte payouts (only if eligible - internet > 4)
    wib_payout = ALACARTE_RATES["wib"] if alacarte_eligible and order.has_wib else 0
    
    # Gig internet bonus (uses has_gig field)
    gig_bonus = ALACARTE_RATES["gig_internet"] if alacarte_eligible and order.has_gig else 0
    
    # SBC seats (a-la-carte)
    sbc_payout = (order.has_sbc or 0) * ALACARTE_RATES["addl_sbc_seats"] if alacarte_eligible else 0
    
    total = internet_payout + mobile_payout + voice_payout + video_payout + mrr_payout + wib_payout + gig_bonus + sbc_payout
    
    return {
        "internet_payout": internet_payout,
        "mobile_payout": mobile_payout,
        "voice_payout": voice_payout,
        "video_payout": video_payout,
        "mrr_payout": mrr_payout,
        "wib_payout": wib_payout,
        "gig_bonus": gig_bonus,
        "sbc_payout": sbc_payout,
        "total_estimate": total,
    }


def get_or_create_settings(db: Session, user_id: int) -> CommissionSettings:
    """Get existing settings or create default ones"""
    settings = db.query(CommissionSettings).filter(
        CommissionSettings.user_id == user_id
    ).first()
    
    if not settings:
        settings = CommissionSettings(
            user_id=user_id,
            ae_type="Account Executive",
            is_new_hire=False,
            new_hire_month=None,
            rate_overrides=None,
            value_overrides=None,
            federal_bracket=0.22,
            state_code="CA",
            state_tax_rate=0.093
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


def calculate_tax_breakdown(gross_commission: float, settings: CommissionSettings) -> TaxBreakdown:
    """Calculate tax breakdown for commission"""
    # Get tax rates from settings
    federal_rate = float(settings.federal_bracket) if settings.federal_bracket else 0.22
    state_rate = float(settings.state_tax_rate) if settings.state_tax_rate else 0.093
    state_code = settings.state_code or "CA"
    
    # Calculate individual taxes
    federal_tax = gross_commission * federal_rate
    state_tax = gross_commission * state_rate
    social_security = gross_commission * TAX_RATES["social_security"]
    medicare = gross_commission * TAX_RATES["medicare"]
    
    total_tax = federal_tax + state_tax + social_security + medicare
    net_commission = gross_commission - total_tax
    
    return TaxBreakdown(
        gross_commission=round(gross_commission, 2),
        federal_tax=round(federal_tax, 2),
        federal_rate=federal_rate,
        state_tax=round(state_tax, 2),
        state_rate=state_rate,
        state_code=state_code,
        social_security=round(social_security, 2),
        medicare=round(medicare, 2),
        total_tax=round(total_tax, 2),
        net_commission=round(net_commission, 2)
    )


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/settings", response_model=CommissionSettingsResponse)
def get_commission_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's commission settings"""
    settings = get_or_create_settings(db, current_user.userid)
    return settings


@router.put("/settings", response_model=CommissionSettingsResponse)
def update_commission_settings(
    settings_update: CommissionSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's commission settings"""
    settings = get_or_create_settings(db, current_user.userid)
    
    update_data = settings_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/rates", response_model=RateTableResponse)
def get_rate_tables(
    current_user: User = Depends(get_current_user)
):
    """Get commission rate tables"""
    regular_rates = [
        RateTier(
            min_internet=tier["min"],
            max_internet=tier["max"],
            internet_rate=tier["internet"],
            mobile_rate=tier["mobile"],
            voice_rate=tier["voice"],
            video_rate=tier["video"],
            mrr_rate=tier["mrr"]
        )
        for tier in REGULAR_RATE_TABLE
    ]
    
    new_hire_rates = [
        RateTier(
            min_internet=tier["min"],
            max_internet=tier["max"],
            internet_rate=tier["internet"],
            mobile_rate=tier["mobile"],
            voice_rate=tier["voice"],
            video_rate=tier["video"],
            mrr_rate=tier["mrr"]
        )
        for tier in NEW_HIRE_RATE_TABLE
    ]
    
    return RateTableResponse(
        regular_rates=regular_rates,
        new_hire_rates=new_hire_rates,
        alacarte_rates=ALACARTE_RATES,
        ramp_table=RAMP_TABLE
    )


@router.get("/auto-totals", response_model=AutoTotalsResponse)
def get_auto_totals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get auto-aggregated product counts from orders for current fiscal month.
    
    Fiscal month: 28th 6pm of prev month → 28th 6pm of current month
    """
    settings = get_or_create_settings(db, current_user.userid)
    
    # Get current fiscal month boundaries
    today = date.today()
    start_dt, end_dt, label = get_fiscal_month_boundaries(today)
    
    # Query all orders for this user (we'll filter by fiscal month in Python)
    all_orders = db.query(Order).filter(
        Order.userid == current_user.userid
    ).all()
    
    # Filter orders that fall within the fiscal month
    eligible_orders = [o for o in all_orders if is_order_in_fiscal_month(o, start_dt, end_dt)]
    
    # Auto-calculate totals
    auto_internet = sum(1 for o in eligible_orders if o.has_internet)
    auto_mobile = sum(o.has_mobile or 0 for o in eligible_orders)
    auto_voice = sum(o.has_voice or 0 for o in eligible_orders)
    auto_video = sum(1 for o in eligible_orders if o.has_tv)
    auto_mrr = sum(o.monthly_total or 0 for o in eligible_orders)
    auto_wib = sum(1 for o in eligible_orders if o.has_wib)
    auto_gig_internet = sum(1 for o in eligible_orders if o.has_gig)
    auto_sbc = sum(o.has_sbc or 0 for o in eligible_orders)
    
    # Get overrides
    overrides = settings.value_overrides or {}
    
    # Determine effective values (use override if set, otherwise auto)
    def get_effective(key: str, auto_val):
        if key in overrides:
            return overrides[key]
        return auto_val
    
    # Track which values are overridden
    override_flags = {
        "internet": "internet" in overrides,
        "mobile": "mobile" in overrides,
        "voice": "voice" in overrides,
        "video": "video" in overrides,
        "mrr": "mrr" in overrides,
        "wib": "wib" in overrides,
        "gig_internet": "gig_internet" in overrides,
        "sbc": "sbc" in overrides,
    }
    
    return AutoTotalsResponse(
        auto_internet=auto_internet,
        auto_mobile=auto_mobile,
        auto_voice=auto_voice,
        auto_video=auto_video,
        auto_mrr=auto_mrr,
        auto_wib=auto_wib,
        auto_gig_internet=auto_gig_internet,
        auto_sbc=auto_sbc,
        internet=get_effective("internet", auto_internet),
        mobile=get_effective("mobile", auto_mobile),
        voice=get_effective("voice", auto_voice),
        video=get_effective("video", auto_video),
        mrr=get_effective("mrr", auto_mrr),
        wib=get_effective("wib", auto_wib),
        gig_internet=get_effective("gig_internet", auto_gig_internet),
        sbc=get_effective("sbc", auto_sbc),
        overrides=override_flags
    )


@router.put("/overrides")
def update_value_overrides(
    overrides: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's value overrides for auto-calculated totals"""
    settings = get_or_create_settings(db, current_user.userid)
    
    # Merge with existing overrides
    current_overrides = settings.value_overrides or {}
    
    for key, value in overrides.items():
        if value is None:
            # Remove override if set to None
            current_overrides.pop(key, None)
        else:
            current_overrides[key] = value
    
    settings.value_overrides = current_overrides if current_overrides else None
    db.commit()
    
    return {"message": "Overrides updated", "overrides": settings.value_overrides}


@router.delete("/overrides")
def clear_value_overrides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all value overrides (reset to auto-calculated values)"""
    settings = get_or_create_settings(db, current_user.userid)
    settings.value_overrides = None
    db.commit()
    
    return {"message": "All overrides cleared"}


@router.get("/earnings", response_model=EarningsResponse)
def get_earnings(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate monthly commission earnings with breakdown.
    
    Fiscal month: 28th 6pm of prev month → 28th 6pm of current month
    """
    settings = get_or_create_settings(db, current_user.userid)
    
    # Get current fiscal month boundaries
    today = date.today()
    start_dt, end_dt, period_label = get_fiscal_month_boundaries(today)
    
    # Get previous fiscal month for comparison
    prev_start_dt, prev_end_dt, prev_label = get_previous_fiscal_month(start_dt, end_dt)
    
    # Query all orders for this user
    all_orders = db.query(Order).filter(
        Order.userid == current_user.userid
    ).all()
    
    # Filter orders that fall within the current fiscal month
    eligible_orders = [o for o in all_orders if is_order_in_fiscal_month(o, start_dt, end_dt)]
    
    # Total orders in this fiscal month
    total_orders_this_month = len(eligible_orders)
    
    # Get auto-totals or use overrides
    overrides = settings.value_overrides or {}
    
    # Calculate totals
    auto_internet = sum(1 for o in eligible_orders if o.has_internet)
    internet = overrides.get("internet", auto_internet)
    
    auto_mobile = sum(o.has_mobile or 0 for o in eligible_orders)
    mobile = overrides.get("mobile", auto_mobile)
    
    auto_voice = sum(o.has_voice or 0 for o in eligible_orders)
    voice = overrides.get("voice", auto_voice)
    
    auto_video = sum(1 for o in eligible_orders if o.has_tv)
    video = overrides.get("video", auto_video)
    
    auto_mrr = sum(o.monthly_total or 0 for o in eligible_orders)
    mrr = overrides.get("mrr", auto_mrr)
    
    auto_wib = sum(1 for o in eligible_orders if o.has_wib)
    wib = overrides.get("wib", auto_wib)
    
    auto_gig = sum(1 for o in eligible_orders if o.has_gig)
    gig_internet = overrides.get("gig_internet", auto_gig)
    
    auto_sbc = sum(o.has_sbc or 0 for o in eligible_orders)
    sbc = overrides.get("sbc", auto_sbc)
    
    # Get rates based on settings
    is_new_hire = settings.is_new_hire
    rates = get_effective_rates(internet, is_new_hire)
    
    # Calculate payouts
    internet_payout = internet * rates["internet"]
    mobile_payout = mobile * rates["mobile"]
    voice_payout = voice * rates["voice"]
    video_payout = video * rates["video"]
    mrr_payout = mrr * rates["mrr"]
    
    psu_total = internet_payout + mobile_payout + voice_payout + video_payout
    
    # A-la-carte (requires >4 internet)
    alacarte_eligible = internet > 4
    wib_payout = wib * ALACARTE_RATES["wib"] if alacarte_eligible else 0
    gig_payout = gig_internet * ALACARTE_RATES["gig_internet"] if alacarte_eligible else 0
    sbc_payout = sbc * ALACARTE_RATES["addl_sbc_seats"] if alacarte_eligible else 0
    alacarte_total = wib_payout + gig_payout + sbc_payout
    
    # Ramp amount for new hires
    ramp_amount = 0
    if is_new_hire and settings.new_hire_month:
        ramp_amount = RAMP_TABLE.get(settings.new_hire_month, 0)
    
    # Sr. AE bonus: 15% if Sr AE with 12+ Internet OR 12+ lines
    total_lines = mobile + voice + sbc
    sae_eligible = (
        settings.ae_type == "Sr Account Executive" and 
        (internet >= 12 or total_lines >= 12)
    )
    sae_bonus = psu_total * 0.15 if sae_eligible else 0
    
    # Total commission
    total_commission = psu_total + mrr_payout + alacarte_total + ramp_amount + sae_bonus
    
    # Calculate last fiscal month's earnings for comparison
    last_month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, prev_start_dt, prev_end_dt)]
    
    # Simple calculation for last month (without overrides)
    lm_internet = sum(1 for o in last_month_orders if o.has_internet)
    lm_rates = get_effective_rates(lm_internet, is_new_hire)
    lm_internet_payout = lm_internet * lm_rates["internet"]
    lm_mobile_payout = sum(o.has_mobile or 0 for o in last_month_orders) * lm_rates["mobile"]
    lm_voice_payout = sum(o.has_voice or 0 for o in last_month_orders) * lm_rates["voice"]
    lm_video_payout = sum(1 for o in last_month_orders if o.has_tv) * lm_rates["video"]
    lm_mrr_payout = sum(o.monthly_total or 0 for o in last_month_orders) * lm_rates["mrr"]
    last_month_total = lm_internet_payout + lm_mobile_payout + lm_voice_payout + lm_video_payout + lm_mrr_payout
    
    # Month over month comparison
    mom_change = total_commission - last_month_total
    mom_percent = ((total_commission - last_month_total) / last_month_total * 100) if last_month_total > 0 else 0
    
    # Get current tier
    tier = get_rate_tier(internet, is_new_hire)
    tier_str = f"{tier['min']}-{tier['max']}" if tier['max'] else f"{tier['min']}+"
    
    # Build breakdown
    breakdown = [
        ProductBreakdown(product="Internet", count=internet, rate=rates["internet"], payout=internet_payout),
        ProductBreakdown(product="Mobile", count=mobile, rate=rates["mobile"], payout=mobile_payout),
        ProductBreakdown(product="Voice", count=voice, rate=rates["voice"], payout=voice_payout),
        ProductBreakdown(product="Video", count=video, rate=rates["video"], payout=video_payout),
        ProductBreakdown(product="MRR", count=1, rate=rates["mrr"], payout=mrr_payout),
    ]
    
    if alacarte_eligible:
        if wib > 0:
            breakdown.append(ProductBreakdown(product="WIB", count=wib, rate=ALACARTE_RATES["wib"], payout=wib_payout))
        if gig_internet > 0:
            breakdown.append(ProductBreakdown(product="Gig Internet", count=gig_internet, rate=ALACARTE_RATES["gig_internet"], payout=gig_payout))
        if sbc > 0:
            breakdown.append(ProductBreakdown(product="SBC Seats", count=sbc, rate=ALACARTE_RATES["addl_sbc_seats"], payout=sbc_payout))
    
    # Period string (fiscal month label)
    period = period_label
    
    # Calculate tax breakdown
    tax_breakdown = calculate_tax_breakdown(total_commission, settings)
    
    # Disable caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    
    return EarningsResponse(
        period=period,
        period_start=start_dt.date(),
        period_end=end_dt.date(),
        total_commission=total_commission,
        psu_total=psu_total,
        mrr_payout=mrr_payout,
        alacarte_total=alacarte_total,
        ramp_amount=ramp_amount,
        sae_bonus=sae_bonus,
        breakdown=breakdown,
        last_month_total=last_month_total,
        month_over_month_change=mom_change,
        month_over_month_percent=mom_percent,
        eligible_orders=len(eligible_orders),
        total_orders_this_month=total_orders_this_month,
        current_tier=tier_str,
        sae_eligible=sae_eligible,
        tax_breakdown=tax_breakdown
    )


@router.get("/order/{order_id}/estimate", response_model=OrderCommissionEstimate)
def get_order_commission_estimate(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get estimated commission for a specific order"""
    # Get the order
    order = db.query(Order).filter(
        and_(
            Order.orderid == order_id,
            Order.userid == current_user.userid
        )
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Get user's settings
    settings = get_or_create_settings(db, current_user.userid)
    
    # Get current fiscal month to determine tier
    today = date.today()
    start_dt, end_dt, _ = get_fiscal_month_boundaries(today)
    
    all_orders = db.query(Order).filter(
        Order.userid == current_user.userid
    ).all()
    
    eligible_orders = [o for o in all_orders if is_order_in_fiscal_month(o, start_dt, end_dt)]
    
    overrides = settings.value_overrides or {}
    auto_internet = sum(1 for o in eligible_orders if o.has_internet)
    internet_count = overrides.get("internet", auto_internet)
    
    # Get rates
    rates = get_effective_rates(internet_count, settings.is_new_hire)
    alacarte_eligible = internet_count > 4
    
    # Calculate commission for this order
    commission = calculate_order_commission(order, rates, alacarte_eligible)
    
    return OrderCommissionEstimate(
        order_id=order_id,
        **commission
    )


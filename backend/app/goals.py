from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, date
from calendar import monthrange
from .database import get_db
from .models import SalesGoal, Order, User
from .schemas import (
    SalesGoalResponse, SalesGoalUpdate,
    GoalProgressResponse, GoalProgressItem,
    GoalHistoryResponse, GoalHistoryItem
)
from .auth import get_current_user
from .commission import get_fiscal_month_boundaries, is_order_in_fiscal_month

router = APIRouter()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_fiscal_month_info(reference_date: date) -> tuple:
    """Get fiscal month year, month, and label for a given date.
    
    Returns (year, month, label) for the fiscal month that encompasses the reference_date.
    """
    start_dt, end_dt, label = get_fiscal_month_boundaries(reference_date)
    # The fiscal month is named after the end date's month
    return end_dt.year, end_dt.month, label


def get_goal_for_period(db: Session, user_id: int, year: int, month: int) -> SalesGoal:
    """Get or create a goal for a specific period."""
    goal = db.query(SalesGoal).filter(
        and_(
            SalesGoal.user_id == user_id,
            SalesGoal.year == year,
            SalesGoal.month == month
        )
    ).first()
    
    if not goal:
        goal = SalesGoal(
            user_id=user_id,
            year=year,
            month=month
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
    
    return goal


def calculate_progress_item(target: int, current: int, days_elapsed: int, days_total: int) -> GoalProgressItem:
    """Calculate progress metrics for a single goal."""
    if target <= 0:
        return None
    
    percentage = min((current / target) * 100, 100) if target > 0 else 0
    
    # Calculate projected total at current pace
    if days_elapsed > 0:
        daily_rate = current / days_elapsed
        projected = int(daily_rate * days_total)
    else:
        projected = 0
    
    # Determine expected progress at this point in the month
    expected_progress = (days_elapsed / days_total) * target if days_total > 0 else 0
    
    # Determine status based on how far behind/ahead
    if current >= target:
        status = 'green'
        on_track = True
    elif current >= expected_progress * 0.85:  # Within 15% of expected
        status = 'green'
        on_track = True
    elif current >= expected_progress * 0.70:  # 15-30% behind
        status = 'yellow'
        on_track = False
    else:  # More than 30% behind
        status = 'red'
        on_track = False
    
    return GoalProgressItem(
        target=target,
        current=current,
        percentage=round(percentage, 1),
        projected=projected,
        status=status,
        on_track=on_track
    )


def get_orders_in_fiscal_month(db: Session, user_id: int, start_dt: datetime, end_dt: datetime) -> list:
    """Get all orders for a user within a fiscal month."""
    all_orders = db.query(Order).filter(Order.userid == user_id).all()
    return [o for o in all_orders if is_order_in_fiscal_month(o, start_dt, end_dt)]


def calculate_psu_from_order(order) -> int:
    """Calculate PSU (Primary Service Units) from a single order.
    
    PSU = 1 per product category (not per unit quantity):
    - Internet = 1 PSU (if has_internet is True)
    - Voice = 1 PSU (if has_voice > 0, regardless of line count)
    - Mobile = 1 PSU (if has_mobile > 0, regardless of line count)
    - TV = 1 PSU (if has_tv is True)
    - SBC = 1 PSU (if has_sbc > 0, regardless of seat count)
    
    WIB does NOT count as PSU (a-la-carte bonus only)
    """
    psu = 0
    if order.has_internet:
        psu += 1
    if order.has_voice and order.has_voice > 0:
        psu += 1
    if order.has_mobile and order.has_mobile > 0:
        psu += 1
    if order.has_tv:
        psu += 1
    if order.has_sbc and order.has_sbc > 0:
        psu += 1
    return psu


def calculate_order_metrics(orders: list) -> dict:
    """Calculate metrics from a list of orders including PSU count."""
    # Calculate total PSU across all orders
    total_psu = sum(calculate_psu_from_order(o) for o in orders)
    
    return {
        'psu': total_psu,
        'revenue': sum(o.monthly_total or 0 for o in orders),
        'internet': sum(1 for o in orders if o.has_internet),
        'mobile': sum(1 for o in orders if o.has_mobile and o.has_mobile > 0),
        'voice': sum(1 for o in orders if o.has_voice and o.has_voice > 0),
        'tv': sum(1 for o in orders if o.has_tv),
        'sbc': sum(1 for o in orders if o.has_sbc and o.has_sbc > 0),
        'wib': sum(1 for o in orders if o.has_wib)
    }


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("", response_model=SalesGoalResponse)
def get_current_goal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current month's goal (creates empty one if doesn't exist)."""
    today = date.today()
    year, month, _ = get_fiscal_month_info(today)
    goal = get_goal_for_period(db, current_user.userid, year, month)
    return goal


@router.put("", response_model=SalesGoalResponse)
def update_goal(
    goal_update: SalesGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current month's goal."""
    today = date.today()
    year, month, _ = get_fiscal_month_info(today)
    goal = get_goal_for_period(db, current_user.userid, year, month)
    
    update_data = goal_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(goal, key, value)
    
    goal.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/progress", response_model=GoalProgressResponse)
def get_goal_progress(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current goal progress with pace calculations."""
    today = date.today()
    year, month, period_label = get_fiscal_month_info(today)
    start_dt, end_dt, _ = get_fiscal_month_boundaries(today)
    
    # Calculate days in fiscal month
    now = datetime.now()
    days_elapsed = max(1, (now - start_dt).days)  # At least 1 to avoid division by zero
    days_total = (end_dt - start_dt).days
    days_remaining = max(0, (end_dt - now).days)
    
    # Get goal
    goal = db.query(SalesGoal).filter(
        and_(
            SalesGoal.user_id == current_user.userid,
            SalesGoal.year == year,
            SalesGoal.month == month
        )
    ).first()
    
    # Check if user has any targets set
    has_goal = goal is not None and any([
        goal.target_psu,
        goal.target_revenue,
        goal.target_internet,
        goal.target_mobile,
        goal.target_tv,
        goal.target_voice,
        goal.target_sbc,
        goal.target_wib
    ])
    
    if not has_goal:
        return GoalProgressResponse(
            period=period_label,
            year=year,
            month=month,
            days_elapsed=days_elapsed,
            days_remaining=days_remaining,
            days_total=days_total,
            has_goal=False,
            overall_status='none',
            goal_achieved=False
        )
    
    # Get current metrics
    orders = get_orders_in_fiscal_month(db, current_user.userid, start_dt, end_dt)
    metrics = calculate_order_metrics(orders)
    
    # Calculate progress for each target
    psu_progress = None
    revenue_progress = None
    internet_progress = None
    mobile_progress = None
    tv_progress = None
    voice_progress = None
    sbc_progress = None
    wib_progress = None
    
    if goal.target_psu:
        psu_progress = calculate_progress_item(
            goal.target_psu, metrics['psu'], days_elapsed, days_total
        )
    
    if goal.target_revenue:
        revenue_progress = calculate_progress_item(
            int(goal.target_revenue), int(metrics['revenue']), days_elapsed, days_total
        )
    
    if goal.target_internet:
        internet_progress = calculate_progress_item(
            goal.target_internet, metrics['internet'], days_elapsed, days_total
        )
    
    if goal.target_mobile:
        mobile_progress = calculate_progress_item(
            goal.target_mobile, metrics['mobile'], days_elapsed, days_total
        )
    
    if goal.target_tv:
        tv_progress = calculate_progress_item(
            goal.target_tv, metrics['tv'], days_elapsed, days_total
        )
    
    if goal.target_voice:
        voice_progress = calculate_progress_item(
            goal.target_voice, metrics['voice'], days_elapsed, days_total
        )
    
    if goal.target_sbc:
        sbc_progress = calculate_progress_item(
            goal.target_sbc, metrics['sbc'], days_elapsed, days_total
        )
    
    if goal.target_wib:
        wib_progress = calculate_progress_item(
            goal.target_wib, metrics['wib'], days_elapsed, days_total
        )
    
    # Calculate overall status
    progress_items = [p for p in [psu_progress, revenue_progress, internet_progress, mobile_progress, tv_progress, voice_progress, sbc_progress, wib_progress] if p]
    
    if not progress_items:
        overall_status = 'none'
        goal_achieved = False
    else:
        # Overall is the worst status
        statuses = [p.status for p in progress_items]
        if 'red' in statuses:
            overall_status = 'red'
        elif 'yellow' in statuses:
            overall_status = 'yellow'
        else:
            overall_status = 'green'
        
        # Goal achieved if all targets are met
        goal_achieved = all(p.current >= p.target for p in progress_items)
    
    # Disable caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    
    return GoalProgressResponse(
        period=period_label,
        year=year,
        month=month,
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        days_total=days_total,
        has_goal=True,
        psu=psu_progress,
        revenue=revenue_progress,
        internet=internet_progress,
        mobile=mobile_progress,
        tv=tv_progress,
        voice=voice_progress,
        sbc=sbc_progress,
        wib=wib_progress,
        overall_status=overall_status,
        goal_achieved=goal_achieved
    )


@router.get("/history", response_model=GoalHistoryResponse)
def get_goal_history(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get historical goal achievement for the last N months."""
    today = date.today()
    history = []
    goals_achieved = 0
    months_with_goals = 0
    
    # Get current fiscal month info
    current_year, current_month, _ = get_fiscal_month_info(today)
    
    # Iterate through past months
    for i in range(1, months + 1):
        # Calculate the target month (going backwards)
        target_month = current_month - i
        target_year = current_year
        
        while target_month <= 0:
            target_month += 12
            target_year -= 1
        
        # Create a reference date for that fiscal month
        ref_date = date(target_year, target_month, 15)  # Middle of month
        start_dt, end_dt, period_label = get_fiscal_month_boundaries(ref_date)
        
        # Get goal for this month
        goal = db.query(SalesGoal).filter(
            and_(
                SalesGoal.user_id == current_user.userid,
                SalesGoal.year == target_year,
                SalesGoal.month == target_month
            )
        ).first()
        
        had_goal = goal is not None and any([
            goal.target_psu if goal else None,
            goal.target_revenue if goal else None,
            goal.target_internet if goal else None,
            goal.target_mobile if goal else None,
            goal.target_tv if goal else None,
            goal.target_voice if goal else None,
            goal.target_sbc if goal else None,
            goal.target_wib if goal else None
        ])
        
        if had_goal:
            months_with_goals += 1
            
            # Get actual metrics for this month
            orders = get_orders_in_fiscal_month(db, current_user.userid, start_dt, end_dt)
            metrics = calculate_order_metrics(orders)
            
            # Check if goal was achieved
            achieved = True
            if goal.target_psu and metrics['psu'] < goal.target_psu:
                achieved = False
            if goal.target_revenue and metrics['revenue'] < goal.target_revenue:
                achieved = False
            if goal.target_internet and metrics['internet'] < goal.target_internet:
                achieved = False
            if goal.target_mobile and metrics['mobile'] < goal.target_mobile:
                achieved = False
            if goal.target_tv and metrics['tv'] < goal.target_tv:
                achieved = False
            if goal.target_voice and metrics['voice'] < goal.target_voice:
                achieved = False
            if goal.target_sbc and metrics['sbc'] < goal.target_sbc:
                achieved = False
            if goal.target_wib and metrics['wib'] < goal.target_wib:
                achieved = False
            
            if achieved:
                goals_achieved += 1
            
            history.append(GoalHistoryItem(
                year=target_year,
                month=target_month,
                period=period_label,
                had_goal=True,
                achieved=achieved,
                psu_target=goal.target_psu,
                psu_actual=metrics['psu'],
                revenue_target=goal.target_revenue,
                revenue_actual=metrics['revenue'],
                internet_target=goal.target_internet,
                internet_actual=metrics['internet'],
                mobile_target=goal.target_mobile,
                mobile_actual=metrics['mobile'],
                tv_target=goal.target_tv,
                tv_actual=metrics['tv'],
                voice_target=goal.target_voice,
                voice_actual=metrics['voice'],
                sbc_target=goal.target_sbc,
                sbc_actual=metrics['sbc'],
                wib_target=goal.target_wib,
                wib_actual=metrics['wib']
            ))
        else:
            history.append(GoalHistoryItem(
                year=target_year,
                month=target_month,
                period=period_label,
                had_goal=False,
                achieved=False
            ))
    
    achievement_rate = (goals_achieved / months_with_goals * 100) if months_with_goals > 0 else 0
    
    return GoalHistoryResponse(
        total_months=months,
        months_with_goals=months_with_goals,
        goals_achieved=goals_achieved,
        achievement_rate=round(achievement_rate, 1),
        history=history
    )


@router.delete("")
def clear_goal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear current month's goal (sets all targets to null)."""
    today = date.today()
    year, month, _ = get_fiscal_month_info(today)
    
    goal = db.query(SalesGoal).filter(
        and_(
            SalesGoal.user_id == current_user.userid,
            SalesGoal.year == year,
            SalesGoal.month == month
        )
    ).first()
    
    if goal:
        goal.target_psu = None
        goal.target_revenue = None
        goal.target_internet = None
        goal.target_mobile = None
        goal.target_tv = None
        goal.target_voice = None
        goal.target_sbc = None
        goal.target_wib = None
        goal.updated_at = datetime.utcnow()
        db.commit()
    
    return {"message": "Goal cleared"}


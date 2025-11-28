from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import Response, StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, or_
from typing import List, Optional
from datetime import datetime, timedelta, date
import io
from .database import get_db
from .models import Order, User, Notification, DeletedOrder, IdempotencyKey
from .schemas import (
    OrderCreate, OrderUpdate, OrderResponse, OrderStats, PaginatedOrderResponse, PaginationMeta,
    PerformanceInsightsResponse, PerformanceComparison, PeriodMetrics, TrendDataPoint, PersonalRecord
)
from .auth import get_current_user, verify_recaptcha
from .export_utils import generate_excel, generate_csv, generate_stats_excel, ALL_COLUMNS
from .email_service import send_export_email
from .notification_service import send_order_details_email
from . import audit_service
from .pdf_extractor import extract_order_from_pdf, validate_pdf
from .commission import get_fiscal_month_boundaries, get_previous_fiscal_month, is_order_in_fiscal_month
from .utils import calculate_psu_from_order
from pydantic import BaseModel

router = APIRouter()

# Maximum file size for PDF upload (10MB)
MAX_PDF_SIZE = 10 * 1024 * 1024


def check_idempotency_key(db: Session, key: str, user_id: int, operation: str) -> Optional[dict]:
    """Check if an idempotency key has been used before.
    
    Returns the cached response if the key was used, None otherwise.
    Keys expire after 24 hours.
    """
    if not key:
        return None
    
    # Look up the key (only for this user and operation)
    existing = db.query(IdempotencyKey).filter(
        IdempotencyKey.key == key,
        IdempotencyKey.user_id == user_id,
        IdempotencyKey.operation == operation,
        IdempotencyKey.created_at > datetime.utcnow() - timedelta(hours=24)  # Key still valid
    ).first()
    
    if existing:
        return {
            "status_code": existing.response_status,
            "response": existing.response_body,
            "idempotent_response": True
        }
    return None


def save_idempotency_key(db: Session, key: str, user_id: int, operation: str, status_code: int, response: dict):
    """Save an idempotency key with its response for future lookups."""
    if not key:
        return
    
    idempotency_record = IdempotencyKey(
        key=key,
        user_id=user_id,
        operation=operation,
        response_status=status_code,
        response_body=response
    )
    db.add(idempotency_record)
    # Don't commit here - let the caller's transaction handle it


def build_filtered_orders_query(
    db: Session,
    user_id: int,
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    product_types: Optional[str] = None,
    install_status: Optional[str] = None
):
    """
    Build a filtered query for orders based on common filter parameters.
    
    This helper function is used by get_orders, export endpoints, and email_export
    to avoid duplicating filter logic.
    
    Args:
        db: Database session
        user_id: The user ID to filter orders by
        search: Search term for customer name, account number, spectrum reference, or business name
        date_from: Filter orders with install_date >= date_from
        date_to: Filter orders with install_date <= date_to
        product_types: Comma-separated product types (internet, tv, mobile, voice, wib, sbc)
        install_status: Comma-separated install statuses (installed, pending, today)
    
    Returns:
        SQLAlchemy query object with applied filters
    """
    query = db.query(Order).filter(Order.userid == user_id)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Order.customer_name.ilike(search_term),
                Order.customer_account_number.ilike(search_term),
                Order.spectrum_reference.ilike(search_term),
                Order.business_name.ilike(search_term)
            )
        )

    # Date range filter
    if date_from:
        query = query.filter(Order.install_date >= date_from)
    if date_to:
        query = query.filter(Order.install_date <= date_to)

    # Product type filter
    if product_types:
        product_list = [p.strip().lower() for p in product_types.split(',')]
        product_conditions = []

        if 'internet' in product_list:
            product_conditions.append(Order.has_internet == True)
        if 'tv' in product_list:
            product_conditions.append(Order.has_tv == True)
        if 'mobile' in product_list:
            product_conditions.append(Order.has_mobile > 0)
        if 'voice' in product_list:
            product_conditions.append(Order.has_voice > 0)
        if 'wib' in product_list:
            product_conditions.append(Order.has_wib == True)
        if 'sbc' in product_list:
            product_conditions.append(Order.has_sbc > 0)

        if product_conditions:
            query = query.filter(or_(*product_conditions))

    # Install status filter
    if install_status:
        today = date.today()
        status_list = [s.strip().lower() for s in install_status.split(',')]
        status_conditions = []

        if 'installed' in status_list:
            status_conditions.append(Order.install_date < today)
        if 'today' in status_list:
            status_conditions.append(Order.install_date == today)
        if 'pending' in status_list:
            status_conditions.append(Order.install_date > today)

        if status_conditions:
            query = query.filter(or_(*status_conditions))

    return query


@router.post("/extract-pdf")
async def extract_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Extract order data from an uploaded Spectrum Business PDF.
    Returns extracted fields that can be used to populate an order form.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a PDF"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum limit of {MAX_PDF_SIZE // (1024 * 1024)}MB"
        )
    
    # Validate PDF magic bytes
    if not validate_pdf(content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF file"
        )
    
    try:
        # Extract data from PDF
        extracted_data = extract_order_from_pdf(content)
        
        return {
            "success": True,
            "message": "PDF extracted successfully",
            "data": extracted_data
        }
    except Exception as e:
        # Log detailed error server-side for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"PDF extraction failed for user {current_user.userid}: {str(e)}", exc_info=True)
        
        # Return generic error message to client (don't expose internal details)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract data from PDF. Please ensure the file is a valid Spectrum Business order confirmation."
        )


class EmailExportRequest(BaseModel):
    file_format: str  # 'excel' or 'csv'
    recaptcha_token: str  # Required for verification
    columns: Optional[str] = None
    search: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    product_types: Optional[str] = None
    install_status: Optional[str] = None

class BulkMarkInstalledRequest(BaseModel):
    order_ids: List[int]
    idempotency_key: Optional[str] = None  # Client-generated key to prevent duplicate operations

class BulkRescheduleRequest(BaseModel):
    order_ids: List[int]
    new_date: date
    idempotency_key: Optional[str] = None  # Client-generated key to prevent duplicate operations

class BulkDeleteRequest(BaseModel):
    order_ids: List[int]
    idempotency_key: Optional[str] = None  # Client-generated key to prevent duplicate operations

class DeltaSyncResponse(BaseModel):
    updated_orders: List[OrderResponse]
    deleted_order_ids: List[int]
    sync_timestamp: datetime

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new order for the current user"""
    db_order = Order(
        userid=current_user.userid,
        created_by=current_user.userid,
        **order.model_dump()
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    # Log order creation to audit trail
    audit_service.log_order_creation(
        db=db,
        order=db_order,
        user=current_user,
        ip_address=None,
        reason="Order created"
    )

    return db_order

@router.get("/", response_model=PaginatedOrderResponse)
def get_orders(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by customer name, account number, or spectrum reference"),
    date_from: Optional[date] = Query(None, description="Filter by install date from"),
    date_to: Optional[date] = Query(None, description="Filter by install date to"),
    product_types: Optional[str] = Query(None, description="Comma-separated product types: internet,tv,mobile,voice,wib,sbc"),
    install_status: Optional[str] = Query(None, description="Filter by install status: installed,pending,today"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all orders for the current user with optional search and filters, including pagination metadata."""
    # Build filtered query using helper function
    query = build_filtered_orders_query(
        db=db,
        user_id=current_user.userid,
        search=search,
        date_from=date_from,
        date_to=date_to,
        product_types=product_types,
        install_status=install_status
    )

    # Get total count before pagination
    total = query.count()

    # Apply pagination
    orders = query.offset(skip).limit(limit).all()

    # Calculate has_more
    has_more = (skip + len(orders)) < total

    # Return paginated response with metadata
    return PaginatedOrderResponse(
        data=orders,
        meta=PaginationMeta(
            total=total,
            skip=skip,
            limit=limit,
            has_more=has_more
        )
    )

@router.get("/stats")
def get_order_stats(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get order statistics for the dashboard with caching"""
    user_id = current_user.userid

    # Total orders
    total_orders = db.query(func.count(Order.orderid)).filter(
        Order.userid == user_id
    ).scalar() or 0

    # This week
    today = date.today()
    week_ago = today - timedelta(days=7)
    this_week = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            Order.install_date >= week_ago
        )
    ).scalar() or 0

    # This month
    this_month = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            extract('month', Order.install_date) == today.month,
            extract('year', Order.install_date) == today.year
        )
    ).scalar() or 0

    # Pending installs (future dates)
    pending_installs = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            Order.install_date >= today
        )
    ).scalar() or 0

    # Product totals
    total_internet = db.query(func.count(Order.orderid)).filter(
        and_(Order.userid == user_id, Order.has_internet == True)
    ).scalar() or 0

    total_tv = db.query(func.count(Order.orderid)).filter(
        and_(Order.userid == user_id, Order.has_tv == True)
    ).scalar() or 0

    total_mobile = db.query(func.sum(Order.has_mobile)).filter(
        Order.userid == user_id
    ).scalar() or 0

    total_voice = db.query(func.sum(Order.has_voice)).filter(
        Order.userid == user_id
    ).scalar() or 0

    # Disable caching for real-time stats updates
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    return OrderStats(
        total_orders=total_orders,
        this_week=this_week,
        this_month=this_month,
        pending_installs=pending_installs,
        total_internet=total_internet,
        total_tv=total_tv,
        total_mobile=int(total_mobile),
        total_voice=int(total_voice)
    )

@router.get("/delta", response_model=DeltaSyncResponse)
def get_delta_sync(
    last_sync: datetime = Query(..., description="ISO 8601 datetime of last sync"),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get incremental updates since last sync - returns only orders created/updated after last_sync timestamp"""
    user_id = current_user.userid

    # Get all orders updated or created after last_sync timestamp
    updated_orders = db.query(Order).filter(
        and_(
            Order.userid == user_id,
            or_(
                Order.updated_at > last_sync,
                Order.created_at > last_sync
            )
        )
    ).all()

    # Get orders deleted since last sync from the deleted_orders table
    deleted_records = db.query(DeletedOrder).filter(
        and_(
            DeletedOrder.user_id == user_id,
            DeletedOrder.deleted_at > last_sync
        )
    ).all()
    deleted_order_ids = [record.order_id for record in deleted_records]

    # Current server timestamp for client to use in next sync
    current_timestamp = datetime.utcnow()

    # Don't cache delta sync responses
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    return DeltaSyncResponse(
        updated_orders=updated_orders,
        deleted_order_ids=deleted_order_ids,
        sync_timestamp=current_timestamp
    )


# ============================================================================
# PERFORMANCE INSIGHTS HELPERS
# ============================================================================

# calculate_psu_from_order is imported from utils.py

def calculate_metrics_from_orders(orders: list) -> PeriodMetrics:
    """Calculate all metrics from a list of orders."""
    return PeriodMetrics(
        orders=len(orders),
        internet=sum(1 for o in orders if o.has_internet),
        tv=sum(1 for o in orders if o.has_tv),
        mobile=sum(1 for o in orders if o.has_mobile and o.has_mobile > 0),
        voice=sum(1 for o in orders if o.has_voice and o.has_voice > 0),
        sbc=sum(1 for o in orders if o.has_sbc and o.has_sbc > 0),
        wib=sum(1 for o in orders if o.has_wib),
        psu=sum(calculate_psu_from_order(o) for o in orders),
        revenue=sum(o.monthly_total or 0 for o in orders)
    )


def calculate_change(current: float, previous: float) -> float:
    """Calculate percentage change, handling division by zero."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def get_week_boundaries(reference_date: date) -> tuple:
    """Get ISO week boundaries (Monday to Sunday) for a given date."""
    # Find Monday of this week
    days_since_monday = reference_date.weekday()
    week_start = reference_date - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=6)  # Sunday
    return week_start, week_end


def generate_insights(
    month_comparison: PerformanceComparison,
    week_comparison: PerformanceComparison,
    records: list,
    streak: int,
    streak_type: str
) -> list:
    """Generate smart text insights based on performance data."""
    insights = []
    
    # Month-over-month growth insight
    order_change = month_comparison.change_percent.get("orders", 0)
    if order_change > 20:
        insights.append(f"Exceptional month! You're up {order_change:.0f}% in orders vs last month.")
    elif order_change > 10:
        insights.append(f"Strong performance! Orders are up {order_change:.0f}% vs last month.")
    elif order_change > 0:
        insights.append(f"Steady growth - orders up {order_change:.0f}% vs last month.")
    elif order_change < -10:
        insights.append(f"Orders are down {abs(order_change):.0f}% vs last month. Time to push!")
    elif order_change < 0:
        insights.append(f"Slight dip in orders ({order_change:.0f}%). You've got this!")
    
    # Streak insight
    if streak >= 3 and streak_type == "growth":
        insights.append(f"You're on a {streak}-month growth streak! Keep the momentum going.")
    elif streak == 2 and streak_type == "growth":
        insights.append("Two months of consecutive growth - you're building momentum!")
    
    # Personal record insight
    current_records = [r for r in records if r.is_current_period]
    if current_records:
        record_names = [r.metric for r in current_records[:2]]
        if len(record_names) == 1:
            insights.append(f"New personal best in {record_names[0]}!")
        else:
            insights.append(f"Breaking records in {' and '.join(record_names)}!")
    
    # Product mix insights
    internet_change = month_comparison.change_percent.get("internet", 0)
    mobile_change = month_comparison.change_percent.get("mobile", 0)
    
    if internet_change < -5 and mobile_change > 10:
        insights.append(f"Internet is down {abs(internet_change):.0f}%, but mobile is compensating with +{mobile_change:.0f}%.")
    elif internet_change > 15:
        insights.append(f"Internet sales are crushing it with +{internet_change:.0f}% growth!")
    
    # Week performance insight
    week_order_change = week_comparison.change_percent.get("orders", 0)
    if week_order_change > 50:
        insights.append("This week is on fire! Way ahead of last week's pace.")
    elif week_order_change < -30:
        insights.append("Slower week so far. Time to pick up the pace!")
    
    # Limit to 4 insights max
    return insights[:4]


@router.get("/performance-insights", response_model=PerformanceInsightsResponse)
def get_performance_insights(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive performance insights with comparisons and trends."""
    user_id = current_user.userid
    today = date.today()
    
    # Get all user orders for analysis
    all_orders = db.query(Order).filter(Order.userid == user_id).all()
    
    # ========== MONTH COMPARISON ==========
    # Current fiscal month
    curr_start, curr_end, curr_label = get_fiscal_month_boundaries(today)
    curr_month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, curr_start, curr_end)]
    curr_month_metrics = calculate_metrics_from_orders(curr_month_orders)
    
    # Previous fiscal month
    prev_start, prev_end, prev_label = get_previous_fiscal_month(curr_start, curr_end)
    prev_month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, prev_start, prev_end)]
    prev_month_metrics = calculate_metrics_from_orders(prev_month_orders)
    
    # Calculate month changes
    month_change_percent = {
        "orders": calculate_change(curr_month_metrics.orders, prev_month_metrics.orders),
        "internet": calculate_change(curr_month_metrics.internet, prev_month_metrics.internet),
        "tv": calculate_change(curr_month_metrics.tv, prev_month_metrics.tv),
        "mobile": calculate_change(curr_month_metrics.mobile, prev_month_metrics.mobile),
        "voice": calculate_change(curr_month_metrics.voice, prev_month_metrics.voice),
        "psu": calculate_change(curr_month_metrics.psu, prev_month_metrics.psu),
        "revenue": calculate_change(curr_month_metrics.revenue, prev_month_metrics.revenue),
    }
    month_change_absolute = {
        "orders": curr_month_metrics.orders - prev_month_metrics.orders,
        "internet": curr_month_metrics.internet - prev_month_metrics.internet,
        "tv": curr_month_metrics.tv - prev_month_metrics.tv,
        "mobile": curr_month_metrics.mobile - prev_month_metrics.mobile,
        "voice": curr_month_metrics.voice - prev_month_metrics.voice,
        "psu": curr_month_metrics.psu - prev_month_metrics.psu,
        "revenue": curr_month_metrics.revenue - prev_month_metrics.revenue,
    }
    
    month_comparison = PerformanceComparison(
        current=curr_month_metrics,
        previous=prev_month_metrics,
        change_percent=month_change_percent,
        change_absolute=month_change_absolute
    )
    
    # ========== WEEK COMPARISON ==========
    # Current week (Monday-Sunday)
    curr_week_start, curr_week_end = get_week_boundaries(today)
    curr_week_orders = [o for o in all_orders if curr_week_start <= o.install_date <= curr_week_end]
    curr_week_metrics = calculate_metrics_from_orders(curr_week_orders)
    
    # Previous week
    prev_week_start = curr_week_start - timedelta(days=7)
    prev_week_end = curr_week_end - timedelta(days=7)
    prev_week_orders = [o for o in all_orders if prev_week_start <= o.install_date <= prev_week_end]
    prev_week_metrics = calculate_metrics_from_orders(prev_week_orders)
    
    week_change_percent = {
        "orders": calculate_change(curr_week_metrics.orders, prev_week_metrics.orders),
        "internet": calculate_change(curr_week_metrics.internet, prev_week_metrics.internet),
        "tv": calculate_change(curr_week_metrics.tv, prev_week_metrics.tv),
        "mobile": calculate_change(curr_week_metrics.mobile, prev_week_metrics.mobile),
        "voice": calculate_change(curr_week_metrics.voice, prev_week_metrics.voice),
        "psu": calculate_change(curr_week_metrics.psu, prev_week_metrics.psu),
        "revenue": calculate_change(curr_week_metrics.revenue, prev_week_metrics.revenue),
    }
    week_change_absolute = {
        "orders": curr_week_metrics.orders - prev_week_metrics.orders,
        "internet": curr_week_metrics.internet - prev_week_metrics.internet,
        "tv": curr_week_metrics.tv - prev_week_metrics.tv,
        "mobile": curr_week_metrics.mobile - prev_week_metrics.mobile,
        "voice": curr_week_metrics.voice - prev_week_metrics.voice,
        "psu": curr_week_metrics.psu - prev_week_metrics.psu,
        "revenue": curr_week_metrics.revenue - prev_week_metrics.revenue,
    }
    
    week_comparison = PerformanceComparison(
        current=curr_week_metrics,
        previous=prev_week_metrics,
        change_percent=week_change_percent,
        change_absolute=week_change_absolute
    )
    
    # ========== MONTHLY TREND (Last 6 months) ==========
    monthly_trend = []
    temp_start, temp_end = curr_start, curr_end
    
    for i in range(6):
        if i > 0:
            temp_start, temp_end, _ = get_previous_fiscal_month(temp_start, temp_end)
        
        month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, temp_start, temp_end)]
        metrics = calculate_metrics_from_orders(month_orders)
        
        # Get the label from the end date's month
        period_label = temp_end.strftime("%b %Y")
        
        monthly_trend.append(TrendDataPoint(
            period=period_label,
            orders=metrics.orders,
            internet=metrics.internet,
            mobile=metrics.mobile,
            psu=metrics.psu,
            revenue=metrics.revenue
        ))
    
    # Reverse so oldest is first
    monthly_trend.reverse()
    
    # ========== WEEKLY TREND (Last 8 weeks) ==========
    weekly_trend = []
    
    for i in range(8):
        week_offset = i * 7
        week_start = curr_week_start - timedelta(days=week_offset)
        week_end = week_start + timedelta(days=6)
        
        week_orders = [o for o in all_orders if week_start <= o.install_date <= week_end]
        metrics = calculate_metrics_from_orders(week_orders)
        
        # Week number label
        week_num = week_start.isocalendar()[1]
        period_label = f"Week {week_num}"
        
        weekly_trend.append(TrendDataPoint(
            period=period_label,
            orders=metrics.orders,
            internet=metrics.internet,
            mobile=metrics.mobile,
            psu=metrics.psu,
            revenue=metrics.revenue
        ))
    
    # Reverse so oldest is first
    weekly_trend.reverse()
    
    # ========== PERSONAL RECORDS ==========
    records = []
    
    # Find best month for orders, PSU, revenue
    best_orders_month = {"value": 0, "period": ""}
    best_psu_month = {"value": 0, "period": ""}
    best_revenue_month = {"value": 0.0, "period": ""}
    best_internet_month = {"value": 0, "period": ""}
    
    # Look at all monthly trends to find records
    temp_start, temp_end = curr_start, curr_end
    for i in range(12):  # Look back up to 12 months for records
        if i > 0:
            temp_start, temp_end, _ = get_previous_fiscal_month(temp_start, temp_end)
        
        month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, temp_start, temp_end)]
        metrics = calculate_metrics_from_orders(month_orders)
        period_label = temp_end.strftime("%B %Y")
        
        if metrics.orders > best_orders_month["value"]:
            best_orders_month = {"value": metrics.orders, "period": period_label}
        if metrics.psu > best_psu_month["value"]:
            best_psu_month = {"value": metrics.psu, "period": period_label}
        if metrics.revenue > best_revenue_month["value"]:
            best_revenue_month = {"value": metrics.revenue, "period": period_label}
        if metrics.internet > best_internet_month["value"]:
            best_internet_month = {"value": metrics.internet, "period": period_label}
    
    # Build records list
    if best_orders_month["value"] > 0:
        records.append(PersonalRecord(
            metric="Orders",
            value=best_orders_month["value"],
            period=best_orders_month["period"],
            is_current_period=(best_orders_month["period"] == curr_label or 
                               best_orders_month["value"] == curr_month_metrics.orders and curr_month_metrics.orders > 0)
        ))
    
    if best_psu_month["value"] > 0:
        records.append(PersonalRecord(
            metric="PSU",
            value=best_psu_month["value"],
            period=best_psu_month["period"],
            is_current_period=(best_psu_month["period"] == curr_label or
                               best_psu_month["value"] == curr_month_metrics.psu and curr_month_metrics.psu > 0)
        ))
    
    if best_revenue_month["value"] > 0:
        records.append(PersonalRecord(
            metric="Revenue",
            value=best_revenue_month["value"],
            period=best_revenue_month["period"],
            is_current_period=(best_revenue_month["period"] == curr_label or
                               best_revenue_month["value"] == curr_month_metrics.revenue and curr_month_metrics.revenue > 0)
        ))
    
    if best_internet_month["value"] > 0:
        records.append(PersonalRecord(
            metric="Internet",
            value=best_internet_month["value"],
            period=best_internet_month["period"],
            is_current_period=(best_internet_month["period"] == curr_label or
                               best_internet_month["value"] == curr_month_metrics.internet and curr_month_metrics.internet > 0)
        ))
    
    # ========== STREAK DETECTION ==========
    current_streak = 0
    streak_type = "none"
    
    # Look for consecutive months of growth/decline
    temp_start, temp_end = curr_start, curr_end
    prev_orders = curr_month_metrics.orders
    growth_streak = 0
    decline_streak = 0
    
    for i in range(1, 6):  # Check up to 5 previous months
        temp_start, temp_end, _ = get_previous_fiscal_month(temp_start, temp_end)
        month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, temp_start, temp_end)]
        month_count = len(month_orders)
        
        if i == 1:
            # Compare current to previous
            if curr_month_metrics.orders > month_count:
                growth_streak = 1
            elif curr_month_metrics.orders < month_count:
                decline_streak = 1
        else:
            # Continue checking streak
            if growth_streak > 0 and prev_orders > month_count:
                growth_streak += 1
            elif decline_streak > 0 and prev_orders < month_count:
                decline_streak += 1
            else:
                break
        
        prev_orders = month_count
    
    if growth_streak > 0:
        current_streak = growth_streak
        streak_type = "growth"
    elif decline_streak > 0:
        current_streak = decline_streak
        streak_type = "decline"
    
    # ========== GENERATE INSIGHTS ==========
    insights = generate_insights(
        month_comparison, week_comparison, records, current_streak, streak_type
    )
    
    # Add default insight if none generated
    if not insights:
        if curr_month_metrics.orders > 0:
            insights.append(f"You have {curr_month_metrics.orders} orders this month. Keep pushing!")
        else:
            insights.append("No orders yet this month. Time to make some sales!")
    
    # Disable caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    
    return PerformanceInsightsResponse(
        month_comparison=month_comparison,
        week_comparison=week_comparison,
        monthly_trend=monthly_trend,
        weekly_trend=weekly_trend,
        records=records,
        current_streak=current_streak,
        streak_type=streak_type,
        insights=insights
    )


class AIInsightsResponse(BaseModel):
    insights: List[str]
    remaining_today: int
    ai_enabled: bool
    resets_at: str  # ISO timestamp of next reset (midnight local)
    metrics: Optional[dict] = None  # Metrics used for generation (for tone regeneration)


class AIInsightsStatusResponse(BaseModel):
    remaining_today: int
    ai_enabled: bool
    resets_at: str  # ISO timestamp of next reset (midnight local)


class AIInsightsRequest(BaseModel):
    tone: str = "positive"  # "positive", "realistic", or "brutal"


class AIRegenerateToneRequest(BaseModel):
    tone: str = "positive"
    metrics: dict  # Pre-computed metrics from previous generation


def _get_reset_time() -> str:
    """Get ISO timestamp for next midnight (when AI credits reset)."""
    from datetime import datetime, timedelta
    tomorrow = date.today() + timedelta(days=1)
    midnight = datetime.combine(tomorrow, datetime.min.time())
    return midnight.isoformat()


@router.get("/performance-insights/ai-status", response_model=AIInsightsStatusResponse)
def get_ai_insights_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current AI insights usage status (remaining requests today)."""
    from .ai_insights import is_ai_configured
    
    reset_time = _get_reset_time()
    
    if not is_ai_configured():
        return AIInsightsStatusResponse(remaining_today=0, ai_enabled=False, resets_at=reset_time)
    
    today = date.today()
    
    # Reset count if it's a new day
    if current_user.ai_insights_reset_date != today:
        current_user.ai_insights_count = 0
        current_user.ai_insights_reset_date = today
        db.commit()
    
    remaining = 3 - current_user.ai_insights_count
    return AIInsightsStatusResponse(remaining_today=remaining, ai_enabled=True, resets_at=reset_time)


@router.post("/performance-insights/generate-ai", response_model=AIInsightsResponse)
async def generate_ai_insights_endpoint(
    request: AIInsightsRequest = AIInsightsRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate AI-powered performance insights using Groq's Llama model.
    Rate limited to 3 requests per day per user.
    Tone options: "positive" (encouraging), "realistic" (balanced), "brutal" (harsh truth)
    """
    from .ai_insights import generate_performance_insights, is_ai_configured
    
    # Validate tone
    valid_tones = ["positive", "realistic", "brutal"]
    tone = request.tone if request.tone in valid_tones else "positive"
    
    reset_time = _get_reset_time()
    
    # Check if AI is configured
    if not is_ai_configured():
        return AIInsightsResponse(
            insights=["AI insights not configured. Contact administrator."],
            remaining_today=0,
            ai_enabled=False,
            resets_at=reset_time
        )
    
    today = date.today()
    
    # Reset count if it's a new day
    if current_user.ai_insights_reset_date != today:
        current_user.ai_insights_count = 0
        current_user.ai_insights_reset_date = today
        db.commit()
    
    # Check rate limit (3 per day)
    if current_user.ai_insights_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily AI insights limit reached (3/day). Try again tomorrow."
        )
    
    # Get performance metrics for the AI
    user_id = current_user.userid
    
    # Current fiscal month
    curr_start, curr_end, curr_label = get_fiscal_month_boundaries(today)
    all_orders = db.query(Order).filter(Order.userid == user_id).all()
    curr_month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, curr_start, curr_end)]
    
    # Previous fiscal month
    prev_start, prev_end, prev_label = get_previous_fiscal_month(curr_start, curr_end)
    prev_month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, prev_start, prev_end)]
    
    # Calculate current metrics
    curr_orders = len(curr_month_orders)
    curr_revenue = sum(o.monthly_total or 0 for o in curr_month_orders)
    curr_psu = sum(calculate_psu_from_order(o) for o in curr_month_orders)
    curr_internet = sum(1 for o in curr_month_orders if o.has_internet)
    curr_mobile = sum(1 for o in curr_month_orders if o.has_mobile and o.has_mobile > 0)
    
    # Calculate previous metrics
    prev_orders = len(prev_month_orders)
    prev_revenue = sum(o.monthly_total or 0 for o in prev_month_orders)
    prev_internet = sum(1 for o in prev_month_orders if o.has_internet)
    prev_mobile = sum(1 for o in prev_month_orders if o.has_mobile and o.has_mobile > 0)
    
    # Calculate changes
    order_change = ((curr_orders - prev_orders) / prev_orders * 100) if prev_orders > 0 else (100 if curr_orders > 0 else 0)
    revenue_change = ((curr_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else (100 if curr_revenue > 0 else 0)
    internet_change = ((curr_internet - prev_internet) / prev_internet * 100) if prev_internet > 0 else (100 if curr_internet > 0 else 0)
    mobile_change = ((curr_mobile - prev_mobile) / prev_mobile * 100) if prev_mobile > 0 else (100 if curr_mobile > 0 else 0)
    
    # Find best month
    best_orders = 0
    best_period = "N/A"
    temp_start, temp_end = curr_start, curr_end
    for i in range(12):
        if i > 0:
            temp_start, temp_end, _ = get_previous_fiscal_month(temp_start, temp_end)
        month_orders = [o for o in all_orders if is_order_in_fiscal_month(o, temp_start, temp_end)]
        if len(month_orders) > best_orders:
            best_orders = len(month_orders)
            best_period = temp_end.strftime("%B %Y")
    
    # Detect streak
    streak = 0
    streak_type = "none"
    temp_start, temp_end = curr_start, curr_end
    prev_count = curr_orders
    for i in range(1, 6):
        temp_start, temp_end, _ = get_previous_fiscal_month(temp_start, temp_end)
        month_count = len([o for o in all_orders if is_order_in_fiscal_month(o, temp_start, temp_end)])
        if i == 1:
            if curr_orders > month_count:
                streak = 1
                streak_type = "growth"
            elif curr_orders < month_count:
                streak = 1
                streak_type = "decline"
        else:
            if streak_type == "growth" and prev_count > month_count:
                streak += 1
            elif streak_type == "decline" and prev_count < month_count:
                streak += 1
            else:
                break
        prev_count = month_count
    
    # Build metrics dict for AI
    metrics = {
        "current_orders": curr_orders,
        "current_revenue": curr_revenue,
        "current_psu": curr_psu,
        "previous_orders": prev_orders,
        "previous_revenue": prev_revenue,
        "order_change": order_change,
        "revenue_change": revenue_change,
        "streak": streak,
        "streak_type": streak_type,
        "best_orders": best_orders,
        "best_period": best_period,
        "current_internet": curr_internet,
        "internet_change": internet_change,
        "current_mobile": curr_mobile,
        "mobile_change": mobile_change,
    }
    
    # Generate AI insights with selected tone
    insights = await generate_performance_insights(metrics, tone)
    
    # Update usage count
    current_user.ai_insights_count += 1
    db.commit()
    
    remaining = 3 - current_user.ai_insights_count
    
    return AIInsightsResponse(
        insights=insights,
        remaining_today=remaining,
        ai_enabled=True,
        resets_at=reset_time,
        metrics=metrics  # Return metrics for free tone regeneration
    )


@router.post("/performance-insights/regenerate-tone", response_model=AIInsightsResponse)
async def regenerate_ai_tone(
    request: AIRegenerateToneRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Regenerate AI insights with a different tone using cached metrics.
    This does NOT count against the daily limit - it's free to change tones.
    """
    from .ai_insights import generate_performance_insights, is_ai_configured
    
    reset_time = _get_reset_time()
    
    if not is_ai_configured():
        return AIInsightsResponse(
            insights=["AI insights not configured. Contact administrator."],
            remaining_today=0,
            ai_enabled=False,
            resets_at=reset_time
        )
    
    # Validate tone
    valid_tones = ["positive", "realistic", "brutal"]
    tone = request.tone if request.tone in valid_tones else "positive"
    
    # Validate metrics
    if not request.metrics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Metrics required for tone regeneration. Generate new insights first."
        )
    
    # Generate with new tone using provided metrics (FREE - no credit used)
    insights = await generate_performance_insights(request.metrics, tone)
    
    # Get current remaining count (don't decrement)
    today = date.today()
    if current_user.ai_insights_reset_date != today:
        current_user.ai_insights_count = 0
        current_user.ai_insights_reset_date = today
        db.commit()
    
    remaining = 3 - current_user.ai_insights_count
    
    return AIInsightsResponse(
        insights=insights,
        remaining_today=remaining,
        ai_enabled=True,
        resets_at=reset_time,
        metrics=request.metrics  # Return same metrics
    )


@router.get("/export/columns")
def get_available_columns(
    current_user: User = Depends(get_current_user)
):
    """Get list of available columns for export"""
    from .export_utils import COLUMN_LABELS
    return {
        "columns": [
            {"id": col, "label": COLUMN_LABELS.get(col, col)}
            for col in ALL_COLUMNS
        ]
    }

@router.get("/export/excel")
def export_orders_excel(
    columns: Optional[str] = Query(None, description="Comma-separated list of columns to export"),
    search: Optional[str] = Query(None, description="Search by customer name, account number, or spectrum reference"),
    date_from: Optional[date] = Query(None, description="Filter by install date from"),
    date_to: Optional[date] = Query(None, description="Filter by install date to"),
    product_types: Optional[str] = Query(None, description="Comma-separated product types: internet,tv,mobile,voice,wib,sbc"),
    install_status: Optional[str] = Query(None, description="Filter by install status: installed,pending,today"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export orders to Excel with optional column selection and filters."""
    # Build filtered query using helper function
    query = build_filtered_orders_query(
        db=db,
        user_id=current_user.userid,
        search=search,
        date_from=date_from,
        date_to=date_to,
        product_types=product_types,
        install_status=install_status
    )

    # Get all matching orders
    orders = query.all()

    # Parse column list
    column_list = None
    if columns:
        column_list = [c.strip() for c in columns.split(',') if c.strip()]

    # Generate Excel
    excel_data = generate_excel(orders, column_list)

    # Create filename with timestamp
    filename = f"orders_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    # Return as download
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/export/csv")
def export_orders_csv(
    columns: Optional[str] = Query(None, description="Comma-separated list of columns to export"),
    search: Optional[str] = Query(None, description="Search by customer name, account number, or spectrum reference"),
    date_from: Optional[date] = Query(None, description="Filter by install date from"),
    date_to: Optional[date] = Query(None, description="Filter by install date to"),
    product_types: Optional[str] = Query(None, description="Comma-separated product types: internet,tv,mobile,voice,wib,sbc"),
    install_status: Optional[str] = Query(None, description="Filter by install status: installed,pending,today"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export orders to CSV with optional column selection and filters."""
    # Build filtered query using helper function
    query = build_filtered_orders_query(
        db=db,
        user_id=current_user.userid,
        search=search,
        date_from=date_from,
        date_to=date_to,
        product_types=product_types,
        install_status=install_status
    )

    # Get all matching orders
    orders = query.all()

    # Parse column list
    column_list = None
    if columns:
        column_list = [c.strip() for c in columns.split(',') if c.strip()]

    # Generate CSV
    csv_data = generate_csv(orders, column_list)

    # Create filename with timestamp
    filename = f"orders_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    # Return as download
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/export/stats")
def export_stats_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export statistics report to Excel"""
    # Get stats (reuse logic from get_order_stats)
    user_id = current_user.userid

    total_orders = db.query(func.count(Order.orderid)).filter(
        Order.userid == user_id
    ).scalar() or 0

    today = date.today()
    week_ago = today - timedelta(days=7)
    this_week = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            Order.install_date >= week_ago
        )
    ).scalar() or 0

    this_month = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            extract('month', Order.install_date) == today.month,
            extract('year', Order.install_date) == today.year
        )
    ).scalar() or 0

    pending_installs = db.query(func.count(Order.orderid)).filter(
        and_(
            Order.userid == user_id,
            Order.install_date >= today
        )
    ).scalar() or 0

    total_internet = db.query(func.count(Order.orderid)).filter(
        and_(Order.userid == user_id, Order.has_internet == True)
    ).scalar() or 0

    total_tv = db.query(func.count(Order.orderid)).filter(
        and_(Order.userid == user_id, Order.has_tv == True)
    ).scalar() or 0

    total_mobile = db.query(func.sum(Order.has_mobile)).filter(
        Order.userid == user_id
    ).scalar() or 0

    total_voice = db.query(func.sum(Order.has_voice)).filter(
        Order.userid == user_id
    ).scalar() or 0

    stats = {
        'total_orders': total_orders,
        'this_week': this_week,
        'this_month': this_month,
        'pending_installs': pending_installs,
        'total_internet': total_internet,
        'total_tv': total_tv,
        'total_mobile': int(total_mobile),
        'total_voice': int(total_voice)
    }

    # Get recent orders for the report
    orders = db.query(Order).filter(Order.userid == user_id).limit(100).all()

    # Generate Excel
    excel_data = generate_stats_excel(stats, orders)

    # Create filename with timestamp
    filename = f"statistics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    # Return as download
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.post("/export/email", status_code=status.HTTP_200_OK)
async def email_export(
    request: EmailExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Email export file to user with CAPTCHA verification."""

    # Verify reCAPTCHA
    if not await verify_recaptcha(request.recaptcha_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CAPTCHA verification failed. Please try again."
        )

    # Validate file format
    if request.file_format not in ['excel', 'csv']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File format must be 'excel' or 'csv'"
        )

    try:
        # Build filtered query using helper function
        query = build_filtered_orders_query(
            db=db,
            user_id=current_user.userid,
            search=request.search,
            date_from=request.date_from,
            date_to=request.date_to,
            product_types=request.product_types,
            install_status=request.install_status
        )

        # Get all matching orders
        orders = query.all()
        order_count = len(orders)

        # Parse column list
        column_list = None
        if request.columns:
            column_list = [c.strip() for c in request.columns.split(',') if c.strip()]

        # Generate file based on format
        if request.file_format == 'excel':
            file_data = generate_excel(orders, column_list)
        else:
            file_data = generate_csv(orders, column_list)

        # Send email
        await send_export_email(
            user_email=current_user.email,
            user_name=current_user.name,
            file_data=file_data,
            file_format=request.file_format,
            order_count=order_count
        )

        return {
            "message": f"Export sent successfully to {current_user.email}",
            "email": current_user.email,
            "order_count": order_count,
            "format": request.file_format
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send export: {str(e)}"
        )

@router.post("/bulk/mark-installed", status_code=status.HTTP_200_OK)
def bulk_mark_installed(
    request: BulkMarkInstalledRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark multiple orders as installed (set install_date to yesterday or keep if already past)"""
    # Check idempotency key
    if request.idempotency_key:
        cached = check_idempotency_key(db, request.idempotency_key, current_user.userid, 'bulk_mark_installed')
        if cached:
            return JSONResponse(status_code=cached["status_code"], content=cached["response"])
    
    if not request.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No order IDs provided"
        )

    # Verify all orders belong to current user
    orders = db.query(Order).filter(
        and_(
            Order.orderid.in_(request.order_ids),
            Order.userid == current_user.userid
        )
    ).all()

    if len(orders) != len(request.order_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some orders not found or don't belong to you"
        )

    # Update all orders - set to yesterday if date is today or in future
    today = date.today()
    yesterday = today - timedelta(days=1)
    for order in orders:
        # If order is scheduled for today or in the future, set to yesterday
        if order.install_date >= today:
            order.install_date = yesterday
        # If already in the past, keep the original date

    # Log bulk operation
    audit_service.log_bulk_operation(
        db=db,
        action='mark_installed',
        entity_type='order',
        entity_ids=request.order_ids,
        user=current_user,
        field_changes={'install_date': str(yesterday)},
        ip_address=None,
        reason="Bulk mark as installed"
    )

    response = {
        "message": f"Successfully marked {len(orders)} orders as installed",
        "updated_count": len(orders)
    }
    
    # Save idempotency key
    save_idempotency_key(db, request.idempotency_key, current_user.userid, 'bulk_mark_installed', 200, response)
    
    db.commit()
    return response

@router.post("/bulk/reschedule", status_code=status.HTTP_200_OK)
def bulk_reschedule(
    request: BulkRescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reschedule multiple orders to a new date"""
    # Check idempotency key
    if request.idempotency_key:
        cached = check_idempotency_key(db, request.idempotency_key, current_user.userid, 'bulk_reschedule')
        if cached:
            return JSONResponse(status_code=cached["status_code"], content=cached["response"])
    
    if not request.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No order IDs provided"
        )

    # Verify all orders belong to current user
    orders = db.query(Order).filter(
        and_(
            Order.orderid.in_(request.order_ids),
            Order.userid == current_user.userid
        )
    ).all()

    if len(orders) != len(request.order_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some orders not found or don't belong to you"
        )

    # Update all orders to new date
    for order in orders:
        order.install_date = request.new_date

    # Log bulk operation
    audit_service.log_bulk_operation(
        db=db,
        action='reschedule',
        entity_type='order',
        entity_ids=request.order_ids,
        user=current_user,
        field_changes={'install_date': str(request.new_date)},
        ip_address=None,
        reason=f"Bulk rescheduled to {request.new_date}"
    )

    response = {
        "message": f"Successfully rescheduled {len(orders)} orders to {request.new_date}",
        "updated_count": len(orders),
        "new_date": str(request.new_date)
    }
    
    # Save idempotency key
    save_idempotency_key(db, request.idempotency_key, current_user.userid, 'bulk_reschedule', 200, response)
    
    db.commit()
    return response

@router.delete("/bulk/delete", status_code=status.HTTP_200_OK)
def bulk_delete(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple orders"""
    # Check idempotency key
    if request.idempotency_key:
        cached = check_idempotency_key(db, request.idempotency_key, current_user.userid, 'bulk_delete')
        if cached:
            return JSONResponse(status_code=cached["status_code"], content=cached["response"])
    
    if not request.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No order IDs provided"
        )

    # Verify all orders belong to current user
    orders = db.query(Order).filter(
        and_(
            Order.orderid.in_(request.order_ids),
            Order.userid == current_user.userid
        )
    ).all()

    if len(orders) != len(request.order_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some orders not found or don't belong to you"
        )

    # Log bulk deletion before deleting
    audit_service.log_bulk_operation(
        db=db,
        action='delete',
        entity_type='order',
        entity_ids=request.order_ids,
        user=current_user,
        field_changes=None,
        ip_address=None,
        reason="Bulk delete"
    )

    # Record deletions for delta sync
    for order_id in request.order_ids:
        deleted_record = DeletedOrder(
            order_id=order_id,
            user_id=current_user.userid
        )
        db.add(deleted_record)

    # Delete related notifications first (to avoid foreign key constraint violation)
    db.query(Notification).filter(
        Notification.orderid.in_(request.order_ids)
    ).delete(synchronize_session=False)

    # Delete all orders
    deleted_count = len(orders)
    for order in orders:
        db.delete(order)

    response = {
        "message": f"Successfully deleted {deleted_count} orders",
        "deleted_count": deleted_count
    }
    
    # Save idempotency key
    save_idempotency_key(db, request.idempotency_key, current_user.userid, 'bulk_delete', 200, response)

    db.commit()
    return response

@router.get("/bulk/export")
def bulk_export_orders(
    order_ids: str = Query(..., description="Comma-separated order IDs to export"),
    file_format: str = Query("excel", description="File format: excel or csv"),
    columns: Optional[str] = Query(None, description="Comma-separated list of columns to export"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export specific orders by IDs"""
    # Parse order IDs
    try:
        order_id_list = [int(id.strip()) for id in order_ids.split(',') if id.strip()]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order IDs format"
        )

    if not order_id_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No order IDs provided"
        )

    # Get orders
    orders = db.query(Order).filter(
        and_(
            Order.orderid.in_(order_id_list),
            Order.userid == current_user.userid
        )
    ).all()

    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No orders found"
        )

    # Parse column list
    column_list = None
    if columns:
        column_list = [c.strip() for c in columns.split(',') if c.strip()]

    # Generate file based on format
    if file_format == 'excel':
        file_data = generate_excel(orders, column_list)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        extension = "xlsx"
    elif file_format == 'csv':
        file_data = generate_csv(orders, column_list)
        media_type = "text/csv"
        extension = "csv"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File format must be 'excel' or 'csv'"
        )

    # Create filename with timestamp
    filename = f"orders_bulk_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{extension}"

    # Return as download
    return Response(
        content=file_data,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific order by ID with caching"""
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

    # Add Cache-Control header (cache for 10 minutes)
    response.headers["Cache-Control"] = "private, max-age=600"

    return order

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing order"""
    db_order = db.query(Order).filter(
        and_(
            Order.orderid == order_id,
            Order.userid == current_user.userid
        )
    ).first()

    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Capture old values before updating
    update_data = order_update.model_dump(exclude_unset=True)
    old_values = {}
    new_values = {}

    for key, value in update_data.items():
        old_values[key] = getattr(db_order, key)
        new_values[key] = value
        setattr(db_order, key, value)

    db.commit()
    db.refresh(db_order)

    # Log the update to audit trail
    audit_service.log_order_update(
        db=db,
        order=db_order,
        old_values=old_values,
        new_values=new_values,
        user=current_user,
        ip_address=None,
        reason="Order updated"
    )

    return db_order

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an order"""
    db_order = db.query(Order).filter(
        and_(
            Order.orderid == order_id,
            Order.userid == current_user.userid
        )
    ).first()

    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Log deletion before actually deleting
    audit_service.log_order_deletion(
        db=db,
        order=db_order,
        user=current_user,
        ip_address=None,
        reason="Order deleted"
    )

    # Record deletion for delta sync
    deleted_record = DeletedOrder(
        order_id=order_id,
        user_id=current_user.userid
    )
    db.add(deleted_record)

    # Delete related notifications first (to avoid foreign key constraint violation)
    db.query(Notification).filter(
        Notification.orderid == order_id
    ).delete(synchronize_session=False)

    db.delete(db_order)
    db.commit()
    return None

@router.post("/{order_id}/email", status_code=status.HTTP_200_OK)
async def send_order_email(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send order details to user's email"""
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

    try:
        # Send email
        success = await send_order_details_email(current_user, order)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email"
            )

        return {
            "message": f"Order details sent successfully to {current_user.email}",
            "email": current_user.email,
            "order_id": order_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send order email: {str(e)}"
        )

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, or_
from typing import List, Optional
from datetime import datetime, timedelta, date
import io
from .database import get_db
from .models import Order, User
from .schemas import OrderCreate, OrderUpdate, OrderResponse, OrderStats, PaginatedOrderResponse, PaginationMeta
from .auth import get_current_user, verify_recaptcha
from .export_utils import generate_excel, generate_csv, generate_stats_excel, ALL_COLUMNS
from .email_service import send_export_email
from .notification_service import send_order_details_email
from . import audit_service
from pydantic import BaseModel

router = APIRouter()

class EmailExportRequest(BaseModel):
    file_format: str  # 'excel' or 'csv'
    columns: Optional[str] = None
    search: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    product_types: Optional[str] = None
    install_status: Optional[str] = None
    recaptcha_token: Optional[str] = None

class BulkMarkInstalledRequest(BaseModel):
    order_ids: List[int]

class BulkRescheduleRequest(BaseModel):
    order_ids: List[int]
    new_date: date

class BulkDeleteRequest(BaseModel):
    order_ids: List[int]

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
    """Get all orders for the current user with optional search and filters, including pagination metadata"""
    # Base query - filter by user
    query = db.query(Order).filter(Order.userid == current_user.userid)

    # Search filter - search across customer name, account number, and spectrum reference
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

    # Add Cache-Control header (cache for 5 minutes)
    response.headers["Cache-Control"] = "private, max-age=300"

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

    # Note: Deleted orders tracking would require a separate deleted_orders table
    # For now, returning empty list - can be enhanced later
    deleted_order_ids = []

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
    """Export orders to Excel with optional column selection and filters"""
    # Build query with same filtering logic as get_orders
    query = db.query(Order).filter(Order.userid == current_user.userid)

    # Apply filters
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

    if date_from:
        query = query.filter(Order.install_date >= date_from)
    if date_to:
        query = query.filter(Order.install_date <= date_to)

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
    """Export orders to CSV with optional column selection and filters"""
    # Build query with same filtering logic as get_orders
    query = db.query(Order).filter(Order.userid == current_user.userid)

    # Apply filters
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

    if date_from:
        query = query.filter(Order.install_date >= date_from)
    if date_to:
        query = query.filter(Order.install_date <= date_to)

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
    """Email export file to user with CAPTCHA verification"""
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
        # Build query with filtering logic
        query = db.query(Order).filter(Order.userid == current_user.userid)

        # Apply filters
        if request.search:
            search_term = f"%{request.search}%"
            query = query.filter(
                or_(
                    Order.customer_name.ilike(search_term),
                    Order.customer_account_number.ilike(search_term),
                    Order.spectrum_reference.ilike(search_term),
                    Order.business_name.ilike(search_term)
                )
            )

        if request.date_from:
            query = query.filter(Order.install_date >= request.date_from)
        if request.date_to:
            query = query.filter(Order.install_date <= request.date_to)

        if request.product_types:
            product_list = [p.strip().lower() for p in request.product_types.split(',')]
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

        if request.install_status:
            today = date.today()
            status_list = [s.strip().lower() for s in request.install_status.split(',')]
            status_conditions = []

            if 'installed' in status_list:
                status_conditions.append(Order.install_date < today)
            if 'today' in status_list:
                status_conditions.append(Order.install_date == today)
            if 'pending' in status_list:
                status_conditions.append(Order.install_date > today)

            if status_conditions:
                query = query.filter(or_(*status_conditions))

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

    db.commit()

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

    return {
        "message": f"Successfully marked {len(orders)} orders as installed",
        "updated_count": len(orders)
    }

@router.post("/bulk/reschedule", status_code=status.HTTP_200_OK)
def bulk_reschedule(
    request: BulkRescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reschedule multiple orders to a new date"""
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

    db.commit()

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

    return {
        "message": f"Successfully rescheduled {len(orders)} orders to {request.new_date}",
        "updated_count": len(orders),
        "new_date": request.new_date
    }

@router.delete("/bulk/delete", status_code=status.HTTP_200_OK)
def bulk_delete(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple orders"""
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

    # Delete all orders
    deleted_count = len(orders)
    for order in orders:
        db.delete(order)

    db.commit()

    return {
        "message": f"Successfully deleted {deleted_count} orders",
        "deleted_count": deleted_count
    }

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

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, String
from datetime import datetime, timedelta
from typing import Optional, List
from slowapi import Limiter
from slowapi.util import get_remote_address
from .auth import require_admin, get_current_user
from .database import get_db
from .models import User, Order, ErrorLog, AuditLog
from .scheduler import get_scheduler_status
from .schemas import (
    AdminUserResponse, SystemAnalytics, PaginatedUserResponse,
    PaginatedErrorLogResponse, ErrorLogResponse, ErrorLogCreate,
    ResolveErrorRequest, PaginationMeta, AuditLogResponse,
    PaginatedOrderResponse, OrderResponse
)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users", response_model=PaginatedUserResponse)
@limiter.limit("30/minute")
async def get_all_users(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    verified_only: Optional[bool] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users with pagination and search."""
    # Build query
    query = db.query(User)

    # Apply search filter
    if search:
        search_filter = or_(
            User.email.ilike(f"%{search}%"),
            User.name.ilike(f"%{search}%"),
            func.cast(User.salesid, String).ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    # Apply verified filter
    if verified_only is not None:
        query = query.filter(User.email_verified == verified_only)

    # Get total count
    total = query.count()

    # Get users with pagination
    users = query.offset(skip).limit(limit).all()

    # Enhance with order stats
    users_response = []
    for user in users:
        # Count total and pending orders
        total_orders = db.query(func.count(Order.orderid)).filter(Order.userid == user.userid).scalar() or 0
        pending_orders = db.query(func.count(Order.orderid)).filter(
            and_(
                Order.userid == user.userid,
                Order.install_date >= datetime.now().date()
            )
        ).scalar() or 0

        users_response.append(AdminUserResponse(
            userid=user.userid,
            email=user.email,
            salesid=user.salesid,
            name=user.name,
            email_verified=user.email_verified,
            is_admin=user.is_admin,
            phone_number=user.phone_number,
            email_notifications=user.email_notifications,
            sms_notifications=user.sms_notifications,
            browser_notifications=user.browser_notifications,
            total_orders=total_orders,
            pending_orders=pending_orders
        ))

    return PaginatedUserResponse(
        data=users_response,
        meta=PaginationMeta(
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total
        )
    )

@router.get("/users/{user_id}/orders", response_model=PaginatedOrderResponse)
@limiter.limit("30/minute")
async def get_user_orders(
    request: Request,
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all orders for a specific user."""
    # Verify user exists
    user = db.query(User).filter(User.userid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get orders
    total = db.query(func.count(Order.orderid)).filter(Order.userid == user_id).scalar()
    orders = db.query(Order).filter(Order.userid == user_id).offset(skip).limit(limit).all()

    return PaginatedOrderResponse(
        data=[OrderResponse.from_orm(order) for order in orders],
        meta=PaginationMeta(
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total
        )
    )

@router.get("/analytics", response_model=SystemAnalytics)
@limiter.limit("30/minute")
async def get_system_analytics(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get system-wide analytics."""
    # User stats
    total_users = db.query(func.count(User.userid)).scalar() or 0
    verified_users = db.query(func.count(User.userid)).filter(User.email_verified == True).scalar() or 0
    unverified_users = total_users - verified_users
    admin_users = db.query(func.count(User.userid)).filter(User.is_admin == True).scalar() or 0

    # Order stats
    total_orders = db.query(func.count(Order.orderid)).scalar() or 0

    # Time-based order stats
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    orders_this_week = db.query(func.count(Order.orderid)).filter(
        Order.created_at >= week_ago
    ).scalar() or 0

    orders_this_month = db.query(func.count(Order.orderid)).filter(
        Order.created_at >= month_ago
    ).scalar() or 0

    pending_installs = db.query(func.count(Order.orderid)).filter(
        Order.install_date >= now.date()
    ).scalar() or 0

    # Product stats
    total_internet = db.query(func.count(Order.orderid)).filter(Order.has_internet == True).scalar() or 0
    total_tv = db.query(func.count(Order.orderid)).filter(Order.has_tv == True).scalar() or 0
    total_wib = db.query(func.count(Order.orderid)).filter(Order.has_wib == True).scalar() or 0
    total_mobile = db.query(func.sum(Order.has_mobile)).scalar() or 0
    total_voice = db.query(func.sum(Order.has_voice)).scalar() or 0
    total_sbc = db.query(func.sum(Order.has_sbc)).scalar() or 0

    # Error stats
    total_errors = db.query(func.count(ErrorLog.errorid)).scalar() or 0
    unresolved_errors = db.query(func.count(ErrorLog.errorid)).filter(
        ErrorLog.is_resolved == False
    ).scalar() or 0

    # Recent errors (last 5)
    recent_errors = db.query(ErrorLog).filter(
        ErrorLog.is_resolved == False
    ).order_by(desc(ErrorLog.timestamp)).limit(5).all()

    return SystemAnalytics(
        total_users=total_users,
        verified_users=verified_users,
        unverified_users=unverified_users,
        admin_users=admin_users,
        total_orders=total_orders,
        orders_this_week=orders_this_week,
        orders_this_month=orders_this_month,
        pending_installs=pending_installs,
        total_internet=total_internet,
        total_tv=total_tv,
        total_mobile=total_mobile,
        total_voice=total_voice,
        total_wib=total_wib,
        total_sbc=total_sbc,
        total_errors=total_errors,
        unresolved_errors=unresolved_errors,
        recent_errors=[ErrorLogResponse.from_orm(e) for e in recent_errors]
    )

@router.get("/error-logs", response_model=PaginatedErrorLogResponse)
@limiter.limit("30/minute")
async def get_error_logs(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    error_type: Optional[str] = None,
    resolved: Optional[bool] = None,
    user_id: Optional[int] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get error logs with pagination and filters."""
    # Build query
    query = db.query(ErrorLog)

    # Apply filters
    if error_type:
        query = query.filter(ErrorLog.error_type == error_type)

    if resolved is not None:
        query = query.filter(ErrorLog.is_resolved == resolved)

    if user_id:
        query = query.filter(ErrorLog.user_id == user_id)

    # Get total count
    total = query.count()

    # Get error logs with pagination (newest first)
    error_logs = query.order_by(desc(ErrorLog.timestamp)).offset(skip).limit(limit).all()

    return PaginatedErrorLogResponse(
        data=[ErrorLogResponse.from_orm(log) for log in error_logs],
        meta=PaginationMeta(
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total
        )
    )

@router.post("/error-logs", response_model=ErrorLogResponse)
@limiter.limit("20/minute")
async def create_error_log(
    request: Request,
    error_data: ErrorLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new error log entry (used by frontend to report errors)"""
    # Get client IP
    client_ip = request.client.host if request.client else None

    # Create error log
    error_log = ErrorLog(
        error_type=error_data.error_type,
        error_message=error_data.error_message,
        stack_trace=error_data.stack_trace,
        endpoint=error_data.endpoint,
        method=error_data.method,
        status_code=error_data.status_code,
        user_id=current_user.userid,
        user_email=current_user.email,
        ip_address=client_ip,
        user_agent=error_data.user_agent
    )

    db.add(error_log)
    db.commit()
    db.refresh(error_log)

    return ErrorLogResponse.from_orm(error_log)

@router.patch("/error-logs/{error_id}/resolve", response_model=ErrorLogResponse)
@limiter.limit("30/minute")
async def resolve_error(
    request: Request,
    error_id: int,
    resolve_data: ResolveErrorRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Mark an error as resolved."""
    error_log = db.query(ErrorLog).filter(ErrorLog.errorid == error_id).first()
    if not error_log:
        raise HTTPException(status_code=404, detail="Error log not found")

    error_log.is_resolved = True
    error_log.resolved_at = datetime.utcnow()
    error_log.resolved_by = admin.userid
    error_log.resolution_notes = resolve_data.resolution_notes

    db.commit()
    db.refresh(error_log)

    return ErrorLogResponse.from_orm(error_log)

@router.get("/audit/system", response_model=List[AuditLogResponse])
@limiter.limit("30/minute")
async def get_system_audit_trail(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get system-wide audit trail."""
    # Build query
    query = db.query(AuditLog)

    # Apply filters
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    if action:
        query = query.filter(AuditLog.action == action)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    # Get audit logs (newest first)
    audit_logs = query.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()

    return [AuditLogResponse.from_orm(log) for log in audit_logs]

@router.post("/users/{user_id}/verify")
@limiter.limit("10/minute")
async def manually_verify_user(
    request: Request,
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Manually verify a user's email."""
    user = db.query(User).filter(User.userid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.email_verified = True
    user.verification_token = None
    user.verification_token_expiry = None

    db.commit()

    return {"success": True, "message": f"User {user.email} has been verified"}

@router.patch("/users/{user_id}/admin")
@limiter.limit("10/minute")
async def toggle_admin_status(
    request: Request,
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Toggle admin status for a user."""
    # Prevent admins from removing their own admin status
    if user_id == admin.userid:
        raise HTTPException(status_code=400, detail="Cannot modify your own admin status")

    user = db.query(User).filter(User.userid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_status = user.is_admin
    user.is_admin = not user.is_admin
    new_status = user.is_admin
    
    # Log this security-sensitive action to audit trail
    client_ip = request.client.host if request.client else None
    audit_log = AuditLog(
        entity_type='user',
        entity_id=user_id,
        user_id=admin.userid,
        user_name=admin.name,
        action='admin_privilege_change',
        field_name='is_admin',
        old_value=str(old_status),
        new_value=str(new_status),
        change_reason=f"Admin privileges {'granted to' if new_status else 'revoked from'} {user.email}",
        ip_address=client_ip
    )
    db.add(audit_log)
    db.commit()

    status = "granted" if user.is_admin else "revoked"
    return {
        "success": True,
        "message": f"Admin privileges {status} for {user.email}",
        "is_admin": user.is_admin
    }


@router.get("/scheduler/status")
@limiter.limit("30/minute")
async def scheduler_status(
    request: Request,
    admin: User = Depends(require_admin)
):
    """Get scheduler status (admin only)."""
    return get_scheduler_status()

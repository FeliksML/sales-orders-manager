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
        and_(
            Order.install_date >= now.date(),
            Order.completed_at == None  # Exclude orders marked as installed
        )
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


# =============================================================================
# Admin Notification Management Endpoints
# =============================================================================

from .models import Notification, NotificationDelivery, FollowUp
from .schemas import (
    AdminNotificationResponse, UpcomingNotificationResponse,
    NotificationDeliveryResponse, PaginatedAdminNotificationResponse,
    NotificationStatsResponse, RetryNotificationRequest
)
from .notification_service import (
    send_email_notification_sync, send_sms_with_gating, log_delivery
)


@router.get("/notifications", response_model=PaginatedAdminNotificationResponse)
@limiter.limit("30/minute")
async def get_admin_notifications(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    notification_type: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all notifications with delivery status and filters."""
    from sqlalchemy.orm import joinedload

    # Build base query
    query = db.query(Notification).join(User, Notification.userid == User.userid)

    # Apply filters
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)

    if user_id:
        query = query.filter(Notification.userid == user_id)

    if channel:
        # Filter by channel (email, sms, browser)
        if channel == 'email':
            query = query.filter(Notification.sent_via_email == True)
        elif channel == 'sms':
            query = query.filter(Notification.sent_via_sms == True)
        elif channel == 'browser':
            query = query.filter(Notification.sent_via_browser == True)

    # Get total count
    total = query.count()

    # Get notifications with pagination (newest first)
    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

    # Build response with delivery status
    result = []
    for notification in notifications:
        # Get user info
        user = db.query(User).filter(User.userid == notification.userid).first()

        # Get latest delivery status per channel
        deliveries = db.query(NotificationDelivery).filter(
            NotificationDelivery.notification_id == notification.notificationid
        ).all()

        email_status = None
        sms_status = None
        browser_status = None

        for d in deliveries:
            if d.channel == 'email':
                email_status = d.status
            elif d.channel == 'sms':
                sms_status = d.status
            elif d.channel == 'browser':
                browser_status = d.status

        # Apply status filter after fetching delivery status
        if status:
            matches_status = False
            if email_status == status or sms_status == status or browser_status == status:
                matches_status = True
            if not matches_status:
                continue

        result.append(AdminNotificationResponse(
            notificationid=notification.notificationid,
            userid=notification.userid,
            orderid=notification.orderid,
            notification_type=notification.notification_type,
            title=notification.title,
            message=notification.message,
            is_read=notification.is_read,
            created_at=notification.created_at,
            email_status=email_status,
            sms_status=sms_status,
            browser_status=browser_status,
            user_email=user.email if user else 'Unknown',
            user_name=user.name if user else 'Unknown'
        ))

    return PaginatedAdminNotificationResponse(
        data=result,
        meta=PaginationMeta(
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total
        )
    )


@router.get("/notifications/upcoming", response_model=List[UpcomingNotificationResponse])
@limiter.limit("30/minute")
async def get_upcoming_notifications(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get orders/follow-ups that will trigger notifications soon."""
    from datetime import timedelta

    now = datetime.now()
    today = now.date()
    tomorrow = today + timedelta(days=1)

    upcoming = []

    # 1. Tomorrow's installs → will get 24h reminder
    tomorrow_orders = db.query(Order).join(User, Order.userid == User.userid).filter(
        Order.install_date == tomorrow
    ).all()

    for order in tomorrow_orders:
        user = db.query(User).filter(User.userid == order.userid).first()
        if not user:
            continue

        channels = []
        if user.email_notifications:
            channels.append('email')
        if user.sms_notifications and user.phone_number:
            channels.append('sms')
        if user.browser_notifications:
            channels.append('browser')

        # Check if notification already sent today
        existing = db.query(Notification).filter(
            Notification.userid == order.userid,
            Notification.orderid == order.orderid,
            Notification.notification_type == 'install_reminder_24h',
            func.date(Notification.created_at) == today
        ).first()

        if not existing and channels:
            upcoming.append(UpcomingNotificationResponse(
                type='install_reminder_24h',
                expected_send_time=now + timedelta(hours=1),  # Next scheduler run
                order_id=order.orderid,
                user_id=user.userid,
                user_email=user.email,
                user_name=user.name,
                business_name=order.business_name,
                customer_name=order.customer_name,
                install_date=order.install_date,
                install_time=order.install_time,
                channels_enabled=channels
            ))

    # 2. Today's installs → will get today notification
    today_orders = db.query(Order).join(User, Order.userid == User.userid).filter(
        Order.install_date == today
    ).all()

    for order in today_orders:
        user = db.query(User).filter(User.userid == order.userid).first()
        if not user:
            continue

        channels = []
        if user.email_notifications:
            channels.append('email')
        if user.sms_notifications and user.phone_number:
            channels.append('sms')
        if user.browser_notifications:
            channels.append('browser')

        # Check if notification already sent today
        existing = db.query(Notification).filter(
            Notification.userid == order.userid,
            Notification.orderid == order.orderid,
            Notification.notification_type == 'today_install',
            func.date(Notification.created_at) == today
        ).first()

        if not existing and channels:
            upcoming.append(UpcomingNotificationResponse(
                type='today_install',
                expected_send_time=now + timedelta(hours=2),  # Next scheduler run
                order_id=order.orderid,
                user_id=user.userid,
                user_email=user.email,
                user_name=user.name,
                business_name=order.business_name,
                customer_name=order.customer_name,
                install_date=order.install_date,
                install_time=order.install_time,
                channels_enabled=channels
            ))

    # 3. Follow-ups due soon
    due_followups = db.query(FollowUp).join(Order, FollowUp.order_id == Order.orderid).filter(
        FollowUp.status == 'pending',
        FollowUp.notification_sent == False,
        FollowUp.due_date <= now + timedelta(hours=1)
    ).all()

    for followup in due_followups:
        order = db.query(Order).filter(Order.orderid == followup.order_id).first()
        user = db.query(User).filter(User.userid == followup.user_id).first()
        if not order or not user:
            continue

        channels = []
        if user.email_notifications:
            channels.append('email')
        if user.sms_notifications and user.phone_number:
            channels.append('sms')
        if user.browser_notifications:
            channels.append('browser')

        if channels:
            upcoming.append(UpcomingNotificationResponse(
                type='followup_due',
                expected_send_time=followup.due_date,
                order_id=order.orderid,
                user_id=user.userid,
                user_email=user.email,
                user_name=user.name,
                business_name=order.business_name,
                customer_name=order.customer_name,
                install_date=order.install_date,
                install_time=order.install_time,
                channels_enabled=channels
            ))

    # Sort by expected send time
    upcoming.sort(key=lambda x: x.expected_send_time)

    return upcoming


@router.get("/notifications/{notification_id}/deliveries", response_model=List[NotificationDeliveryResponse])
@limiter.limit("30/minute")
async def get_notification_deliveries(
    request: Request,
    notification_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all delivery attempts for a notification."""
    # Verify notification exists
    notification = db.query(Notification).filter(
        Notification.notificationid == notification_id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    deliveries = db.query(NotificationDelivery).filter(
        NotificationDelivery.notification_id == notification_id
    ).order_by(desc(NotificationDelivery.created_at)).all()

    return [NotificationDeliveryResponse.model_validate(d) for d in deliveries]


@router.post("/notifications/{notification_id}/retry")
@limiter.limit("10/minute")
async def retry_notification(
    request: Request,
    notification_id: int,
    retry_data: RetryNotificationRequest = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Retry failed notification delivery."""
    # Get the notification
    notification = db.query(Notification).filter(
        Notification.notificationid == notification_id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Get user and order
    user = db.query(User).filter(User.userid == notification.userid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    order = None
    if notification.orderid:
        order = db.query(Order).filter(Order.orderid == notification.orderid).first()

    channel = retry_data.channel if retry_data else None
    retried = []

    # Get current attempt numbers
    max_attempts = {}
    for d in db.query(NotificationDelivery).filter(
        NotificationDelivery.notification_id == notification_id
    ).all():
        if d.channel not in max_attempts or d.attempt_number > max_attempts[d.channel]:
            max_attempts[d.channel] = d.attempt_number

    # Retry email if requested or all channels
    if (channel is None or channel == 'email') and notification.sent_via_email == False:
        try:
            email_sent = send_email_notification_sync(
                user_email=user.email,
                user_name=user.name,
                subject=notification.title,
                title=notification.title,
                message=notification.message,
                order=order
            )
            attempt = max_attempts.get('email', 0) + 1
            log_delivery(db, notification_id, 'email',
                        'sent' if email_sent else 'failed',
                        attempt=attempt)
            if email_sent:
                notification.sent_via_email = True
                retried.append('email')
        except Exception as e:
            attempt = max_attempts.get('email', 0) + 1
            log_delivery(db, notification_id, 'email', 'failed',
                        error_message=str(e), attempt=attempt)

    # Retry SMS if requested or all channels
    if (channel is None or channel == 'sms') and notification.sent_via_sms == False:
        if user.phone_number:
            sms_message = f"{notification.title}: {notification.message}"
            sms_sent, sms_reason = send_sms_with_gating(
                db, user.userid, user.phone_number, sms_message
            )
            attempt = max_attempts.get('sms', 0) + 1
            log_delivery(db, notification_id, 'sms',
                        'sent' if sms_sent else 'failed',
                        error_message=None if sms_sent else sms_reason,
                        attempt=attempt)
            if sms_sent:
                notification.sent_via_sms = True
                retried.append('sms')

    db.commit()

    if retried:
        return {"success": True, "message": f"Retried: {', '.join(retried)}"}
    else:
        return {"success": False, "message": "No channels to retry or all retries failed"}


@router.get("/notifications/stats", response_model=NotificationStatsResponse)
@limiter.limit("30/minute")
async def get_notification_stats(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get notification delivery statistics."""
    # Count by channel and status
    email_sent = db.query(func.count(NotificationDelivery.id)).filter(
        NotificationDelivery.channel == 'email',
        NotificationDelivery.status == 'sent'
    ).scalar() or 0

    email_failed = db.query(func.count(NotificationDelivery.id)).filter(
        NotificationDelivery.channel == 'email',
        NotificationDelivery.status == 'failed'
    ).scalar() or 0

    sms_sent = db.query(func.count(NotificationDelivery.id)).filter(
        NotificationDelivery.channel == 'sms',
        NotificationDelivery.status == 'sent'
    ).scalar() or 0

    sms_failed = db.query(func.count(NotificationDelivery.id)).filter(
        NotificationDelivery.channel == 'sms',
        NotificationDelivery.status == 'failed'
    ).scalar() or 0

    browser_sent = db.query(func.count(NotificationDelivery.id)).filter(
        NotificationDelivery.channel == 'browser',
        NotificationDelivery.status == 'sent'
    ).scalar() or 0

    browser_failed = db.query(func.count(NotificationDelivery.id)).filter(
        NotificationDelivery.channel == 'browser',
        NotificationDelivery.status == 'failed'
    ).scalar() or 0

    total_sent = email_sent + sms_sent + browser_sent
    total_failed = email_failed + sms_failed + browser_failed
    total = total_sent + total_failed

    success_rate = (total_sent / total * 100) if total > 0 else 100.0

    return NotificationStatsResponse(
        total_sent=total_sent,
        total_failed=total_failed,
        email_sent=email_sent,
        email_failed=email_failed,
        sms_sent=sms_sent,
        sms_failed=sms_failed,
        browser_sent=browser_sent,
        browser_failed=browser_failed,
        success_rate=round(success_rate, 1)
    )

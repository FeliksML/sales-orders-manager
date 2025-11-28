"""
Audit Trail API Endpoints
Provides endpoints for viewing audit history and reverting changes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address

from .database import get_db
from .models import User, Order
from .schemas import AuditLogResponse, AuditHistoryResponse, RevertRequest, UserActivitySummary
from .auth import get_current_user
from . import audit_service

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter()


@router.get("/{order_id}/history", response_model=AuditHistoryResponse)
@limiter.limit("60/minute")
def get_order_history(
    request: Request,
    order_id: int,
    limit: Optional[int] = Query(None, description="Limit number of audit logs returned"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get complete audit history for an order"""
    # Verify order belongs to current user
    order = db.query(Order).filter(
        Order.orderid == order_id,
        Order.userid == current_user.userid
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Get audit logs
    audit_logs = audit_service.get_order_audit_history(db, order_id, limit)

    return AuditHistoryResponse(
        order_id=order_id,
        total_changes=len(audit_logs),
        audit_logs=audit_logs
    )


@router.post("/{order_id}/revert", response_model=dict)
@limiter.limit("10/minute")
def revert_order(
    request: Request,
    order_id: int,
    revert_request: RevertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revert an order to its state at a specific timestamp"""
    # Verify order belongs to current user
    order = db.query(Order).filter(
        Order.orderid == order_id,
        Order.userid == current_user.userid
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Perform revert
    reverted_order = audit_service.revert_order_to_timestamp(
        db=db,
        order_id=order_id,
        timestamp=revert_request.timestamp,
        user=current_user,
        ip_address=None
    )

    if not reverted_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to revert order to the specified timestamp"
        )

    return {
        "message": f"Order successfully reverted to state at {revert_request.timestamp.isoformat()}",
        "order_id": order_id,
        "reverted_to": revert_request.timestamp.isoformat()
    }


@router.get("/{order_id}/snapshot")
@limiter.limit("60/minute")
def get_order_snapshot_at_time(
    request: Request,
    order_id: int,
    timestamp: datetime = Query(..., description="Timestamp to get order snapshot"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a snapshot of an order's state at a specific timestamp (preview before revert)"""
    # Verify order belongs to current user
    order = db.query(Order).filter(
        Order.orderid == order_id,
        Order.userid == current_user.userid
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Get snapshot
    snapshot = audit_service.get_order_at_timestamp(db, order_id, timestamp)

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No snapshot available at the specified timestamp"
        )

    return {
        "order_id": order_id,
        "timestamp": timestamp.isoformat(),
        "snapshot": snapshot
    }


@router.get("/user/activity", response_model=UserActivitySummary)
@limiter.limit("30/minute")
def get_user_activity(
    request: Request,
    days: int = Query(30, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get activity summary for the current user"""
    summary = audit_service.get_user_activity_summary(db, current_user.userid, days)
    return UserActivitySummary(**summary)


@router.get("/orders/recent-changes", response_model=List[AuditLogResponse])
@limiter.limit("30/minute")
def get_recent_changes(
    request: Request,
    limit: int = Query(50, description="Number of recent changes to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent changes across all orders for the current user"""
    from .models import AuditLog

    # Get all order IDs for current user
    user_orders = db.query(Order.orderid).filter(
        Order.userid == current_user.userid
    ).all()
    order_ids = [order[0] for order in user_orders]

    if not order_ids:
        return []

    # Get recent audit logs for these orders
    recent_logs = db.query(AuditLog).filter(
        AuditLog.entity_type == 'order',
        AuditLog.entity_id.in_(order_ids)
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()

    return recent_logs

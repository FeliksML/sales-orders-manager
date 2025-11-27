"""
Follow-up reminders API router.
Allows sales reps to schedule and manage post-installation follow-ups.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional
from datetime import datetime, timedelta
import logging

from .database import get_db
from .models import User, Order, FollowUp
from .auth import get_current_user
from .schemas import (
    FollowUpCreate, FollowUpUpdate, FollowUpSnooze,
    FollowUpResponse, FollowUpOrderInfo, TodaysFollowUpsResponse,
    PaginatedFollowUpResponse, PaginationMeta
)

logger = logging.getLogger(__name__)

router = APIRouter()


def get_followup_with_order(followup: FollowUp, db: Session) -> FollowUpResponse:
    """Helper to build FollowUpResponse with embedded order info"""
    order = db.query(Order).filter(Order.orderid == followup.order_id).first()
    order_info = None
    if order:
        order_info = FollowUpOrderInfo(
            orderid=order.orderid,
            customer_name=order.customer_name,
            business_name=order.business_name,
            customer_phone=order.customer_phone,
            install_date=order.install_date
        )
    
    return FollowUpResponse(
        id=followup.id,
        order_id=followup.order_id,
        user_id=followup.user_id,
        due_date=followup.due_date,
        note=followup.note,
        status=followup.status,
        completed_at=followup.completed_at,
        snoozed_until=followup.snoozed_until,
        notification_sent=followup.notification_sent,
        created_at=followup.created_at,
        updated_at=followup.updated_at,
        order=order_info
    )


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_followup(
    followup_data: FollowUpCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new follow-up reminder for an order"""
    
    # Verify the order exists and belongs to the current user
    order = db.query(Order).filter(
        and_(
            Order.orderid == followup_data.order_id,
            Order.userid == current_user.userid
        )
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or doesn't belong to you"
        )
    
    # Create the follow-up
    followup = FollowUp(
        order_id=followup_data.order_id,
        user_id=current_user.userid,
        due_date=followup_data.due_date,
        note=followup_data.note,
        status='pending'
    )
    
    db.add(followup)
    db.commit()
    db.refresh(followup)
    
    logger.info(f"Created follow-up {followup.id} for order {followup_data.order_id} by user {current_user.userid}")
    
    return get_followup_with_order(followup, db)


@router.get("", response_model=PaginatedFollowUpResponse)
def list_followups(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,  # pending, completed, snoozed
    include_completed: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's follow-ups with optional filtering"""
    
    query = db.query(FollowUp).filter(FollowUp.user_id == current_user.userid)
    
    # Apply status filter
    if status_filter:
        query = query.filter(FollowUp.status == status_filter)
    elif not include_completed:
        # By default, exclude completed follow-ups
        query = query.filter(FollowUp.status != 'completed')
    
    # Get total count
    total = query.count()
    
    # Order by due_date ascending (soonest first)
    followups = query.order_by(FollowUp.due_date.asc()).offset(skip).limit(limit).all()
    
    # Build response with order info
    followup_responses = [get_followup_with_order(f, db) for f in followups]
    
    return PaginatedFollowUpResponse(
        data=followup_responses,
        meta=PaginationMeta(
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + len(followups)) < total
        )
    )


@router.get("/today", response_model=TodaysFollowUpsResponse)
def get_todays_followups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get follow-ups due today (including overdue) for dashboard display"""
    
    now = datetime.utcnow()
    end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Get pending follow-ups that are due today or overdue
    followups = db.query(FollowUp).filter(
        and_(
            FollowUp.user_id == current_user.userid,
            FollowUp.status == 'pending',
            FollowUp.due_date <= end_of_today
        )
    ).order_by(FollowUp.due_date.asc()).all()
    
    # Count overdue (due before start of today)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    overdue_count = sum(1 for f in followups if f.due_date < start_of_today)
    
    # Build response with order info
    followup_responses = [get_followup_with_order(f, db) for f in followups]
    
    return TodaysFollowUpsResponse(
        count=len(followups),
        overdue_count=overdue_count,
        followups=followup_responses
    )


@router.get("/{followup_id}", response_model=FollowUpResponse)
def get_followup(
    followup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single follow-up by ID"""
    
    followup = db.query(FollowUp).filter(
        and_(
            FollowUp.id == followup_id,
            FollowUp.user_id == current_user.userid
        )
    ).first()
    
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    return get_followup_with_order(followup, db)


@router.put("/{followup_id}", response_model=FollowUpResponse)
def update_followup(
    followup_id: int,
    update_data: FollowUpUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a follow-up (edit note, date, or status)"""
    
    followup = db.query(FollowUp).filter(
        and_(
            FollowUp.id == followup_id,
            FollowUp.user_id == current_user.userid
        )
    ).first()
    
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    # Update fields if provided
    if update_data.due_date is not None:
        followup.due_date = update_data.due_date
        # Reset notification_sent if date changed
        followup.notification_sent = False
    
    if update_data.note is not None:
        followup.note = update_data.note
    
    if update_data.status is not None:
        if update_data.status not in ['pending', 'completed', 'snoozed']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be: pending, completed, or snoozed"
            )
        followup.status = update_data.status
        if update_data.status == 'completed':
            followup.completed_at = datetime.utcnow()
    
    followup.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(followup)
    
    logger.info(f"Updated follow-up {followup_id} by user {current_user.userid}")
    
    return get_followup_with_order(followup, db)


@router.post("/{followup_id}/complete", response_model=FollowUpResponse)
def complete_followup(
    followup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a follow-up as completed"""
    
    followup = db.query(FollowUp).filter(
        and_(
            FollowUp.id == followup_id,
            FollowUp.user_id == current_user.userid
        )
    ).first()
    
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    followup.status = 'completed'
    followup.completed_at = datetime.utcnow()
    followup.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(followup)
    
    logger.info(f"Completed follow-up {followup_id} by user {current_user.userid}")
    
    return get_followup_with_order(followup, db)


@router.post("/{followup_id}/snooze", response_model=FollowUpResponse)
def snooze_followup(
    followup_id: int,
    snooze_data: FollowUpSnooze,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Snooze a follow-up by specified number of days (default 1)"""
    
    followup = db.query(FollowUp).filter(
        and_(
            FollowUp.id == followup_id,
            FollowUp.user_id == current_user.userid
        )
    ).first()
    
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    # Calculate new due date
    new_due_date = datetime.utcnow() + timedelta(days=snooze_data.days)
    
    followup.due_date = new_due_date
    followup.snoozed_until = new_due_date
    followup.status = 'pending'  # Reset to pending (in case it was snoozed before)
    followup.notification_sent = False  # Reset notification flag
    followup.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(followup)
    
    logger.info(f"Snoozed follow-up {followup_id} by {snooze_data.days} days by user {current_user.userid}")
    
    return get_followup_with_order(followup, db)


@router.delete("/{followup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_followup(
    followup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a follow-up"""
    
    followup = db.query(FollowUp).filter(
        and_(
            FollowUp.id == followup_id,
            FollowUp.user_id == current_user.userid
        )
    ).first()
    
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    db.delete(followup)
    db.commit()
    
    logger.info(f"Deleted follow-up {followup_id} by user {current_user.userid}")
    
    return None


@router.get("/order/{order_id}", response_model=list[FollowUpResponse])
def get_followups_for_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all follow-ups for a specific order"""
    
    # Verify order belongs to user
    order = db.query(Order).filter(
        and_(
            Order.orderid == order_id,
            Order.userid == current_user.userid
        )
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or doesn't belong to you"
        )
    
    followups = db.query(FollowUp).filter(
        and_(
            FollowUp.order_id == order_id,
            FollowUp.user_id == current_user.userid
        )
    ).order_by(FollowUp.due_date.desc()).all()
    
    return [get_followup_with_order(f, db) for f in followups]


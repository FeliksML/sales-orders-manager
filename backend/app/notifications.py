from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from .database import get_db
from .models import User, Notification, Order
from .auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# Valid US timezones for notification scheduling
US_TIMEZONES = [
    'America/New_York',      # Eastern Time
    'America/Chicago',       # Central Time
    'America/Denver',        # Mountain Time
    'America/Los_Angeles',   # Pacific Time
    'America/Anchorage',     # Alaska Time
    'America/Phoenix',       # Arizona (no DST)
    'Pacific/Honolulu',      # Hawaii Time
]


# Pydantic schemas
class NotificationPreferences(BaseModel):
    phone_number: Optional[str] = None
    email_notifications: bool = True
    sms_notifications: bool = False
    browser_notifications: bool = True
    timezone: str = 'America/Los_Angeles'


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notificationid: int
    notification_type: str
    title: str
    message: str
    sent_via_email: bool
    sent_via_sms: bool
    sent_via_browser: bool
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime]
    orderid: Optional[int]
    account_name: Optional[str] = None  # Business name from associated order
    customer_name: Optional[str] = None  # Customer name from associated order


class NotificationUpdate(BaseModel):
    is_read: bool


class UnreadCountResponse(BaseModel):
    unread_count: int


# Notification Preferences Endpoints
@router.get("/preferences")
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification preferences"""
    return {
        "phone_number": current_user.phone_number,
        "email_notifications": current_user.email_notifications,
        "sms_notifications": current_user.sms_notifications,
        "browser_notifications": current_user.browser_notifications,
        "timezone": current_user.timezone or 'America/Los_Angeles'
    }


@router.put("/preferences")
def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""

    # Update preferences
    if preferences.phone_number is not None:
        current_user.phone_number = preferences.phone_number

    current_user.email_notifications = preferences.email_notifications
    current_user.sms_notifications = preferences.sms_notifications
    current_user.browser_notifications = preferences.browser_notifications

    # Validate and update timezone
    if preferences.timezone and preferences.timezone in US_TIMEZONES:
        current_user.timezone = preferences.timezone
    elif preferences.timezone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone. Must be one of: {', '.join(US_TIMEZONES)}"
        )

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Notification preferences updated successfully",
        "preferences": {
            "phone_number": current_user.phone_number,
            "email_notifications": current_user.email_notifications,
            "sms_notifications": current_user.sms_notifications,
            "browser_notifications": current_user.browser_notifications,
            "timezone": current_user.timezone
        }
    }


# Notification History Endpoints
@router.get("", response_model=List[NotificationResponse])  # Empty string, not "/" to match /api/notifications exactly
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notifications with account names from associated orders"""

    query = db.query(Notification).filter(Notification.userid == current_user.userid)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

    # Enrich notifications with account_name from associated orders
    result = []
    for notification in notifications:
        notification_dict = {
            "notificationid": notification.notificationid,
            "notification_type": notification.notification_type,
            "title": notification.title,
            "message": notification.message,
            "sent_via_email": notification.sent_via_email,
            "sent_via_sms": notification.sent_via_sms,
            "sent_via_browser": notification.sent_via_browser,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
            "read_at": notification.read_at,
            "orderid": notification.orderid,
            "account_name": None,
            "customer_name": None
        }

        # Get account name and customer name from associated order if exists
        if notification.orderid:
            order = db.query(Order).filter(Order.orderid == notification.orderid).first()
            if order:
                notification_dict["account_name"] = order.business_name
                notification_dict["customer_name"] = order.customer_name

        result.append(notification_dict)

    return result


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""

    count = db.query(Notification).filter(
        and_(
            Notification.userid == current_user.userid,
            Notification.is_read == False
        )
    ).count()

    return {"unread_count": count}


@router.put("/{notification_id}")
def update_notification(
    notification_id: int,
    update: NotificationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification (mark as read/unread)"""

    notification = db.query(Notification).filter(
        and_(
            Notification.notificationid == notification_id,
            Notification.userid == current_user.userid
        )
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.is_read = update.is_read
    if update.is_read and not notification.read_at:
        notification.read_at = datetime.utcnow()
    elif not update.is_read:
        notification.read_at = None

    db.commit()
    db.refresh(notification)

    return {"message": "Notification updated successfully", "notification": notification}


@router.post("/mark-all-read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""

    db.query(Notification).filter(
        and_(
            Notification.userid == current_user.userid,
            Notification.is_read == False
        )
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })

    db.commit()

    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""

    notification = db.query(Notification).filter(
        and_(
            Notification.notificationid == notification_id,
            Notification.userid == current_user.userid
        )
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted successfully"}


@router.delete("")  # Empty string, not "/" to match /api/notifications exactly
def delete_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all notifications for the current user"""

    db.query(Notification).filter(Notification.userid == current_user.userid).delete()
    db.commit()

    return {"message": "All notifications deleted successfully"}

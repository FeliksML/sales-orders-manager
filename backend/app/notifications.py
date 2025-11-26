from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from .database import get_db
from .models import User, Notification, Order
from .auth import get_current_user
from .notification_service import send_install_reminder, send_today_install_notification
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic schemas
class NotificationPreferences(BaseModel):
    phone_number: Optional[str] = None
    email_notifications: bool = True
    sms_notifications: bool = False
    browser_notifications: bool = True


class NotificationResponse(BaseModel):
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

    class Config:
        from_attributes = True


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
        "browser_notifications": current_user.browser_notifications
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

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Notification preferences updated successfully",
        "preferences": {
            "phone_number": current_user.phone_number,
            "email_notifications": current_user.email_notifications,
            "sms_notifications": current_user.sms_notifications,
            "browser_notifications": current_user.browser_notifications
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
    """Get user's notifications"""

    query = db.query(Notification).filter(Notification.userid == current_user.userid)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

    return notifications


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


@router.post("/test/send-reminders")
async def test_send_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test endpoint to manually trigger installation reminders
    Sends reminders for orders scheduled tomorrow and today
    """

    results = {
        "tomorrow_reminders": 0,
        "today_reminders": 0,
        "errors": []
    }

    try:
        # Get installations scheduled for tomorrow
        tomorrow = date.today() + timedelta(days=1)
        tomorrow_orders = db.query(Order).filter(
            and_(
                Order.userid == current_user.userid,
                Order.install_date == tomorrow
            )
        ).all()

        logger.info(f"Found {len(tomorrow_orders)} installations scheduled for tomorrow")

        for order in tomorrow_orders:
            try:
                await send_install_reminder(db, current_user, order, hours_before=24)
                results["tomorrow_reminders"] += 1
            except Exception as e:
                logger.error(f"Failed to send reminder for order {order.orderid}: {str(e)}")
                results["errors"].append(f"Order {order.orderid}: {str(e)}")

        # Get installations scheduled for today
        today = date.today()
        today_orders = db.query(Order).filter(
            and_(
                Order.userid == current_user.userid,
                Order.install_date == today
            )
        ).all()

        logger.info(f"Found {len(today_orders)} installations scheduled for today")

        for order in today_orders:
            try:
                await send_today_install_notification(db, current_user, order)
                results["today_reminders"] += 1
            except Exception as e:
                logger.error(f"Failed to send today notification for order {order.orderid}: {str(e)}")
                results["errors"].append(f"Order {order.orderid}: {str(e)}")

        return {
            "message": "Test reminders sent",
            "results": results
        }

    except Exception as e:
        logger.error(f"Test reminder failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test reminders: {str(e)}"
        )

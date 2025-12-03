"""
Notification service for sending email and SMS notifications
Uses Resend API for emails and Telnyx for SMS
"""
import telnyx
from datetime import datetime
from typing import Optional, Tuple
import os
import logging
import time
from functools import wraps
import resend
from .models import User, Order, Notification, Subscription, SMSUsage
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Resend configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
MAIL_FROM = os.getenv("MAIL_FROM", "Sales Order Manager <orders@mail.salesordermanager.us>")
MAIL_REPLY_TO = os.getenv("MAIL_REPLY_TO", "support@salesordermanager.us")

# Initialize Resend client
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Telnyx configuration (replaces Twilio for cost savings)
TELNYX_API_KEY = os.getenv('TELNYX_API_KEY')
TELNYX_PHONE_NUMBER = os.getenv('TELNYX_PHONE_NUMBER')

# SMS subscription settings
FREE_SMS_LIMIT = 10  # Free SMS per month for non-subscribers

# Initialize Telnyx client if credentials are available
telnyx_configured = False
if TELNYX_API_KEY:
    try:
        telnyx.api_key = TELNYX_API_KEY
        telnyx_configured = True
        logger.info("Telnyx client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Telnyx client: {str(e)}")


# =============================================================================
# Retry Helper
# =============================================================================

def with_retry(max_attempts: int = 3, base_delay: float = 1.0, max_delay: float = 30.0):
    """
    Decorator for retry with exponential backoff.

    Args:
        max_attempts: Maximum number of attempts (default 3)
        base_delay: Initial delay in seconds (default 1.0)
        max_delay: Maximum delay cap in seconds (default 30.0)

    Only retries on connection/server errors, not client errors (4xx).
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    error_str = str(e).lower()
                    # Don't retry on client errors (invalid input, auth, etc.)
                    if any(code in error_str for code in ['400', '401', '403', '404', '422']):
                        logger.error(f"{func.__name__} failed with client error: {e}")
                        raise
                    # Retry on connection/server errors
                    if attempt < max_attempts - 1:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        logger.warning(f"{func.__name__} attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                        time.sleep(delay)
                    else:
                        logger.error(f"{func.__name__} failed after {max_attempts} attempts: {e}")
            raise last_exception
        return wrapper
    return decorator


def can_send_sms(db: Session, user_id: int) -> Tuple[bool, str, int, int]:
    """
    Check if user can send SMS based on subscription status and usage.

    Returns:
        Tuple of (can_send, reason, sms_used, sms_limit)
        - can_send: True if SMS can be sent
        - reason: 'ok', 'free_limit_reached', 'not_configured'
        - sms_used: Number of SMS sent this month
        - sms_limit: 10 for free tier, -1 for unlimited (subscribed)
    """
    if not telnyx_configured or not TELNYX_PHONE_NUMBER:
        return False, "not_configured", 0, 0

    # Get current month in YYYY-MM format
    current_month = datetime.now().strftime('%Y-%m')

    # Get current usage
    usage = db.query(SMSUsage).filter(
        SMSUsage.user_id == user_id,
        SMSUsage.month == current_month
    ).first()

    sms_count = usage.sms_count if usage else 0

    # Check subscription status
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id
    ).first()

    is_subscribed = subscription and subscription.status == 'active'

    if is_subscribed:
        # Unlimited for subscribers
        return True, "ok", sms_count, -1

    # Free tier: 10 SMS/month
    if sms_count >= FREE_SMS_LIMIT:
        return False, "free_limit_reached", sms_count, FREE_SMS_LIMIT

    return True, "ok", sms_count, FREE_SMS_LIMIT


def increment_sms_usage(db: Session, user_id: int) -> int:
    """
    Increment SMS usage count for the current month.

    Returns:
        New SMS count for the month
    """
    current_month = datetime.now().strftime('%Y-%m')

    usage = db.query(SMSUsage).filter(
        SMSUsage.user_id == user_id,
        SMSUsage.month == current_month
    ).first()

    if usage:
        usage.sms_count += 1
        new_count = usage.sms_count
    else:
        usage = SMSUsage(user_id=user_id, month=current_month, sms_count=1)
        db.add(usage)
        new_count = 1

    db.commit()
    return new_count


def get_sms_usage(db: Session, user_id: int) -> Tuple[int, int]:
    """
    Get SMS usage for the current month.

    Returns:
        Tuple of (sms_used, sms_limit)
    """
    current_month = datetime.now().strftime('%Y-%m')

    usage = db.query(SMSUsage).filter(
        SMSUsage.user_id == user_id,
        SMSUsage.month == current_month
    ).first()

    sms_count = usage.sms_count if usage else 0

    # Check subscription
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id
    ).first()

    is_subscribed = subscription and subscription.status == 'active'
    sms_limit = -1 if is_subscribed else FREE_SMS_LIMIT

    return sms_count, sms_limit


async def send_email_notification(
    user_email: str,
    user_name: str,
    subject: str,
    title: str,
    message: str,
    order: Optional[Order] = None
):
    """Send email notification using Resend API"""

    if not RESEND_API_KEY:
        logger.error("Resend API key not configured")
        return False

    # Build order details if order is provided
    order_details = ""
    if order:
        order_details = f"""
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Installation Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.customer_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Business:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.business_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Address:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.customer_address or 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Install Date:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.install_date.strftime('%B %d, %Y')}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Install Time:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.install_time}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.customer_phone}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Spectrum Reference:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.spectrum_reference}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Job Number:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.job_number or 'N/A'}</td>
                </tr>
            </table>
        </div>
        """

    html_body = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #1e40af 0%, #059669 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
            }}
            .content {{
                background: #f8f9fa;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{title}</h1>
            <p>{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>
        <div class="content">
            <p>Hi {user_name},</p>
            <p>{message}</p>

            {order_details}

            <div class="footer">
                <p>Questions? Reply to this email or contact support@salesordermanager.us</p>
                <p>To manage your notifications, please log in to your dashboard.</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params: resend.Emails.SendParams = {
            "from": MAIL_FROM,
            "to": [user_email],
            "reply_to": MAIL_REPLY_TO,
            "subject": subject,
            "html": html_body,
        }

        response = resend.Emails.send(params)
        logger.info(f"Email notification sent to {user_email} (id: {response.get('id', 'N/A')})")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {str(e)}")
        return False


def send_sms_notification(phone_number: str, message: str) -> bool:
    """Send SMS notification via Telnyx"""

    if not telnyx_configured:
        logger.warning("Telnyx client not configured. SMS notification skipped.")
        return False

    if not TELNYX_PHONE_NUMBER:
        logger.error("TELNYX_PHONE_NUMBER not configured")
        return False

    try:
        # Format phone number (basic validation)
        if not phone_number.startswith('+'):
            phone_number = f'+1{phone_number}'  # Assume US number

        # Send via Telnyx
        response = telnyx.Message.create(
            from_=TELNYX_PHONE_NUMBER,
            to=phone_number,
            text=message
        )

        logger.info(f"SMS notification sent to {phone_number}. ID: {response.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS to {phone_number}: {str(e)}")
        return False


def send_sms_with_gating(db: Session, user_id: int, phone_number: str, message: str) -> Tuple[bool, str]:
    """
    Send SMS with subscription gating.

    This is the preferred function for sending SMS - it checks subscription
    status and usage limits before sending.

    Returns:
        Tuple of (success, reason)
        - success: True if SMS was sent
        - reason: 'sent', 'free_limit_reached', 'not_configured', 'send_failed'
    """
    # Check if user can send SMS
    can_send, reason, sms_used, sms_limit = can_send_sms(db, user_id)

    if not can_send:
        logger.info(f"SMS blocked for user {user_id}: {reason} (used: {sms_used}/{sms_limit})")
        return False, reason

    # Send the SMS
    success = send_sms_notification(phone_number, message)

    if success:
        # Increment usage counter
        increment_sms_usage(db, user_id)
        return True, "sent"
    else:
        return False, "send_failed"


async def send_install_reminder(
    db: Session,
    user: User,
    order: Order,
    hours_before: int = 24
):
    """Send installation reminder notification"""

    notification_type = f"install_reminder_{hours_before}h"
    title = f"Installation Reminder - {hours_before} Hours"
    message = f"This is a reminder that you have an installation scheduled for tomorrow at {order.install_time}."

    # Create notification record
    notification = Notification(
        userid=user.userid,
        orderid=order.orderid,
        notification_type=notification_type,
        title=title,
        message=message
    )

    # Send via email if enabled
    if user.email_notifications:
        email_sent = await send_email_notification(
            user_email=user.email,
            user_name=user.name,
            subject=f"Installation Reminder - {order.business_name}",
            title=title,
            message=message,
            order=order
        )
        notification.sent_via_email = email_sent

    # Send via SMS if enabled and phone number is available (with subscription gating)
    if user.sms_notifications and user.phone_number:
        sms_message = f"Hi {user.name}, reminder: Installation for {order.business_name} tomorrow at {order.install_time}. Customer: {order.customer_name}, {order.customer_phone}"
        sms_sent, sms_reason = send_sms_with_gating(db, user.userid, user.phone_number, sms_message)
        notification.sent_via_sms = sms_sent

    # Browser notifications handled by frontend
    if user.browser_notifications:
        notification.sent_via_browser = True

    # Save notification to database
    db.add(notification)
    db.commit()

    logger.info(f"Install reminder sent for order {order.orderid} to user {user.userid}")
    return notification


async def send_today_install_notification(
    db: Session,
    user: User,
    order: Order
):
    """Send notification for today's installations"""

    notification_type = "today_install"
    title = "Installation Today"
    message = f"You have an installation scheduled for today at {order.install_time}."

    # Create notification record
    notification = Notification(
        userid=user.userid,
        orderid=order.orderid,
        notification_type=notification_type,
        title=title,
        message=message
    )

    # Send via email if enabled
    if user.email_notifications:
        email_sent = await send_email_notification(
            user_email=user.email,
            user_name=user.name,
            subject=f"Installation Today - {order.business_name}",
            title=title,
            message=message,
            order=order
        )
        notification.sent_via_email = email_sent

    # Send via SMS if enabled (with subscription gating)
    if user.sms_notifications and user.phone_number:
        sms_message = f"Hi {user.name}, installation TODAY at {order.install_time} for {order.business_name}. Customer: {order.customer_name}, {order.customer_phone}"
        sms_sent, sms_reason = send_sms_with_gating(db, user.userid, user.phone_number, sms_message)
        notification.sent_via_sms = sms_sent

    # Browser notifications
    if user.browser_notifications:
        notification.sent_via_browser = True

    # Save notification
    db.add(notification)
    db.commit()

    logger.info(f"Today install notification sent for order {order.orderid} to user {user.userid}")
    return notification


async def send_custom_notification(
    db: Session,
    user: User,
    notification_type: str,
    title: str,
    message: str,
    order: Optional[Order] = None
):
    """Send a custom notification"""

    # Create notification record
    notification = Notification(
        userid=user.userid,
        orderid=order.orderid if order else None,
        notification_type=notification_type,
        title=title,
        message=message
    )

    # Send via configured channels
    if user.email_notifications:
        email_sent = await send_email_notification(
            user_email=user.email,
            user_name=user.name,
            subject=title,
            title=title,
            message=message,
            order=order
        )
        notification.sent_via_email = email_sent

    if user.sms_notifications and user.phone_number:
        sms_message = f"{title}: {message}"
        if order:
            sms_message += f" - {order.business_name}"
        sms_sent, sms_reason = send_sms_with_gating(db, user.userid, user.phone_number, sms_message)
        notification.sent_via_sms = sms_sent

    if user.browser_notifications:
        notification.sent_via_browser = True

    # Save notification
    db.add(notification)
    db.commit()

    return notification


async def send_order_details_email(
    user: User,
    order: Order
):
    """Send complete order details via email using Resend API"""

    if not RESEND_API_KEY:
        logger.error("Resend API key not configured")
        return False

    # Build comprehensive order details including products
    products_html = ""
    products_list = []

    if order.has_internet:
        products_list.append("Internet")
    if order.has_tv:
        products_list.append("TV Service")
    if order.has_wib:
        products_list.append("WIB")
    if order.has_voice > 0:
        products_list.append(f"Voice Lines ({order.has_voice})")
    if order.has_mobile > 0:
        products_list.append(f"Mobile Lines ({order.has_mobile})")
        if order.mobile_activated > 0:
            products_list.append(f"└─ Activated: {order.mobile_activated}/{order.has_mobile}")
    if order.has_sbc > 0:
        products_list.append(f"SBC ({order.has_sbc})")

    if products_list:
        products_html = "<tr><td style='padding: 8px 0; color: #6b7280;'>Products:</td><td style='padding: 8px 0; font-weight: bold;'>" + "<br>".join(products_list) + "</td></tr>"

    notes_html = ""
    if order.notes:
        notes_html = f"<tr><td style='padding: 8px 0; color: #6b7280; vertical-align: top;'>Notes:</td><td style='padding: 8px 0; font-weight: bold;'>{order.notes}</td></tr>"

    html_body = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #1e40af 0%, #059669 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
            }}
            .content {{
                background: #f8f9fa;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }}
            .section {{
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin: 20px 0;
            }}
            .section-title {{
                color: #1e40af;
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 18px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📋 Order Details</h1>
            <p>Order #{order.orderid}</p>
        </div>
        <div class="content">
            <p>Hi {user.name},</p>
            <p>Here are the complete details for your order:</p>

            <div class="section">
                <h3 class="section-title">Customer Information</h3>
                <table>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Customer Name:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.customer_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Business Name:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.business_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.customer_email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.customer_phone}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Address:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.customer_address or 'N/A'}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h3 class="section-title">Order Information</h3>
                <table>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Spectrum Reference:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.spectrum_reference}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Account Number:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.customer_account_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Job Number:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.job_number or 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Security Code:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.customer_security_code or 'N/A'}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h3 class="section-title">Installation Schedule</h3>
                <table>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Install Date:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.install_date.strftime('%A, %B %d, %Y')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Install Time:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{order.install_time}</td>
                    </tr>
                </table>
            </div>

            {f'<div class="section"><h3 class="section-title">Products & Services</h3><table>{products_html}</table></div>' if products_html else ''}

            {f'<div class="section"><h3 class="section-title">Additional Notes</h3><table>{notes_html}</table></div>' if notes_html else ''}

            <div class="footer">
                <p>Questions? Reply to this email or contact support@salesordermanager.us</p>
                <p>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params: resend.Emails.SendParams = {
            "from": MAIL_FROM,
            "to": [user.email],
            "reply_to": MAIL_REPLY_TO,
            "subject": f"Order Details - {order.business_name} (Order #{order.orderid})",
            "html": html_body,
        }

        response = resend.Emails.send(params)
        logger.info(f"Order details email sent to {user.email} for order {order.orderid} (id: {response.get('id', 'N/A')})")
        return True
    except Exception as e:
        logger.error(f"Failed to send order details email to {user.email}: {str(e)}")
        return False


# =============================================================================
# New SMS Trigger Functions (Phase 5)
# =============================================================================

def send_new_order_sms(db: Session, user: User, order: Order) -> bool:
    """
    Send SMS notification to sales rep when a new order is created.

    Args:
        db: Database session
        user: The sales rep who owns the order
        order: The newly created order

    Returns:
        True if SMS was sent successfully, False otherwise
    """
    if not user.sms_notifications or not user.phone_number:
        return False

    message = f"New order: {order.business_name} - Install {order.install_date.strftime('%m/%d')} at {order.install_time}"

    success, reason = send_sms_with_gating(db, user.userid, user.phone_number, message)

    if success:
        logger.info(f"New order SMS sent to user {user.userid} for order {order.orderid}")
    else:
        logger.info(f"New order SMS not sent for user {user.userid}: {reason}")

    return success


def send_order_rescheduled_sms(
    db: Session,
    user: User,
    order: Order,
    old_date,
    new_date
) -> bool:
    """
    Send SMS notification to sales rep when an order is rescheduled.

    Args:
        db: Database session
        user: The sales rep who owns the order
        order: The rescheduled order
        old_date: Previous install date
        new_date: New install date

    Returns:
        True if SMS was sent successfully, False otherwise
    """
    if not user.sms_notifications or not user.phone_number:
        return False

    # Format dates for SMS
    old_date_str = old_date.strftime('%m/%d') if hasattr(old_date, 'strftime') else str(old_date)
    new_date_str = new_date.strftime('%m/%d') if hasattr(new_date, 'strftime') else str(new_date)

    message = f"Rescheduled: {order.business_name} moved from {old_date_str} to {new_date_str}"

    success, reason = send_sms_with_gating(db, user.userid, user.phone_number, message)

    if success:
        logger.info(f"Reschedule SMS sent to user {user.userid} for order {order.orderid}")
    else:
        logger.info(f"Reschedule SMS not sent for user {user.userid}: {reason}")

    return success


# =============================================================================
# Synchronous Notification Functions (for scheduler jobs)
# =============================================================================

@with_retry(max_attempts=3, base_delay=1.0)
def send_email_notification_sync(
    user_email: str,
    user_name: str,
    subject: str,
    title: str,
    message: str,
    order: Optional[Order] = None
) -> bool:
    """
    Synchronous email notification with retry.
    Used by scheduler jobs running in thread context.
    """
    if not RESEND_API_KEY:
        logger.error("Resend API key not configured")
        return False

    # Build order details if order is provided
    order_details = ""
    if order:
        order_details = f"""
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Installation Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.customer_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Business:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.business_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Address:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.customer_address or 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Install Date:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.install_date.strftime('%B %d, %Y')}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Install Time:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.install_time}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.customer_phone}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Spectrum Reference:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.spectrum_reference}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Job Number:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{order.job_number or 'N/A'}</td>
                </tr>
            </table>
        </div>
        """

    html_body = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #1e40af 0%, #059669 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
            }}
            .content {{
                background: #f8f9fa;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{title}</h1>
            <p>{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>
        <div class="content">
            <p>Hi {user_name},</p>
            <p>{message}</p>

            {order_details}

            <div class="footer">
                <p>Questions? Reply to this email or contact support@salesordermanager.us</p>
                <p>To manage your notifications, please log in to your dashboard.</p>
            </div>
        </div>
    </body>
    </html>
    """

    params: resend.Emails.SendParams = {
        "from": MAIL_FROM,
        "to": [user_email],
        "reply_to": MAIL_REPLY_TO,
        "subject": subject,
        "html": html_body,
    }

    response = resend.Emails.send(params)
    logger.info(f"Email notification sent to {user_email} (id: {response.get('id', 'N/A')})")
    return True


def send_install_reminder_sync(
    db: Session,
    user: User,
    order: Order,
    hours_before: int = 24,
    commit: bool = True
) -> Notification:
    """
    Synchronous install reminder for scheduler jobs.

    Args:
        db: Database session
        user: User to notify
        order: Order for the reminder
        hours_before: Hours before installation
        commit: Whether to commit the transaction (default True)
    """
    notification_type = f"install_reminder_{hours_before}h"
    title = f"Installation Reminder - {hours_before} Hours"
    message = f"This is a reminder that you have an installation scheduled for tomorrow at {order.install_time}."

    # Create notification record
    notification = Notification(
        userid=user.userid,
        orderid=order.orderid,
        notification_type=notification_type,
        title=title,
        message=message
    )

    # Send via email if enabled
    if user.email_notifications:
        try:
            email_sent = send_email_notification_sync(
                user_email=user.email,
                user_name=user.name,
                subject=f"Installation Reminder - {order.business_name}",
                title=title,
                message=message,
                order=order
            )
            notification.sent_via_email = email_sent
        except Exception as e:
            logger.error(f"Email failed for install reminder: {e}")
            notification.sent_via_email = False

    # Send via SMS if enabled (with subscription gating)
    if user.sms_notifications and user.phone_number:
        sms_message = f"Hi {user.name}, reminder: Installation for {order.business_name} tomorrow at {order.install_time}. Customer: {order.customer_name}, {order.customer_phone}"
        sms_sent, sms_reason = send_sms_with_gating(db, user.userid, user.phone_number, sms_message)
        notification.sent_via_sms = sms_sent

    # Browser notifications handled by frontend
    if user.browser_notifications:
        notification.sent_via_browser = True

    # Save notification to database
    db.add(notification)
    if commit:
        db.commit()

    logger.info(f"Install reminder sent for order {order.orderid} to user {user.userid}")
    return notification


def send_today_install_notification_sync(
    db: Session,
    user: User,
    order: Order,
    commit: bool = True
) -> Notification:
    """
    Synchronous today's install notification for scheduler jobs.

    Args:
        db: Database session
        user: User to notify
        order: Order for the notification
        commit: Whether to commit the transaction (default True)
    """
    notification_type = "today_install"
    title = "Installation Today"
    message = f"You have an installation scheduled for today at {order.install_time}."

    # Create notification record
    notification = Notification(
        userid=user.userid,
        orderid=order.orderid,
        notification_type=notification_type,
        title=title,
        message=message
    )

    # Send via email if enabled
    if user.email_notifications:
        try:
            email_sent = send_email_notification_sync(
                user_email=user.email,
                user_name=user.name,
                subject=f"Installation Today - {order.business_name}",
                title=title,
                message=message,
                order=order
            )
            notification.sent_via_email = email_sent
        except Exception as e:
            logger.error(f"Email failed for today install notification: {e}")
            notification.sent_via_email = False

    # Send via SMS if enabled (with subscription gating)
    if user.sms_notifications and user.phone_number:
        sms_message = f"Hi {user.name}, installation TODAY at {order.install_time} for {order.business_name}. Customer: {order.customer_name}, {order.customer_phone}"
        sms_sent, sms_reason = send_sms_with_gating(db, user.userid, user.phone_number, sms_message)
        notification.sent_via_sms = sms_sent

    # Browser notifications
    if user.browser_notifications:
        notification.sent_via_browser = True

    # Save notification
    db.add(notification)
    if commit:
        db.commit()

    logger.info(f"Today install notification sent for order {order.orderid} to user {user.userid}")
    return notification


def send_custom_notification_sync(
    db: Session,
    user: User,
    notification_type: str,
    title: str,
    message: str,
    order: Optional[Order] = None,
    commit: bool = True
) -> Notification:
    """
    Synchronous custom notification for scheduler jobs.

    Args:
        db: Database session
        user: User to notify
        notification_type: Type of notification
        title: Notification title
        message: Notification message
        order: Optional order reference
        commit: Whether to commit the transaction (default True)
    """
    # Create notification record
    notification = Notification(
        userid=user.userid,
        orderid=order.orderid if order else None,
        notification_type=notification_type,
        title=title,
        message=message
    )

    # Send via configured channels
    if user.email_notifications:
        try:
            email_sent = send_email_notification_sync(
                user_email=user.email,
                user_name=user.name,
                subject=title,
                title=title,
                message=message,
                order=order
            )
            notification.sent_via_email = email_sent
        except Exception as e:
            logger.error(f"Email failed for custom notification: {e}")
            notification.sent_via_email = False

    if user.sms_notifications and user.phone_number:
        sms_message = f"{title}: {message}"
        if order:
            sms_message += f" - {order.business_name}"
        sms_sent, sms_reason = send_sms_with_gating(db, user.userid, user.phone_number, sms_message)
        notification.sent_via_sms = sms_sent

    if user.browser_notifications:
        notification.sent_via_browser = True

    # Save notification
    db.add(notification)
    if commit:
        db.commit()

    return notification

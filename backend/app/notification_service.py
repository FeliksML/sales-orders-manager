"""
Notification service for sending email and SMS notifications
Uses Resend API for emails
"""
from twilio.rest import Client
from datetime import datetime
from typing import Optional
import os
import logging
import resend
from .models import User, Order, Notification
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

# Twilio configuration (from environment variables)
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')

# Initialize Twilio client if credentials are available
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Twilio client: {str(e)}")


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
    """Send SMS notification via Twilio"""

    if not twilio_client:
        logger.warning("Twilio client not configured. SMS notification skipped.")
        return False

    if not TWILIO_PHONE_NUMBER:
        logger.error("TWILIO_PHONE_NUMBER not configured")
        return False

    try:
        # Format phone number (basic validation)
        if not phone_number.startswith('+'):
            phone_number = f'+1{phone_number}'  # Assume US number

        message_obj = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )

        logger.info(f"SMS notification sent to {phone_number}. SID: {message_obj.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS to {phone_number}: {str(e)}")
        return False


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

    # Send via SMS if enabled and phone number is available
    if user.sms_notifications and user.phone_number:
        sms_message = f"Hi {user.name}, reminder: Installation for {order.business_name} tomorrow at {order.install_time}. Customer: {order.customer_name}, {order.customer_phone}"
        sms_sent = send_sms_notification(user.phone_number, sms_message)
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

    # Send via SMS if enabled
    if user.sms_notifications and user.phone_number:
        sms_message = f"Hi {user.name}, installation TODAY at {order.install_time} for {order.business_name}. Customer: {order.customer_name}, {order.customer_phone}"
        sms_sent = send_sms_notification(user.phone_number, sms_message)
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
        sms_sent = send_sms_notification(user.phone_number, sms_message)
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

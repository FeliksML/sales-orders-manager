from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import Optional
import logging
import asyncio
from .database import SessionLocal
from .models import User, Order, Notification, FollowUp
from .export_utils import generate_stats_excel
from .email_service import send_scheduled_report_email
from .notification_service import send_install_reminder, send_today_install_notification, send_custom_notification
from sqlalchemy import func, and_, extract

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = BackgroundScheduler()

# In-memory storage for scheduled reports (in production, use database)
scheduled_reports = {}

def get_user_stats(db: Session, user_id: int) -> dict:
    """Get order statistics for a user"""
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

    return {
        'total_orders': total_orders,
        'this_week': this_week,
        'this_month': this_month,
        'pending_installs': pending_installs,
        'total_internet': total_internet,
        'total_tv': total_tv,
        'total_mobile': int(total_mobile),
        'total_voice': int(total_voice)
    }

def send_report_job(user_id: int, user_email: str, user_name: str, schedule_type: str):
    """Job to send scheduled report"""
    import asyncio

    logger.info(f"Running scheduled {schedule_type} report for user {user_id}")

    db = SessionLocal()
    try:
        # Get stats
        stats = get_user_stats(db, user_id)

        # Get recent orders
        orders = db.query(Order).filter(Order.userid == user_id).limit(100).all()

        # Generate Excel
        excel_data = generate_stats_excel(stats, orders)

        # Send email using asyncio.run for background job
        asyncio.run(send_scheduled_report_email(
            user_email=user_email,
            user_name=user_name,
            schedule_type=schedule_type,
            stats=stats,
            excel_data=excel_data
        ))

        logger.info(f"Successfully sent {schedule_type} report to {user_email}")

    except Exception as e:
        logger.error(f"Failed to send scheduled report for user {user_id}: {str(e)}")
    finally:
        db.close()

def add_scheduled_report(
    user_id: int,
    user_email: str,
    user_name: str,
    schedule_type: str  # 'weekly' or 'monthly'
) -> str:
    """Add a scheduled report job"""
    job_id = f"{user_id}_{schedule_type}"

    # Remove existing job if any
    remove_scheduled_report(job_id)

    # Determine trigger
    if schedule_type == 'weekly':
        # Every Monday at 9 AM
        trigger = CronTrigger(day_of_week='mon', hour=9, minute=0)
    elif schedule_type == 'monthly':
        # First day of month at 9 AM
        trigger = CronTrigger(day=1, hour=9, minute=0)
    else:
        raise ValueError(f"Invalid schedule type: {schedule_type}")

    # Add job
    scheduler.add_job(
        send_report_job,
        trigger=trigger,
        args=[user_id, user_email, user_name, schedule_type],
        id=job_id,
        replace_existing=True
    )

    # Store in memory
    scheduled_reports[job_id] = {
        'user_id': user_id,
        'user_email': user_email,
        'user_name': user_name,
        'schedule_type': schedule_type,
        'created_at': datetime.now()
    }

    logger.info(f"Added {schedule_type} scheduled report for user {user_id}")
    return job_id

def remove_scheduled_report(job_id: str):
    """Remove a scheduled report job"""
    try:
        scheduler.remove_job(job_id)
        if job_id in scheduled_reports:
            del scheduled_reports[job_id]
        logger.info(f"Removed scheduled report {job_id}")
    except Exception as e:
        logger.debug(f"Job {job_id} not found or already removed: {str(e)}")

def get_user_scheduled_reports(user_id: int) -> list:
    """Get all scheduled reports for a user"""
    reports = []
    for job_id, report in scheduled_reports.items():
        if report['user_id'] == user_id:
            reports.append({
                'job_id': job_id,
                'schedule_type': report['schedule_type'],
                'created_at': report['created_at']
            })
    return reports

def check_installation_reminders():
    """Check and send 24-hour installation reminders"""
    logger.info("=" * 50)
    logger.info("Running installation reminder check")
    logger.info(f"Current time: {datetime.now()}")

    db = SessionLocal()
    try:
        # Get installations scheduled for tomorrow
        tomorrow = date.today() + timedelta(days=1)
        logger.info(f"Checking for installations on: {tomorrow}")

        # Get all orders scheduled for tomorrow
        orders = db.query(Order).filter(Order.install_date == tomorrow).all()

        logger.info(f"Found {len(orders)} total installations scheduled for tomorrow")

        reminders_sent = 0
        for order in orders:
            # Get user
            user = db.query(User).filter(User.userid == order.userid).first()
            if not user:
                logger.warning(f"User not found for order {order.orderid}")
                continue

            logger.info(f"Processing order {order.orderid} for user {user.email}")

            # Check if reminder was already sent today
            existing_notification = db.query(func.count(Notification.notificationid)).filter(
                and_(
                    Notification.userid == user.userid,
                    Notification.orderid == order.orderid,
                    Notification.notification_type == 'install_reminder_24h',
                    func.date(Notification.created_at) == date.today()
                )
            ).scalar()

            if existing_notification > 0:
                logger.info(f"Reminder already sent today for order {order.orderid}")
                continue

            # Check if user wants notifications
            if user.email_notifications or user.sms_notifications or user.browser_notifications:
                logger.info(f"Sending reminder to {user.email} for order {order.orderid}")
                asyncio.run(send_install_reminder(db, user, order, hours_before=24))
                reminders_sent += 1
            else:
                logger.info(f"User {user.email} has all notifications disabled")

        logger.info(f"Sent {reminders_sent} new reminders")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"Failed to send installation reminders: {str(e)}", exc_info=True)
    finally:
        db.close()


def check_today_installations():
    """Check and send notifications for today's installations"""
    logger.info("=" * 50)
    logger.info("Running today's installation check")
    logger.info(f"Current time: {datetime.now()}")

    db = SessionLocal()
    try:
        # Get installations scheduled for today
        today = date.today()
        logger.info(f"Checking for installations on: {today}")

        # Get all orders scheduled for today
        orders = db.query(Order).filter(Order.install_date == today).all()

        logger.info(f"Found {len(orders)} total installations scheduled for today")

        notifications_sent = 0
        for order in orders:
            # Get user
            user = db.query(User).filter(User.userid == order.userid).first()
            if not user:
                logger.warning(f"User not found for order {order.orderid}")
                continue

            logger.info(f"Processing order {order.orderid} for user {user.email}")

            # Check if notification was already sent today
            existing_notification = db.query(func.count(Notification.notificationid)).filter(
                and_(
                    Notification.userid == user.userid,
                    Notification.orderid == order.orderid,
                    Notification.notification_type == 'today_install',
                    func.date(Notification.created_at) == date.today()
                )
            ).scalar()

            if existing_notification > 0:
                logger.info(f"Today notification already sent for order {order.orderid}")
                continue

            # Check if user wants notifications
            if user.email_notifications or user.sms_notifications or user.browser_notifications:
                logger.info(f"Sending today notification to {user.email} for order {order.orderid}")
                asyncio.run(send_today_install_notification(db, user, order))
                notifications_sent += 1
            else:
                logger.info(f"User {user.email} has all notifications disabled")

        logger.info(f"Sent {notifications_sent} new today notifications")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"Failed to send today installation notifications: {str(e)}", exc_info=True)
    finally:
        db.close()


def check_due_followups():
    """Check and send notifications for due follow-up reminders"""
    logger.info("=" * 50)
    logger.info("Running follow-up reminder check")
    logger.info(f"Current time: {datetime.now()}")

    db = SessionLocal()
    try:
        now = datetime.utcnow()
        # Check for follow-ups due within the next hour that haven't been notified
        one_hour_from_now = now + timedelta(hours=1)
        
        # Get pending follow-ups that are due and haven't been notified
        followups = db.query(FollowUp).filter(
            and_(
                FollowUp.status == 'pending',
                FollowUp.due_date <= one_hour_from_now,
                FollowUp.notification_sent == False
            )
        ).all()

        logger.info(f"Found {len(followups)} follow-ups due for notification")

        notifications_sent = 0
        for followup in followups:
            # Get user
            user = db.query(User).filter(User.userid == followup.user_id).first()
            if not user:
                logger.warning(f"User not found for follow-up {followup.id}")
                continue

            # Get order
            order = db.query(Order).filter(Order.orderid == followup.order_id).first()
            if not order:
                logger.warning(f"Order not found for follow-up {followup.id}")
                continue

            logger.info(f"Processing follow-up {followup.id} for user {user.email}")

            # Check if user wants notifications
            if user.email_notifications or user.sms_notifications or user.browser_notifications:
                # Build notification message
                note_text = f" Note: {followup.note}" if followup.note else ""
                title = "Follow-Up Reminder"
                message = f"Time to follow up with {order.customer_name} at {order.business_name}.{note_text}"

                logger.info(f"Sending follow-up notification to {user.email} for order {order.orderid}")
                asyncio.run(send_custom_notification(
                    db=db,
                    user=user,
                    notification_type='followup_due',
                    title=title,
                    message=message,
                    order=order
                ))
                
                # Mark as notified
                followup.notification_sent = True
                db.commit()
                
                notifications_sent += 1
            else:
                logger.info(f"User {user.email} has all notifications disabled")

        logger.info(f"Sent {notifications_sent} follow-up notifications")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"Failed to send follow-up notifications: {str(e)}", exc_info=True)
    finally:
        db.close()


def start_scheduler():
    """Start the scheduler"""
    if not scheduler.running:
        logger.info("=" * 70)
        logger.info("STARTING NOTIFICATION SCHEDULER")
        logger.info("=" * 70)

        # Add installation reminder job (runs every hour to continuously check)
        scheduler.add_job(
            check_installation_reminders,
            trigger=CronTrigger(hour='*', minute=0),  # Every hour
            id='installation_reminders',
            replace_existing=True
        )
        logger.info("✓ Added installation reminder job (runs every hour)")

        # Add today's installation notification job (runs every 2 hours)
        scheduler.add_job(
            check_today_installations,
            trigger=CronTrigger(hour='*/2', minute=0),  # Every 2 hours
            id='today_installations',
            replace_existing=True
        )
        logger.info("✓ Added today installation notification job (runs every 2 hours)")

        # Add follow-up reminder job (runs every 30 minutes)
        scheduler.add_job(
            check_due_followups,
            trigger=CronTrigger(minute='0,30'),  # Every 30 minutes
            id='followup_reminders',
            replace_existing=True
        )
        logger.info("✓ Added follow-up reminder job (runs every 30 minutes)")

        scheduler.start()
        logger.info("✓ Scheduler started successfully")
        logger.info("=" * 70)

        # Run checks immediately on startup
        logger.info("Running initial notification checks on startup...")
        try:
            check_installation_reminders()
            check_today_installations()
            check_due_followups()
        except Exception as e:
            logger.error(f"Failed to run initial checks: {str(e)}")
    else:
        logger.warning("Scheduler already running")

def shutdown_scheduler():
    """Shutdown the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shutdown")

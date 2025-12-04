from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import Optional, Tuple
import logging
import fcntl
import os
import re
from zoneinfo import ZoneInfo
from .database import SessionLocal
from .models import User, Order, Notification, FollowUp
from .export_utils import generate_stats_excel
from .email_service import send_scheduled_report_email_sync
from .notification_service import (
    send_install_reminder_sync,
    send_today_install_notification_sync,
    send_custom_notification_sync
)
from sqlalchemy import func, and_, extract, text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = BackgroundScheduler()

# Scheduler lock to prevent multiple workers from running scheduler
SCHEDULER_LOCK_FILE = "/tmp/sales_order_scheduler.lock"
_scheduler_lock_fd = None


def acquire_scheduler_lock() -> bool:
    """
    Try to acquire exclusive scheduler lock.
    Returns True if acquired, False if another worker already has it.
    Only one gunicorn worker should run the scheduler.
    """
    global _scheduler_lock_fd
    try:
        _scheduler_lock_fd = open(SCHEDULER_LOCK_FILE, 'w')
        fcntl.flock(_scheduler_lock_fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        _scheduler_lock_fd.write(str(os.getpid()))
        _scheduler_lock_fd.flush()
        logger.info(f"Acquired scheduler lock (PID: {os.getpid()})")
        return True
    except (IOError, OSError) as e:
        logger.info(f"Could not acquire scheduler lock (another worker owns it): {e}")
        if _scheduler_lock_fd:
            _scheduler_lock_fd.close()
            _scheduler_lock_fd = None
        return False


def release_scheduler_lock():
    """Release the scheduler lock."""
    global _scheduler_lock_fd
    if _scheduler_lock_fd:
        try:
            fcntl.flock(_scheduler_lock_fd.fileno(), fcntl.LOCK_UN)
            _scheduler_lock_fd.close()
            logger.info("Released scheduler lock")
        except Exception as e:
            logger.warning(f"Error releasing scheduler lock: {e}")
        _scheduler_lock_fd = None


def parse_install_datetime(install_date: date, install_time: str) -> Optional[datetime]:
    """
    Parse install_time string into a datetime combined with install_date.
    Handles various formats: "9:00 AM", "9AM", "9AM-12PM", "8-10AM", etc.
    Returns the START of the time window.
    """
    if not install_time:
        # Default to 9 AM if no time specified
        return datetime.combine(install_date, datetime.min.time().replace(hour=9))

    time_str = install_time.strip().upper()

    # Pattern 1: "9:00 AM" or "9:00AM" or "9:00" or "09:00"
    match = re.match(r'^(\d{1,2}):(\d{2})\s*(AM|PM)?', time_str)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))
        ampm = match.group(3)
        if ampm == 'PM' and hour != 12:
            hour += 12
        elif ampm == 'AM' and hour == 12:
            hour = 0
        try:
            return datetime.combine(install_date, datetime.min.time().replace(hour=hour, minute=minute))
        except ValueError:
            pass

    # Pattern 2: "9AM" or "9 AM" (no minutes)
    match = re.match(r'^(\d{1,2})\s*(AM|PM)', time_str)
    if match:
        hour = int(match.group(1))
        ampm = match.group(2)
        if ampm == 'PM' and hour != 12:
            hour += 12
        elif ampm == 'AM' and hour == 12:
            hour = 0
        try:
            return datetime.combine(install_date, datetime.min.time().replace(hour=hour))
        except ValueError:
            pass

    # Pattern 3: "9AM-12PM" or "9:00AM-12:00PM" (range - take first time)
    match = re.match(r'^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–]\s*\d', time_str)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2)) if match.group(2) else 0
        ampm = match.group(3)
        if ampm == 'PM' and hour != 12:
            hour += 12
        elif ampm == 'AM' and hour == 12:
            hour = 0
        try:
            return datetime.combine(install_date, datetime.min.time().replace(hour=hour, minute=minute))
        except ValueError:
            pass

    # Pattern 4: "8-10AM" (range with AM/PM at end - take first time)
    match = re.match(r'^(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(AM|PM)', time_str)
    if match:
        hour = int(match.group(1))
        ampm = match.group(3)
        if ampm == 'PM' and hour != 12:
            hour += 12
        elif ampm == 'AM' and hour == 12:
            hour = 0
        try:
            return datetime.combine(install_date, datetime.min.time().replace(hour=hour))
        except ValueError:
            pass

    # Fallback: default to 9 AM if parsing fails
    logger.warning(f"Could not parse install_time '{install_time}', defaulting to 9 AM")
    return datetime.combine(install_date, datetime.min.time().replace(hour=9))

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
    """Job to send scheduled report (runs synchronously in scheduler thread)"""
    logger.info(f"Running scheduled {schedule_type} report for user {user_id}")

    with SessionLocal() as db:
        try:
            # Get stats
            stats = get_user_stats(db, user_id)

            # Get recent orders
            orders = db.query(Order).filter(Order.userid == user_id).limit(100).all()

            # Generate Excel
            excel_data = generate_stats_excel(stats, orders)

            # Send email synchronously (with retry)
            send_scheduled_report_email_sync(
                user_email=user_email,
                user_name=user_name,
                schedule_type=schedule_type,
                stats=stats,
                excel_data=excel_data
            )

            logger.info(f"Successfully sent {schedule_type} report to {user_email}")

        except Exception as e:
            logger.error(f"Failed to send scheduled report for user {user_id}: {str(e)}")

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
    """Check and send 24-hour installation reminders.

    Fixed logic: Only sends reminder when we're within 23-25 hours of the
    actual install time, not just when install_date == tomorrow.

    Uses timezone-aware datetimes to support users across multiple US timezones.
    Install times are interpreted in the user's configured timezone.
    """
    logger.info("=" * 50)
    logger.info("Running installation reminder check")

    # Use timezone-aware UTC time for consistent calculations
    now_utc = datetime.now(ZoneInfo('UTC'))
    today_utc = now_utc.date()
    logger.info(f"Current time (UTC): {now_utc}")

    with SessionLocal() as db:
        try:
            # Get installations scheduled for tomorrow or day after (to catch edge cases across timezones)
            # Using UTC date as reference, but we'll check actual times per user timezone
            tomorrow = today_utc + timedelta(days=1)
            day_after = tomorrow + timedelta(days=1)
            # Also check today's date to catch orders for users in timezones ahead of UTC
            logger.info(f"Checking for installations on: {today_utc}, {tomorrow}, and {day_after}")

            # Get all orders scheduled for today, tomorrow, or day after
            orders = db.query(Order).filter(Order.install_date.in_([today_utc, tomorrow, day_after])).all()

            logger.info(f"Found {len(orders)} potential installations to check")

            reminders_sent = 0
            for order in orders:
                # Get user first to get their timezone
                user = db.query(User).filter(User.userid == order.userid).first()
                if not user:
                    logger.warning(f"User not found for order {order.orderid}")
                    continue

                # Get user's timezone (default to Pacific if not set)
                user_tz_str = getattr(user, 'timezone', None) or 'America/Los_Angeles'
                try:
                    user_tz = ZoneInfo(user_tz_str)
                except Exception:
                    logger.warning(f"Invalid timezone '{user_tz_str}' for user {user.userid}, using Pacific")
                    user_tz = ZoneInfo('America/Los_Angeles')

                # Parse install_time to build full datetime in user's timezone
                install_datetime_naive = parse_install_datetime(order.install_date, order.install_time)
                if install_datetime_naive is None:
                    logger.warning(f"Could not parse install time for order {order.orderid}: {order.install_time}")
                    continue

                # Make the install datetime timezone-aware in user's timezone, then convert to UTC
                install_datetime_local = install_datetime_naive.replace(tzinfo=user_tz)
                install_datetime_utc = install_datetime_local.astimezone(ZoneInfo('UTC'))

                # Calculate hours until install using UTC times
                hours_until_install = (install_datetime_utc - now_utc).total_seconds() / 3600

                # Only send reminder if within 23-25 hour window (1 hour tolerance for scheduler interval)
                if not (23 <= hours_until_install <= 25):
                    logger.debug(f"Order {order.orderid}: {hours_until_install:.1f} hours until install, outside 23-25h window")
                    continue

                logger.info(f"Order {order.orderid}: {hours_until_install:.1f} hours until install at {install_datetime_local} ({user_tz_str})")

                logger.info(f"Processing order {order.orderid} for user {user.email}")

                # Atomic duplicate check using SELECT FOR UPDATE SKIP LOCKED
                existing = db.execute(
                    text("""
                        SELECT notificationid FROM notifications
                        WHERE userid = :userid
                        AND orderid = :orderid
                        AND notification_type = 'install_reminder_24h'
                        AND DATE(created_at) = :today
                        FOR UPDATE SKIP LOCKED
                    """),
                    {"userid": user.userid, "orderid": order.orderid, "today": today_utc}
                ).fetchone()

                if existing:
                    logger.info(f"Reminder already sent today for order {order.orderid}")
                    continue

                # Check if user wants notifications
                if user.email_notifications or user.sms_notifications or user.browser_notifications:
                    logger.info(f"Sending 24h reminder to {user.email} for order {order.orderid}")
                    send_install_reminder_sync(db, user, order, hours_before=24, commit=True)
                    reminders_sent += 1
                else:
                    logger.info(f"User {user.email} has all notifications disabled")

            logger.info(f"Sent {reminders_sent} new reminders")
            logger.info("=" * 50)

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to send installation reminders: {str(e)}", exc_info=True)


def check_today_installations():
    """Check and send notifications for today's installations.

    Uses atomic deduplication to prevent duplicate notifications.
    Uses timezone-aware logic to determine "today" based on each user's timezone.
    """
    logger.info("=" * 50)
    logger.info("Running today's installation check")

    # Use timezone-aware UTC time
    now_utc = datetime.now(ZoneInfo('UTC'))
    today_utc = now_utc.date()
    logger.info(f"Current time (UTC): {now_utc}")

    with SessionLocal() as db:
        try:
            # Get installations scheduled for today or tomorrow (UTC) to handle timezone differences
            # A user in Hawaii might have "today" when it's "tomorrow" in UTC
            tomorrow_utc = today_utc + timedelta(days=1)
            yesterday_utc = today_utc - timedelta(days=1)
            logger.info(f"Checking for installations on: {yesterday_utc}, {today_utc}, and {tomorrow_utc}")

            # Get all orders scheduled for yesterday, today, or tomorrow (UTC)
            orders = db.query(Order).filter(Order.install_date.in_([yesterday_utc, today_utc, tomorrow_utc])).all()

            logger.info(f"Found {len(orders)} potential installations to check")

            notifications_sent = 0
            for order in orders:
                # Get user
                user = db.query(User).filter(User.userid == order.userid).first()
                if not user:
                    logger.warning(f"User not found for order {order.orderid}")
                    continue

                # Get user's timezone (default to Pacific if not set)
                user_tz_str = getattr(user, 'timezone', None) or 'America/Los_Angeles'
                try:
                    user_tz = ZoneInfo(user_tz_str)
                except Exception:
                    logger.warning(f"Invalid timezone '{user_tz_str}' for user {user.userid}, using Pacific")
                    user_tz = ZoneInfo('America/Los_Angeles')

                # Get current date in user's timezone
                now_user_tz = now_utc.astimezone(user_tz)
                today_user = now_user_tz.date()

                # Only process if the order is for "today" in the user's timezone
                if order.install_date != today_user:
                    logger.debug(f"Order {order.orderid}: install_date {order.install_date} != user's today {today_user}")
                    continue

                logger.info(f"Processing order {order.orderid} for user {user.email} (today in {user_tz_str})")

                # Atomic duplicate check using SELECT FOR UPDATE SKIP LOCKED
                existing = db.execute(
                    text("""
                        SELECT notificationid FROM notifications
                        WHERE userid = :userid
                        AND orderid = :orderid
                        AND notification_type = 'today_install'
                        AND DATE(created_at) = :today
                        FOR UPDATE SKIP LOCKED
                    """),
                    {"userid": user.userid, "orderid": order.orderid, "today": today_utc}
                ).fetchone()

                if existing:
                    logger.info(f"Today notification already sent for order {order.orderid}")
                    continue

                # Check if user wants notifications
                if user.email_notifications or user.sms_notifications or user.browser_notifications:
                    logger.info(f"Sending today notification to {user.email} for order {order.orderid}")
                    send_today_install_notification_sync(db, user, order, commit=True)
                    notifications_sent += 1
                else:
                    logger.info(f"User {user.email} has all notifications disabled")

            logger.info(f"Sent {notifications_sent} new today notifications")
            logger.info("=" * 50)

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to send today installation notifications: {str(e)}", exc_info=True)


def check_due_followups():
    """Check and send notifications for due follow-up reminders.

    Uses atomic flag-before-send pattern to prevent duplicate notifications
    if process crashes during send.
    """
    logger.info("=" * 50)
    logger.info("Running follow-up reminder check")

    # Use timezone-aware UTC time
    now_utc = datetime.now(ZoneInfo('UTC'))
    # Convert to naive datetime for comparison with existing naive datetime columns
    now = now_utc.replace(tzinfo=None)
    logger.info(f"Current time (UTC): {now_utc}")

    with SessionLocal() as db:
        try:
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

                    # Mark as notified BEFORE sending to prevent duplicates on crash
                    followup.notification_sent = True
                    db.flush()  # Write to DB but don't commit yet

                    try:
                        logger.info(f"Sending follow-up notification to {user.email} for order {order.orderid}")
                        send_custom_notification_sync(
                            db=db,
                            user=user,
                            notification_type='followup_due',
                            title=title,
                            message=message,
                            order=order,
                            commit=False  # We'll commit after success
                        )
                        db.commit()
                        notifications_sent += 1
                    except Exception as e:
                        # Rollback if send fails - allows retry on next run
                        db.rollback()
                        logger.error(f"Failed to send follow-up notification for {followup.id}: {e}")
                        # Re-query the followup since we rolled back
                        followup = db.query(FollowUp).filter(FollowUp.id == followup.id).first()
                        if followup:
                            followup.notification_sent = False
                            db.commit()
                else:
                    logger.info(f"User {user.email} has all notifications disabled")

            logger.info(f"Sent {notifications_sent} follow-up notifications")
            logger.info("=" * 50)

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to send follow-up notifications: {str(e)}", exc_info=True)


def start_scheduler(run_initial_checks: bool = True):
    """Start the scheduler.

    Args:
        run_initial_checks: If True, run notification checks immediately on startup.
                           Set to False when starting asynchronously to avoid blocking.
    """
    # Try to acquire lock - only one worker should run the scheduler
    if not acquire_scheduler_lock():
        logger.info("Skipping scheduler start - another worker owns the lock")
        return

    if not scheduler.running:
        logger.info("=" * 70)
        logger.info("STARTING NOTIFICATION SCHEDULER")
        logger.info(f"This worker (PID: {os.getpid()}) owns the scheduler")
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

        # Run checks immediately on startup (optional - skipped when starting async)
        if run_initial_checks:
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
    """Shutdown the scheduler and release lock"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shutdown")
    release_scheduler_lock()


def get_scheduler_status() -> dict:
    """Get current scheduler status and job information."""
    if not scheduler.running:
        return {
            "running": False,
            "jobs": [],
            "scheduled_reports_count": len(scheduled_reports)
        }

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })

    return {
        "running": True,
        "jobs": jobs,
        "scheduled_reports_count": len(scheduled_reports)
    }

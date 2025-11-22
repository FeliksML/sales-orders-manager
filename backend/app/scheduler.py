from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import Optional
import logging
from .database import SessionLocal
from .models import User, Order
from .export_utils import generate_stats_excel
from .email_service import send_scheduled_report_email
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

def start_scheduler():
    """Start the scheduler"""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")

def shutdown_scheduler():
    """Shutdown the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shutdown")

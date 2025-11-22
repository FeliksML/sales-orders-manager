from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_, extract
from .database import get_db
from .models import User, Order
from .auth import get_current_user, verify_recaptcha
from .scheduler import (
    add_scheduled_report,
    remove_scheduled_report,
    get_user_scheduled_reports
)
from .export_utils import generate_stats_excel
from .email_service import send_scheduled_report_email

router = APIRouter()

class ScheduledReportCreate(BaseModel):
    schedule_type: str  # 'weekly' or 'monthly'

class ScheduledReportResponse(BaseModel):
    job_id: str
    schedule_type: str
    created_at: str

class SendReportNow(BaseModel):
    recaptcha_token: Optional[str] = None

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_scheduled_report(
    report: ScheduledReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new scheduled report"""
    if report.schedule_type not in ['weekly', 'monthly']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Schedule type must be 'weekly' or 'monthly'"
        )

    try:
        job_id = add_scheduled_report(
            user_id=current_user.userid,
            user_email=current_user.email,
            user_name=current_user.name,
            schedule_type=report.schedule_type
        )

        return {
            "job_id": job_id,
            "schedule_type": report.schedule_type,
            "message": f"{report.schedule_type.capitalize()} report scheduled successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create scheduled report: {str(e)}"
        )

@router.get("/")
def get_scheduled_reports(
    current_user: User = Depends(get_current_user)
):
    """Get all scheduled reports for the current user"""
    reports = get_user_scheduled_reports(current_user.userid)

    return {
        "reports": [
            {
                "job_id": report['job_id'],
                "schedule_type": report['schedule_type'],
                "created_at": report['created_at'].isoformat()
            }
            for report in reports
        ]
    }

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scheduled_report(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a scheduled report"""
    # Verify the job belongs to the current user
    if not job_id.startswith(f"{current_user.userid}_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this scheduled report"
        )

    try:
        remove_scheduled_report(job_id)
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete scheduled report: {str(e)}"
        )

@router.post("/send-now", status_code=status.HTTP_200_OK)
async def send_report_now(
    request: SendReportNow,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a report immediately to the user's email with CAPTCHA verification"""
    # Verify reCAPTCHA
    if not await verify_recaptcha(request.recaptcha_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CAPTCHA verification failed. Please try again."
        )

    try:
        # Get user stats
        user_id = current_user.userid

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

        stats = {
            'total_orders': total_orders,
            'this_week': this_week,
            'this_month': this_month,
            'pending_installs': pending_installs,
            'total_internet': total_internet,
            'total_tv': total_tv,
            'total_mobile': int(total_mobile),
            'total_voice': int(total_voice)
        }

        # Get recent orders
        orders = db.query(Order).filter(Order.userid == user_id).limit(100).all()

        # Generate Excel
        excel_data = generate_stats_excel(stats, orders)

        # Send email
        await send_scheduled_report_email(
            user_email=current_user.email,
            user_name=current_user.name,
            schedule_type='on-demand',
            stats=stats,
            excel_data=excel_data
        )

        return {
            "message": f"Report sent successfully to {current_user.email}",
            "email": current_user.email
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send report: {str(e)}"
        )

"""
Email service for sending scheduled reports and export emails with attachments
Uses Resend API
"""
from datetime import datetime
import base64
import asyncio
import tempfile
import os
import logging
import resend

# Get Resend configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
MAIL_FROM = os.getenv("MAIL_FROM", "noreply@salesorder.com")

# Initialize Resend client
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

async def send_scheduled_report_email(
    user_email: str,
    user_name: str,
    schedule_type: str,
    stats: dict,
    excel_data: bytes
):
    """Send scheduled report email with Excel attachment"""
    logger.info(f"📧 Starting scheduled report email to {user_email} (type: {schedule_type})")

    if not RESEND_API_KEY:
        raise Exception("Resend API key not configured")

    # Create HTML body
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
            .stats-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 20px 0;
            }}
            .stat-card {{
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .stat-label {{
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 5px;
            }}
            .stat-value {{
                font-size: 28px;
                font-weight: bold;
                color: #1e40af;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }}
            .button {{
                display: inline-block;
                background: #1e40af;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                margin: 10px 0;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Your {schedule_type.capitalize()} Sales Report</h1>
            <p>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>
        <div class="content">
            <p>Hi {user_name},</p>
            <p>Here's your {schedule_type} sales performance summary:</p>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Orders</div>
                    <div class="stat-value">{stats['total_orders']}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">This Week</div>
                    <div class="stat-value">{stats['this_week']}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">This Month</div>
                    <div class="stat-value">{stats['this_month']}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pending Installs</div>
                    <div class="stat-value">{stats['pending_installs']}</div>
                </div>
            </div>

            <h3>Product Summary</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Internet</div>
                    <div class="stat-value">{stats['total_internet']}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">TV</div>
                    <div class="stat-value">{stats['total_tv']}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Mobile Lines</div>
                    <div class="stat-value">{stats['total_mobile']}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Voice Lines</div>
                    <div class="stat-value">{stats['total_voice']}</div>
                </div>
            </div>

            <p>📎 Please find your detailed report attached as an Excel file.</p>

            <div class="footer">
                <p>This is an automated {schedule_type} report from Sales Order Manager.</p>
                <p>To manage your scheduled reports, please log in to your dashboard.</p>
            </div>
        </div>
    </body>
    </html>
    """

    filename = f'sales_report_{schedule_type}_{datetime.now().strftime("%Y%m%d")}.xlsx'

    try:
        # Create params with attachment
        params: resend.Emails.SendParams = {
            "from": MAIL_FROM,
            "to": [user_email],
            "subject": f"Your {schedule_type.capitalize()} Sales Report - {datetime.now().strftime('%B %d, %Y')}",
            "html": html_body,
            "attachments": [
                {
                    "filename": filename,
                    "content": list(excel_data),
                }
            ],
        }

        # Send email
        logger.info(f"📤 Sending scheduled report email to {user_email}")
        response = resend.Emails.send(params)
        logger.info(f"✅ Successfully sent scheduled report email to {user_email} (id: {response.get('id', 'N/A')})")

    except Exception as e:
        logger.error(f"❌ Failed to send scheduled report email to {user_email}: {str(e)}")
        raise

async def send_export_email(
    user_email: str,
    user_name: str,
    file_data: bytes,
    file_format: str,
    order_count: int
):
    """Send export file via email"""
    logger.info(f"📧 Starting export email to {user_email} (format: {file_format}, count: {order_count})")

    if not RESEND_API_KEY:
        raise Exception("Resend API key not configured")

    # Determine file extension and media type
    if file_format == 'excel':
        file_ext = 'xlsx'
        file_type = 'Excel'
        mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    else:
        file_ext = 'csv'
        file_type = 'CSV'
        mime_type = 'text/csv'

    # Create HTML body
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
            .info-box {{
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin: 20px 0;
                text-align: center;
            }}
            .count {{
                font-size: 36px;
                font-weight: bold;
                color: #1e40af;
                margin: 10px 0;
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
            <h1>📄 Your Orders Export</h1>
            <p>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>
        <div class="content">
            <p>Hi {user_name},</p>
            <p>Your requested export is ready!</p>

            <div class="info-box">
                <div style="color: #6b7280; margin-bottom: 5px;">Orders Exported</div>
                <div class="count">{order_count}</div>
                <div style="color: #6b7280; margin-top: 5px;">Format: {file_type}</div>
            </div>

            <p>📎 Please find your export attached to this email.</p>

            <div class="footer">
                <p>This export was generated from Sales Order Manager.</p>
                <p>If you didn't request this export, please contact support.</p>
            </div>
        </div>
    </body>
    </html>
    """

    filename = f'orders_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.{file_ext}'

    try:
        # Handle file_data - could be bytes or string for CSV
        if isinstance(file_data, str):
            file_data = file_data.encode('utf-8')

        # Create params with attachment
        params: resend.Emails.SendParams = {
            "from": MAIL_FROM,
            "to": [user_email],
            "subject": f"Your Orders Export - {datetime.now().strftime('%B %d, %Y')}",
            "html": html_body,
            "attachments": [
                {
                    "filename": filename,
                    "content": list(file_data),
                }
            ],
        }

        # Send email
        logger.info(f"📤 Sending export email to {user_email}")
        response = resend.Emails.send(params)
        logger.info(f"✅ Successfully sent export email to {user_email} (id: {response.get('id', 'N/A')})")

    except Exception as e:
        logger.error(f"❌ Failed to send export email to {user_email}: {str(e)}")
        raise

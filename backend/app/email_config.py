"""
Email configuration for sending verification and notification emails
Uses Resend API for reliable email delivery
"""
import os
import logging
from dotenv import load_dotenv
import resend

load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Get email configuration from environment
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
MAIL_FROM = os.getenv("MAIL_FROM", "Sales Order Manager <orders@mail.salesordermanager.us>")
MAIL_REPLY_TO = os.getenv("MAIL_REPLY_TO", "support@salesordermanager.us")

# Log email configuration at module load (without sensitive data)
print(f"\n🔧 EMAIL_CONFIG MODULE LOADING (Resend API)...")
print(f"   MAIL_FROM: {MAIL_FROM}")
# Security: Only log whether API key is set, never log any part of the key itself
print(f"   RESEND_API_KEY: {'SET (' + str(len(RESEND_API_KEY)) + ' chars)' if RESEND_API_KEY else 'NOT SET'}")

# Initialize Resend client
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    print(f"✅ Resend client initialized")
else:
    print(f"⚠️ Resend API key not set - emails will fail")


async def send_verification_email(email: str, name: str, verification_link: str):
    """
    Send email verification link to user using Resend API

    Args:
        email: User's email address
        name: User's name
        verification_link: The verification URL with token
    """
    logger.info(f"📧 Starting verification email to {email}")

    if not RESEND_API_KEY:
        raise Exception("Resend API key not configured")
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #2563eb 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Sales Order Manager</h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Welcome, {name}!</h2>
                                <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                    Thank you for signing up for Sales Order Manager. We're excited to have you on board!
                                </p>
                                <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                    To complete your registration and verify your email address, please click the button below:
                                </p>

                                <!-- Button -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td align="center" style="padding: 0 0 30px 0;">
                                            <a href="{verification_link}"
                                               style="display: inline-block; background: linear-gradient(90deg, #2563eb 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                                Verify Email Address
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                    Or copy and paste this link into your browser:
                                </p>
                                <p style="margin: 0 0 30px 0; color: #2563eb; font-size: 14px; word-break: break-all;">
                                    {verification_link}
                                </p>

                                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 0 0 20px 0;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        <strong>Important:</strong> This verification link will expire in 24 hours.
                                    </p>
                                </div>

                                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                    If you didn't create an account with Sales Order Manager, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                    Sales Order Manager
                                </p>
                                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                    Questions? Reply to this email or contact support@salesordermanager.us
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    print(f"📤 ATTEMPTING TO SEND EMAIL VIA RESEND API...")
    print(f"   To: {email}")
    print(f"   From: {MAIL_FROM}")

    try:
        params: resend.Emails.SendParams = {
            "from": MAIL_FROM,
            "to": [email],
            "reply_to": MAIL_REPLY_TO,
            "subject": "Verify Your Email - Sales Order Manager",
            "html": html_content,
        }

        response = resend.Emails.send(params)

        print(f"✅ EMAIL SENT SUCCESSFULLY!")
        print(f"   ID: {response.get('id', 'N/A')}")
        print(f"   To: {email}")
        logger.info(f"✅ Successfully sent verification email to {email} (id: {response.get('id', 'N/A')})")

    except Exception as e:
        print(f"❌ EMAIL SEND FAILED!")
        print(f"   Error type: {type(e).__name__}")
        print(f"   Error message: {str(e)}")
        logger.error(f"❌ Failed to send verification email to {email}: {str(e)}")
        raise


async def send_password_reset_email(email: str, name: str, reset_link: str):
    """
    Send password reset link to user using Resend API

    Args:
        email: User's email address
        name: User's name
        reset_link: The password reset URL with token
    """
    logger.info(f"📧 Starting password reset email to {email}")

    if not RESEND_API_KEY:
        raise Exception("Resend API key not configured")
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #2563eb 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Sales Order Manager</h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Reset Your Password</h2>
                                <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                    Hi {name},
                                </p>
                                <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                    We received a request to reset your password for your Sales Order Manager account. If you didn't make this request, you can safely ignore this email.
                                </p>
                                <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                    To reset your password, click the button below:
                                </p>

                                <!-- Button -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td align="center" style="padding: 0 0 30px 0;">
                                            <a href="{reset_link}"
                                               style="display: inline-block; background: linear-gradient(90deg, #2563eb 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                                Reset Password
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                    Or copy and paste this link into your browser:
                                </p>
                                <p style="margin: 0 0 30px 0; color: #2563eb; font-size: 14px; word-break: break-all;">
                                    {reset_link}
                                </p>

                                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 0 0 20px 0;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
                                    </p>
                                </div>

                                <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 0 0 20px 0;">
                                    <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
                                        <strong>Security Notice:</strong> If you didn't request a password reset, please contact support immediately as someone may be trying to access your account.
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                    Sales Order Manager
                                </p>
                                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                    Questions? Reply to this email or contact support@salesordermanager.us
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    print(f"📤 ATTEMPTING TO SEND PASSWORD RESET EMAIL VIA RESEND API...")
    print(f"   To: {email}")
    print(f"   From: {MAIL_FROM}")

    try:
        params: resend.Emails.SendParams = {
            "from": MAIL_FROM,
            "to": [email],
            "reply_to": MAIL_REPLY_TO,
            "subject": "Reset Your Password - Sales Order Manager",
            "html": html_content,
        }

        response = resend.Emails.send(params)

        print(f"✅ PASSWORD RESET EMAIL SENT SUCCESSFULLY!")
        print(f"   ID: {response.get('id', 'N/A')}")
        logger.info(f"✅ Successfully sent password reset email to {email} (id: {response.get('id', 'N/A')})")

    except Exception as e:
        print(f"❌ PASSWORD RESET EMAIL SEND FAILED!")
        print(f"   Error type: {type(e).__name__}")
        print(f"   Error message: {str(e)}")
        logger.error(f"❌ Failed to send password reset email to {email}: {str(e)}")
        raise

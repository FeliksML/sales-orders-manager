# Email Configuration Guide

This guide will help you set up professional email sending for your Sales Order Manager application.

## Overview

The application now uses `fastapi-mail` to send professional HTML emails for:
- Email verification during signup
- Password reset (future implementation)
- Other notifications

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Email Settings

Edit your `.env` file in the `backend` directory and update the email settings:

```env
# Email Configuration
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password-here
MAIL_FROM=noreply@salesorder.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

## Gmail Setup (Recommended for Testing)

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security**
3. Under "Signing in to Google," select **2-Step Verification**
4. Follow the steps to enable it

### Step 2: Generate App Password

1. Go to App Passwords: https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "Sales Order Manager" as the name
5. Click **Generate**
6. Copy the 16-character password (without spaces)
7. Use this password in your `.env` file as `MAIL_PASSWORD`

### Step 3: Update .env File

```env
MAIL_USERNAME=your-gmail-address@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_FROM=your-gmail-address@gmail.com
```

## Alternative Email Providers

### Resend (Currently Used)

The application uses Resend's HTTP API for email delivery. Configure in `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
MAIL_FROM=noreply@yourdomain.com
```

**Note:** The `MAIL_FROM` address must be from a domain verified in your Resend dashboard.
Get your API key at: https://resend.com/api-keys

### Mailgun

```env
MAIL_USERNAME=your-mailgun-username
MAIL_PASSWORD=your-mailgun-password
MAIL_FROM=noreply@yourdomain.com
MAIL_PORT=587
MAIL_SERVER=smtp.mailgun.org
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

### AWS SES

```env
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_FROM=noreply@yourdomain.com
MAIL_PORT=587
MAIL_SERVER=email-smtp.us-east-1.amazonaws.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

### Microsoft Outlook/Office 365

```env
MAIL_USERNAME=your-email@outlook.com
MAIL_PASSWORD=your-password
MAIL_FROM=your-email@outlook.com
MAIL_PORT=587
MAIL_SERVER=smtp-mail.outlook.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

## Testing

### 1. Restart Backend Server

After updating your `.env` file, restart the backend:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
cd backend
uvicorn app.main:app --reload
```

### 2. Test Signup

1. Go to http://localhost:5173/signup
2. Fill out the signup form with a real email address
3. Submit the form
4. Check your email inbox (and spam folder)
5. Click the verification link in the email

### 3. Verify Console Output

Check the backend console for email sending status:
- `✓ Verification email sent to user@example.com` - Success
- `✗ Failed to send verification email: ...` - Error (check configuration)

## Troubleshooting

### Gmail "Less secure app access" Error

**Solution**: Use App Passwords (see Gmail Setup above). Never use your main Gmail password.

### "Authentication failed" Error

**Possible causes**:
1. Wrong username or password
2. 2-Step Verification not enabled (for Gmail)
3. App Password not generated correctly

**Solution**: Double-check your credentials and regenerate the App Password

### Emails Going to Spam

**For testing**: This is normal. Check your spam folder.

**For production**:
1. Use a custom domain email (e.g., noreply@yourdomain.com)
2. Set up SPF, DKIM, and DMARC records
3. Use a dedicated email service (Resend, Mailgun, AWS SES)

### "Connection refused" Error

**Possible causes**:
1. Wrong MAIL_SERVER
2. Wrong MAIL_PORT
3. Firewall blocking SMTP

**Solution**: Verify server and port settings for your email provider

### Emails Not Sending but No Errors

**Possible causes**:
1. Email provider rate limiting
2. Daily sending quota reached

**Solution**:
- Check your email provider's sending limits
- For Gmail: 500 emails/day limit
- Consider using a dedicated email service for production

## Email Template Customization

The email template is located in:
```
backend/app/email_config.py
```

You can customize:
- Colors and styling
- Logo (add an image URL)
- Text content
- Footer information

## Production Recommendations

1. **Use a dedicated email service** (Resend, Mailgun, AWS SES)
   - Better deliverability
   - Higher sending limits
   - Detailed analytics

2. **Use a custom domain**
   - Looks more professional
   - Better email deliverability
   - Builds trust with users

3. **Set up email authentication**
   - SPF records
   - DKIM signing
   - DMARC policy

4. **Monitor email delivery**
   - Track bounce rates
   - Monitor spam complaints
   - Set up webhook notifications

5. **Add retry logic**
   - Implement exponential backoff
   - Queue failed emails for retry
   - Log all email sending attempts

## Security Notes

- **Never commit `.env` file** to version control
- Store sensitive credentials securely
- Use environment variables in production
- Rotate App Passwords periodically
- Use different credentials for development and production

## Need Help?

If you're still having issues:
1. Check the backend console for detailed error messages
2. Verify your email provider's documentation
3. Test with a simple SMTP test script first
4. Consider using a dedicated email service for easier setup

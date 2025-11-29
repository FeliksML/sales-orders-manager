# Installation Reminders & Notifications Setup Guide

This guide explains how to set up and use the installation reminders and notifications system.

## Features

### 1. Email Reminders
- 24-hour advance reminders before installations
- Same-day notifications for today's installs
- Beautiful HTML email templates with order details
- Automatically sent based on user preferences

### 2. SMS Reminders (Twilio Integration)
- Text message notifications for installations
- 24-hour advance reminders
- Same-day alerts
- Requires Twilio account (optional)

### 3. Browser Notifications
- Real-time push notifications in the browser
- Today's installation alerts
- User-controlled permission system

### 4. Notification Center
- In-app notification dashboard
- View all notifications in one place
- Mark as read/unread
- Delete individual or all notifications
- Shows delivery method badges (Email, SMS, Browser)

## Setup Instructions

### Backend Setup

#### 1. Install Dependencies

The Twilio package has already been added to `requirements.txt`. Install it:

```bash
cd backend
source spectrum_venv/bin/activate
pip install twilio
```

#### 2. Run Database Migration

The notification tables and columns have been created. If you need to run the migration again:

```bash
python migrate_notifications.py
```

This will:
- Add notification preference columns to the `users` table
- Create the `notifications` table
- Set up necessary indexes for performance

#### 3. Configure Environment Variables

Add Twilio credentials to your `.env` file:

```env
# Twilio SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**Getting Twilio Credentials:**
1. Sign up at [https://www.twilio.com](https://www.twilio.com)
2. Get a phone number from the Twilio Console
3. Find your Account SID and Auth Token in the Console Dashboard
4. Add them to your `.env` file

**Note:** SMS notifications are optional. If you don't configure Twilio, the system will still work with email and browser notifications.

#### 4. Scheduler Configuration

The notification scheduler runs automatically when the backend starts. It checks for:
- **7:00 AM daily** - Today's installation notifications
- **9:00 AM daily** - 24-hour advance reminders for tomorrow's installations

To modify the schedule, edit `backend/app/scheduler.py`:

```python
# Change the hour/minute in the CronTrigger
scheduler.add_job(
    check_today_installations,
    trigger=CronTrigger(hour=7, minute=0),  # Modify this
    id='today_installations',
    replace_existing=True
)
```

### Frontend Setup

No additional setup needed! The frontend components are ready to use.

## Usage

### For Users

#### 1. Configure Notification Preferences

1. Click the **Settings icon** (⚙️) in the dashboard header
2. Or navigate to `/notification-settings`
3. Configure your preferences:
   - **Email Notifications**: Toggle on/off
   - **SMS Notifications**: Toggle on/off and enter phone number
   - **Browser Notifications**: Toggle on/off and grant permission
4. Click **Save Preferences**

#### 2. View Notifications

1. Click the **Bell icon** (🔔) in the dashboard header
2. The notification center will open showing:
   - All notifications or just unread ones (use tabs)
   - Delivery method badges
   - Time stamps
3. Actions available:
   - Mark individual notifications as read/unread
   - Delete individual notifications
   - Mark all as read
   - Clear all notifications

#### 3. Browser Notification Permission

When enabling browser notifications:
1. Click "Enable Browser Notifications"
2. Your browser will prompt for permission
3. Click "Allow"
4. Test the notification with the "Test Notification" button

### For Developers

#### Sending Custom Notifications

Use the notification service to send custom notifications:

```python
from app.notification_service import send_custom_notification
from app.database import SessionLocal
from app.models import User, Order

db = SessionLocal()

# Get user and order
user = db.query(User).filter(User.userid == user_id).first()
order = db.query(Order).filter(Order.orderid == order_id).first()

# Send notification
await send_custom_notification(
    db=db,
    user=user,
    notification_type="custom_alert",
    title="Important Update",
    message="Your installation has been rescheduled",
    order=order  # Optional
)
```

#### API Endpoints

**Notification Preferences:**
- `GET /api/notifications/preferences` - Get user preferences
- `PUT /api/notifications/preferences` - Update preferences

**Notification History:**
- `GET /api/notifications` - Get notifications (supports pagination)
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/{id}` - Mark as read/unread
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/{id}` - Delete notification
- `DELETE /api/notifications` - Delete all notifications

## Database Schema

### Users Table (New Columns)
```sql
phone_number VARCHAR(20)           -- Phone number for SMS
email_notifications BOOLEAN        -- Email preference (default: TRUE)
sms_notifications BOOLEAN          -- SMS preference (default: FALSE)
browser_notifications BOOLEAN      -- Browser preference (default: TRUE)
```

### Notifications Table
```sql
notificationid SERIAL PRIMARY KEY
userid INTEGER REFERENCES users(userid)
orderid INTEGER REFERENCES orders(orderid)
notification_type VARCHAR(50)      -- Type: install_reminder_24h, today_install, etc.
title VARCHAR(255)                 -- Notification title
message TEXT                       -- Notification message
sent_via_email BOOLEAN            -- Sent via email flag
sent_via_sms BOOLEAN              -- Sent via SMS flag
sent_via_browser BOOLEAN          -- Sent via browser flag
is_read BOOLEAN                   -- Read status
created_at TIMESTAMP              -- Creation time
read_at TIMESTAMP                 -- Read time (nullable)
```

## Notification Types

- `install_reminder_24h` - 24-hour advance reminder
- `today_install` - Same-day installation notification
- `custom_alert` - Custom notifications (for future features)

## Troubleshooting

### SMS Not Sending

1. Check Twilio credentials in `.env`
2. Verify phone number format (must include country code, e.g., +1)
3. Check Twilio Console for error messages
4. Ensure Twilio account has sufficient balance

### Browser Notifications Not Working

1. Check browser notification permission
2. Ensure HTTPS (required for most browsers in production)
3. Check browser console for errors
4. Try different browsers (Chrome, Firefox, Safari)

### Emails Not Sending

1. Verify email configuration in `.env`
2. Check spam folder
3. Review backend logs for errors
4. Ensure email service credentials are valid

### Scheduler Not Running

1. Check backend logs for scheduler startup messages
2. Verify APScheduler is installed: `pip install apscheduler`
3. Check for conflicting jobs in the scheduler
4. Restart the backend server

## Testing

### Test Scheduled Jobs Manually

You can trigger the notification jobs manually for testing:

```python
from app.scheduler import check_installation_reminders, check_today_installations

# Test 24-hour reminders
check_installation_reminders()

# Test today's notifications
check_today_installations()
```

### Test Browser Notifications

1. Go to Notification Settings
2. Enable browser notifications
3. Click "Test Notification"
4. A test notification should appear

### Test Email/SMS

Create a test order with install date set to tomorrow or today, then wait for the scheduled jobs to run, or trigger them manually.

## Cost Considerations

### Twilio SMS
- Pay-per-message pricing
- Approximately $0.0075 - $0.015 per SMS (varies by country)
- Monitor usage in Twilio Console
- Consider setting up usage alerts

### Email
- Free with Gmail (using App Password)
- Most email providers have free tiers
- Consider Resend/Mailgun for higher volume

## Security Notes

1. **Never commit** `.env` file with real credentials
2. Use **environment variables** for all sensitive data
3. Twilio credentials are **optional** - system works without them
4. Phone numbers are **validated** before SMS sending
5. Browser notifications require **user permission**

## Future Enhancements

Potential additions:
- Customizable notification schedules per user
- Email/SMS templates customization
- Notification preferences per notification type
- Push notifications for mobile apps
- Webhook integrations
- Slack/Teams notifications

## Support

If you encounter issues:
1. Check the backend logs
2. Review browser console for frontend errors
3. Verify environment variables
4. Check database migration status
5. Review this documentation

---

**Happy Notifying! 🔔**

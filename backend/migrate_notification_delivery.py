"""
Database migration script to add notification_deliveries table.
Tracks individual delivery attempts per channel for notifications.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Create notification_deliveries table and backfill from existing notifications"""

    with engine.connect() as conn:
        try:
            # Start transaction
            trans = conn.begin()

            logger.info("Creating notification_deliveries table...")

            # Create the table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS notification_deliveries (
                    id SERIAL PRIMARY KEY,
                    notification_id INTEGER NOT NULL REFERENCES notifications(notificationid) ON DELETE CASCADE,
                    channel VARCHAR(20) NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    attempt_number INTEGER DEFAULT 1,
                    sent_at TIMESTAMP,
                    error_message TEXT,
                    response_data JSONB,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL
                )
            """))
            logger.info("Created notification_deliveries table")

            # Add indexes for efficient querying
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id
                ON notification_deliveries (notification_id)
            """))
            logger.info("Created index on notification_id")

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel_status
                ON notification_deliveries (channel, status)
            """))
            logger.info("Created index on channel and status")

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at
                ON notification_deliveries (created_at DESC)
            """))
            logger.info("Created index on created_at")

            # Commit table creation
            trans.commit()
            logger.info("Table and indexes created successfully!")

        except Exception as e:
            trans.rollback()
            logger.error(f"Migration failed: {str(e)}")
            raise

    # Backfill existing notifications
    backfill_existing_notifications()


def backfill_existing_notifications():
    """Create delivery records from existing sent_via_* flags on notifications"""

    logger.info("\nBackfilling delivery records from existing notifications...")

    with SessionLocal() as db:
        try:
            # Get count of notifications
            result = db.execute(text("SELECT COUNT(*) FROM notifications"))
            total = result.scalar()
            logger.info(f"Found {total} existing notifications to process")

            if total == 0:
                logger.info("No notifications to backfill")
                return

            # Backfill email deliveries
            email_result = db.execute(text("""
                INSERT INTO notification_deliveries (notification_id, channel, status, attempt_number, sent_at, created_at)
                SELECT notificationid, 'email', 'sent', 1, created_at, created_at
                FROM notifications
                WHERE sent_via_email = true
                AND NOT EXISTS (
                    SELECT 1 FROM notification_deliveries
                    WHERE notification_id = notifications.notificationid AND channel = 'email'
                )
            """))
            logger.info(f"Created {email_result.rowcount} email delivery records")

            # Backfill SMS deliveries
            sms_result = db.execute(text("""
                INSERT INTO notification_deliveries (notification_id, channel, status, attempt_number, sent_at, created_at)
                SELECT notificationid, 'sms', 'sent', 1, created_at, created_at
                FROM notifications
                WHERE sent_via_sms = true
                AND NOT EXISTS (
                    SELECT 1 FROM notification_deliveries
                    WHERE notification_id = notifications.notificationid AND channel = 'sms'
                )
            """))
            logger.info(f"Created {sms_result.rowcount} SMS delivery records")

            # Backfill browser deliveries
            browser_result = db.execute(text("""
                INSERT INTO notification_deliveries (notification_id, channel, status, attempt_number, sent_at, created_at)
                SELECT notificationid, 'browser', 'sent', 1, created_at, created_at
                FROM notifications
                WHERE sent_via_browser = true
                AND NOT EXISTS (
                    SELECT 1 FROM notification_deliveries
                    WHERE notification_id = notifications.notificationid AND channel = 'browser'
                )
            """))
            logger.info(f"Created {browser_result.rowcount} browser delivery records")

            db.commit()
            logger.info("Backfill completed successfully!")

        except Exception as e:
            db.rollback()
            logger.error(f"Backfill failed: {str(e)}")
            raise


def rollback():
    """Rollback the migration by dropping the table"""

    with engine.connect() as conn:
        try:
            trans = conn.begin()

            logger.info("Dropping notification_deliveries table...")
            conn.execute(text("DROP TABLE IF EXISTS notification_deliveries CASCADE"))

            trans.commit()
            logger.info("Rollback completed successfully!")

        except Exception as e:
            trans.rollback()
            logger.error(f"Rollback failed: {str(e)}")
            raise


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Notification delivery tracking migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    parser.add_argument('--backfill-only', action='store_true', help='Only run backfill (table already exists)')
    args = parser.parse_args()

    if args.rollback:
        logger.info("Starting rollback...")
        rollback()
    elif args.backfill_only:
        logger.info("Running backfill only...")
        backfill_existing_notifications()
    else:
        logger.info("Starting notification delivery tracking migration...")
        migrate()

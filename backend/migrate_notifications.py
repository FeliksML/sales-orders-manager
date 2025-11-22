"""
Database migration script to add notification features
Adds notification preferences to users table and creates notifications table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Run database migrations for notification features"""

    with engine.connect() as conn:
        try:
            # Start transaction
            trans = conn.begin()

            # Add notification preference columns to users table
            logger.info("Adding notification preference columns to users table...")

            # Check if columns already exist
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='users' AND column_name='phone_number'
            """))

            if result.fetchone() is None:
                conn.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN phone_number VARCHAR(20),
                    ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
                    ADD COLUMN sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
                    ADD COLUMN browser_notifications BOOLEAN NOT NULL DEFAULT TRUE
                """))
                logger.info("✓ Added notification preference columns to users table")
            else:
                logger.info("✓ Notification preference columns already exist")

            # Create notifications table
            logger.info("Creating notifications table...")

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS notifications (
                    notificationid SERIAL PRIMARY KEY,
                    userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
                    orderid INTEGER REFERENCES orders(orderid) ON DELETE SET NULL,
                    notification_type VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    sent_via_email BOOLEAN DEFAULT FALSE,
                    sent_via_sms BOOLEAN DEFAULT FALSE,
                    sent_via_browser BOOLEAN DEFAULT FALSE,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    read_at TIMESTAMP
                )
            """))
            logger.info("✓ Created notifications table")

            # Create indexes for better performance
            logger.info("Creating indexes...")

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_userid
                ON notifications(userid)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_is_read
                ON notifications(is_read)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_created_at
                ON notifications(created_at DESC)
            """))

            logger.info("✓ Created indexes")

            # Commit transaction
            trans.commit()
            logger.info("\n✅ Migration completed successfully!")

        except Exception as e:
            # Rollback on error
            trans.rollback()
            logger.error(f"\n❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    logger.info("Starting notification features migration...")
    migrate()

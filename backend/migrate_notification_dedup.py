"""
Database migration script to add unique constraint for notification deduplication.
Prevents duplicate notifications for the same user/order/type on the same day.
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
    """Add unique index to prevent duplicate notifications per user/order/type/day"""

    with engine.connect() as conn:
        try:
            # Start transaction
            trans = conn.begin()

            logger.info("Adding unique constraint for notification deduplication...")

            # Create unique index that prevents duplicates per user/order/type/day
            # Uses partial index (WHERE orderid IS NOT NULL) since some notifications
            # may not be tied to a specific order
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_user_order_type_day
                ON notifications (userid, orderid, notification_type, DATE(created_at))
                WHERE orderid IS NOT NULL
            """))
            logger.info("Created unique index uq_notification_user_order_type_day")

            # Also add index for notifications without orderid
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_user_type_date
                ON notifications (userid, notification_type, DATE(created_at))
                WHERE orderid IS NULL
            """))
            logger.info("Created index idx_notifications_user_type_date for non-order notifications")

            # Commit transaction
            trans.commit()
            logger.info("\nMigration completed successfully!")

        except Exception as e:
            # Rollback on error
            trans.rollback()
            logger.error(f"\nMigration failed: {str(e)}")
            raise


def rollback():
    """Rollback the migration by dropping the indexes"""

    with engine.connect() as conn:
        try:
            trans = conn.begin()

            logger.info("Rolling back notification dedup indexes...")

            conn.execute(text("DROP INDEX IF EXISTS uq_notification_user_order_type_day"))
            conn.execute(text("DROP INDEX IF EXISTS idx_notifications_user_type_date"))

            trans.commit()
            logger.info("Rollback completed successfully!")

        except Exception as e:
            trans.rollback()
            logger.error(f"Rollback failed: {str(e)}")
            raise


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Notification dedup migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.rollback:
        logger.info("Starting rollback...")
        rollback()
    else:
        logger.info("Starting notification dedup migration...")
        migrate()

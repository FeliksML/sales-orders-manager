"""
Database migration script to add SMS subscription billing features.
Creates subscriptions and sms_usage tables for tracking billing status and usage limits.

Standalone script - no app imports required.
Run with: python3 migrate_subscriptions.py
"""

import os
from sqlalchemy import create_engine, text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable not set!")
    logger.info("Set it with: export DATABASE_URL='postgresql://user:pass@host:port/db'")
    exit(1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def migrate():
    """Run database migrations for SMS subscription billing"""

    with engine.connect() as conn:
        try:
            # Start transaction
            trans = conn.begin()

            # Create subscriptions table
            logger.info("Creating subscriptions table...")

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
                    stripe_customer_id VARCHAR(255),
                    stripe_subscription_id VARCHAR(255),
                    status VARCHAR(50) NOT NULL DEFAULT 'free',
                    current_period_end TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            logger.info("✓ Created subscriptions table")

            # Create indexes for subscriptions
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
                ON subscriptions(user_id)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
                ON subscriptions(stripe_customer_id)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_subscriptions_status
                ON subscriptions(status)
            """))
            logger.info("✓ Created subscription indexes")

            # Create sms_usage table
            logger.info("Creating sms_usage table...")

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS sms_usage (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
                    month VARCHAR(7) NOT NULL,
                    sms_count INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(user_id, month)
                )
            """))
            logger.info("✓ Created sms_usage table")

            # Create indexes for sms_usage
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_sms_usage_user_month
                ON sms_usage(user_id, month)
            """))
            logger.info("✓ Created sms_usage indexes")

            # Commit transaction
            trans.commit()
            logger.info("\n✅ Migration completed successfully!")
            logger.info("\nNext steps:")
            logger.info("1. Set up Telnyx account and get API key")
            logger.info("2. Set up Stripe product with $20/month price")
            logger.info("3. Add environment variables:")
            logger.info("   - TELNYX_API_KEY")
            logger.info("   - TELNYX_PHONE_NUMBER")
            logger.info("   - STRIPE_SECRET_KEY")
            logger.info("   - STRIPE_PUBLISHABLE_KEY")
            logger.info("   - STRIPE_WEBHOOK_SECRET")
            logger.info("   - STRIPE_SMS_PRICE_ID")

        except Exception as e:
            # Rollback on error
            trans.rollback()
            logger.error(f"\n❌ Migration failed: {str(e)}")
            raise


if __name__ == "__main__":
    logger.info("Starting SMS subscription billing migration...")
    migrate()

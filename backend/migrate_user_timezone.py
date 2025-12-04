"""
Database migration script to add timezone column to users table.
Enables multi-timezone support for notification scheduling.
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
    """Run database migration to add timezone column to users table"""

    with engine.connect() as conn:
        try:
            # Start transaction
            trans = conn.begin()

            logger.info("Adding timezone column to users table...")

            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='users' AND column_name='timezone'
            """))

            if result.fetchone() is None:
                conn.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'America/Los_Angeles'
                """))
                logger.info("✓ Added timezone column to users table")
            else:
                logger.info("✓ Timezone column already exists")

            # Commit transaction
            trans.commit()
            logger.info("\n✅ Migration completed successfully!")

        except Exception as e:
            # Rollback on error
            trans.rollback()
            logger.error(f"\n❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    logger.info("Starting timezone migration...")
    migrate()

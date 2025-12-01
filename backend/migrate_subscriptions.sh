#!/bin/bash
# SMS Subscription Billing Tables Migration
# Run with: ./migrate_subscriptions.sh

set -e

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable not set"
    echo "Set it with: export DATABASE_URL='postgresql://user:pass@host:port/db'"
    exit 1
fi

echo "Running SMS subscription billing migration..."

python3 -c "
from sqlalchemy import create_engine, text
import os

engine = create_engine(os.environ['DATABASE_URL'])

with engine.connect() as conn:
    trans = conn.begin()

    conn.execute(text('''
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
    '''))

    conn.execute(text('CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)'))
    conn.execute(text('CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id)'))
    conn.execute(text('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)'))

    conn.execute(text('''
        CREATE TABLE IF NOT EXISTS sms_usage (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
            month VARCHAR(7) NOT NULL,
            sms_count INTEGER NOT NULL DEFAULT 0,
            UNIQUE(user_id, month)
        )
    '''))

    conn.execute(text('CREATE INDEX IF NOT EXISTS idx_sms_usage_user_month ON sms_usage(user_id, month)'))

    trans.commit()
    print('Tables created successfully!')
"

echo "Migration completed!"

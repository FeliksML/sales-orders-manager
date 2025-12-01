"""
Billing module for SMS subscription management via Stripe.

Provides endpoints for:
- Getting subscription status and SMS usage
- Creating Stripe checkout sessions for subscription
- Handling Stripe webhooks
- Creating customer portal sessions for subscription management
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import stripe
import os
import logging
from datetime import datetime

from .database import get_db
from .models import User, Subscription, SMSUsage
from .auth import get_current_user
from .notification_service import get_sms_usage, FREE_SMS_LIMIT
from .schemas import (
    BillingStatusResponse,
    CheckoutSessionResponse,
    PortalSessionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Stripe configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_SMS_PRICE_ID = os.getenv("STRIPE_SMS_PRICE_ID")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Initialize Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
    logger.info("Stripe API initialized")
else:
    logger.warning("STRIPE_SECRET_KEY not configured - billing features disabled")


def get_or_create_subscription(db: Session, user_id: int) -> Subscription:
    """Get existing subscription or create a new free-tier one."""
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id
    ).first()

    if not subscription:
        subscription = Subscription(
            user_id=user_id,
            status="free"
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)

    return subscription


@router.get("/subscription", response_model=BillingStatusResponse)
def get_billing_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current subscription status and SMS usage.

    Returns subscription tier, SMS usage this month, and remaining SMS.
    """
    subscription = get_or_create_subscription(db, current_user.userid)
    sms_used, sms_limit = get_sms_usage(db, current_user.userid)

    is_subscribed = subscription.status == "active"
    sms_remaining = -1 if is_subscribed else max(0, sms_limit - sms_used)

    return BillingStatusResponse(
        subscription_status=subscription.status,
        is_subscribed=is_subscribed,
        sms_used=sms_used,
        sms_limit=sms_limit,
        sms_remaining=sms_remaining,
        current_period_end=subscription.current_period_end,
        price_per_month=20.00,
        stripe_publishable_key=STRIPE_PUBLISHABLE_KEY
    )


@router.post("/create-checkout", response_model=CheckoutSessionResponse)
def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe checkout session for SMS Pro subscription.

    Returns a checkout URL that the frontend should redirect to.
    """
    if not STRIPE_SECRET_KEY or not STRIPE_SMS_PRICE_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe billing not configured"
        )

    subscription = get_or_create_subscription(db, current_user.userid)

    # Check if already subscribed
    if subscription.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active subscription"
        )

    try:
        # Get or create Stripe customer
        if subscription.stripe_customer_id:
            customer_id = subscription.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.name,
                metadata={"user_id": str(current_user.userid)}
            )
            customer_id = customer.id

            # Save customer ID
            subscription.stripe_customer_id = customer_id
            db.commit()

        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": STRIPE_SMS_PRICE_ID,
                "quantity": 1
            }],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/settings/notifications?checkout=success",
            cancel_url=f"{FRONTEND_URL}/settings/notifications?checkout=canceled",
            metadata={
                "user_id": str(current_user.userid)
            }
        )

        logger.info(f"Checkout session created for user {current_user.userid}")

        return CheckoutSessionResponse(
            checkout_url=checkout_session.url,
            session_id=checkout_session.id
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.post("/portal", response_model=PortalSessionResponse)
def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe customer portal session for subscription management.

    Allows users to update payment method, cancel subscription, view invoices.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe billing not configured"
        )

    subscription = get_or_create_subscription(db, current_user.userid)

    if not subscription.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account found. Please subscribe first."
        )

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=f"{FRONTEND_URL}/settings/notifications"
        )

        return PortalSessionResponse(portal_url=portal_session.url)

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating portal session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create portal session"
        )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Stripe webhook events.

    Processes subscription lifecycle events:
    - checkout.session.completed: Activate subscription
    - customer.subscription.deleted: Deactivate subscription
    - invoice.payment_failed: Mark subscription as past_due
    """
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook secret not configured"
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Received Stripe webhook: {event_type}")

    if event_type == "checkout.session.completed":
        # Subscription created via checkout
        await handle_checkout_completed(db, data)

    elif event_type == "customer.subscription.updated":
        # Subscription status changed
        await handle_subscription_updated(db, data)

    elif event_type == "customer.subscription.deleted":
        # Subscription canceled
        await handle_subscription_deleted(db, data)

    elif event_type == "invoice.payment_failed":
        # Payment failed
        await handle_payment_failed(db, data)

    return {"status": "success"}


async def handle_checkout_completed(db: Session, session: dict):
    """Handle successful checkout - activate subscription."""
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    user_id = session.get("metadata", {}).get("user_id")

    if not customer_id:
        logger.warning("Checkout completed without customer ID")
        return

    # Find subscription by customer ID or user ID
    subscription = None
    if user_id:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == int(user_id)
        ).first()

    if not subscription:
        subscription = db.query(Subscription).filter(
            Subscription.stripe_customer_id == customer_id
        ).first()

    if not subscription:
        logger.error(f"No subscription found for customer {customer_id}")
        return

    # Get subscription details from Stripe
    if subscription_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription_id)
            subscription.stripe_subscription_id = subscription_id
            subscription.status = "active"
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_sub.current_period_end
            )
            db.commit()
            logger.info(f"Subscription activated for user {subscription.user_id}")
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving subscription: {str(e)}")


async def handle_subscription_updated(db: Session, stripe_sub: dict):
    """Handle subscription updates."""
    subscription_id = stripe_sub.get("id")
    status = stripe_sub.get("status")

    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()

    if not subscription:
        logger.warning(f"Subscription {subscription_id} not found in database")
        return

    # Map Stripe status to our status
    if status == "active":
        subscription.status = "active"
    elif status in ["past_due", "unpaid"]:
        subscription.status = "past_due"
    elif status in ["canceled", "incomplete_expired"]:
        subscription.status = "canceled"

    subscription.current_period_end = datetime.fromtimestamp(
        stripe_sub.get("current_period_end", 0)
    )
    db.commit()
    logger.info(f"Subscription {subscription_id} updated to {subscription.status}")


async def handle_subscription_deleted(db: Session, stripe_sub: dict):
    """Handle subscription cancellation."""
    subscription_id = stripe_sub.get("id")

    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()

    if subscription:
        subscription.status = "canceled"
        subscription.stripe_subscription_id = None
        db.commit()
        logger.info(f"Subscription canceled for user {subscription.user_id}")


async def handle_payment_failed(db: Session, invoice: dict):
    """Handle failed payment - mark subscription as past_due."""
    customer_id = invoice.get("customer")

    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()

    if subscription and subscription.status == "active":
        subscription.status = "past_due"
        db.commit()
        logger.warning(f"Payment failed for user {subscription.user_id}")

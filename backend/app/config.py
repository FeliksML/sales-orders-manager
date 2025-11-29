"""
Configuration and environment variable validation
"""
import os
import sys
from typing import Optional


class ConfigurationError(Exception):
    """Raised when required configuration is missing or invalid"""
    pass


def validate_environment() -> None:
    """
    Validate that all required environment variables are set.
    Fails fast with clear error messages if any are missing.

    This should be called at application startup before any routes are registered.
    """
    errors = []
    warnings = []

    # CRITICAL: Required in all environments
    required_vars = {
        "DATABASE_URL": "Database connection string",
        "SECRET_KEY": "JWT signing key (CRITICAL for security)",
    }

    # Required in production only
    production_required = {
        "RECAPTCHA_SECRET_KEY": "reCAPTCHA secret key",
        "RESEND_API_KEY": "Resend API key for sending emails",
    }

    # Check critical required variables
    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value:
            errors.append(f"❌ {var} is not set ({description})")
        elif var == "SECRET_KEY":
            # Check for unsafe default values
            unsafe_defaults = [
                "your-secret-key",
                "change-this",
                "your-secret-key-change-this-in-production",
                "secret",
                "development"
            ]
            if any(unsafe in value.lower() for unsafe in unsafe_defaults):
                errors.append(
                    f"❌ {var} contains an unsafe default value. "
                    "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
                )
            elif len(value) < 32:
                warnings.append(
                    f"⚠️  {var} is shorter than 32 characters. "
                    "For production, use a longer key (recommended: 64+ characters)"
                )

    # Check production-specific variables
    environment = os.getenv("ENVIRONMENT", "production").lower()
    if environment == "production":
        for var, description in production_required.items():
            value = os.getenv(var)
            if not value:
                errors.append(f"❌ {var} is not set ({description}) - REQUIRED in production")

        # Validate FRONTEND_URL in production
        frontend_url = os.getenv("FRONTEND_URL")
        if not frontend_url:
            errors.append("❌ FRONTEND_URL is not set - REQUIRED in production")
        elif frontend_url.startswith("http://") and "localhost" not in frontend_url:
            warnings.append(
                "⚠️  FRONTEND_URL uses http:// in production. HTTPS is strongly recommended."
            )

    # Log email configuration for debugging (Resend API)
    print("\n📧 EMAIL CONFIGURATION (Resend API):")
    resend_key = os.getenv('RESEND_API_KEY', '')
    print(f"   RESEND_API_KEY: {'SET (' + str(len(resend_key)) + ' chars, starts with ' + resend_key[:10] + '...)' if resend_key else 'NOT SET'}")
    print(f"   MAIL_FROM: {os.getenv('MAIL_FROM', 'NOT SET')}")

    # Print warnings
    if warnings:
        print("\n⚠️  CONFIGURATION WARNINGS:")
        for warning in warnings:
            print(f"  {warning}")
        print()

    # If there are errors, fail immediately
    if errors:
        print("\n" + "="*70)
        print("🚨 CONFIGURATION ERROR - APPLICATION STARTUP FAILED")
        print("="*70)
        for error in errors:
            print(f"  {error}")
        print("\nFix these issues and restart the application.")
        print("See backend/.env.example for required environment variables.")
        print("="*70 + "\n")
        sys.exit(1)

    # Success message
    env_display = environment.upper()
    print(f"\n✅ Configuration validated successfully ({env_display} mode)")
    if environment == "development":
        print("⚠️  Running in DEVELOPMENT mode - some security features may be relaxed\n")
    else:
        print("🔒 Running in PRODUCTION mode - all security features enabled\n")


def get_secret_key() -> str:
    """
    Get the SECRET_KEY from environment.
    Note: validate_environment() should be called at startup to ensure this exists.
    """
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        raise ConfigurationError(
            "SECRET_KEY not found in environment. "
            "This should have been caught by validate_environment() at startup."
        )
    return secret_key


def get_database_url() -> str:
    """Get the DATABASE_URL from environment"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ConfigurationError("DATABASE_URL not found in environment")
    return database_url


def is_production() -> bool:
    """Check if running in production environment"""
    return os.getenv("ENVIRONMENT", "production").lower() == "production"


def is_development() -> bool:
    """Check if running in development environment"""
    return os.getenv("ENVIRONMENT", "production").lower() == "development"

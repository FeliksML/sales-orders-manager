#!/bin/bash

###############################################################################
# Environment Configuration Script
# Generates .env files for backend and frontend with secure defaults
###############################################################################

set -e

echo "=========================================="
echo "Environment Configuration"
echo "=========================================="
echo ""
echo "This script will help you configure environment variables for deployment."
echo "Press Ctrl+C at any time to cancel."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate random string
generate_secret() {
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-64
}

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to prompt with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local value

    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        echo "${value:-$default}"
    else
        read -p "$prompt: " value
        echo "$value"
    fi
}

# Function to prompt for password (hidden input)
prompt_password() {
    local prompt="$1"
    local value

    read -sp "$prompt: " value
    echo ""
    echo "$value"
}

echo "=== Database Configuration ==="
echo ""

DB_PASSWORD=$(generate_password)
echo -e "${GREEN}Generated random database password${NC}"

DB_NAME=$(prompt_with_default "Database name" "sales_order_db")
DB_USER=$(prompt_with_default "Database user" "sales_order_user")

echo ""
echo "=== Backend Configuration ==="
echo ""

SECRET_KEY=$(generate_secret)
echo -e "${GREEN}Generated random SECRET_KEY (64 characters)${NC}"

ENVIRONMENT=$(prompt_with_default "Environment (development/production)" "production")

echo ""
echo "=== Frontend URL Configuration ==="
echo ""
echo "Enter your domain name (e.g., example.com or subdomain.example.com)"
echo "Or leave empty to use IP address"
DOMAIN=$(prompt_with_default "Domain name" "")

if [ -n "$DOMAIN" ]; then
    FRONTEND_URL="https://$DOMAIN"
    API_URL="https://$DOMAIN"
else
    echo ""
    echo "Enter your server's public IP address:"
    SERVER_IP=$(prompt_with_default "Server IP" "")
    if [ -n "$SERVER_IP" ]; then
        FRONTEND_URL="http://$SERVER_IP"
        API_URL="http://$SERVER_IP"
    else
        FRONTEND_URL="http://localhost"
        API_URL="http://localhost"
    fi
fi

echo ""
echo "=== Email Configuration (for password reset & notifications) ==="
echo ""
echo "Using Gmail? You'll need an App Password (not your regular password):"
echo "https://support.google.com/accounts/answer/185833"
echo ""

MAIL_USERNAME=$(prompt_with_default "Email username (e.g., your-email@gmail.com)" "")
if [ -n "$MAIL_USERNAME" ]; then
    MAIL_PASSWORD=$(prompt_password "Email password (App Password for Gmail)")
    MAIL_FROM=$(prompt_with_default "From email address" "$MAIL_USERNAME")
    MAIL_SERVER=$(prompt_with_default "SMTP server" "smtp.gmail.com")
    MAIL_PORT=$(prompt_with_default "SMTP port" "587")
else
    echo -e "${YELLOW}Skipping email configuration. Password reset will not work.${NC}"
    MAIL_PASSWORD=""
    MAIL_FROM=""
    MAIL_SERVER="smtp.gmail.com"
    MAIL_PORT="587"
fi

echo ""
echo "=== Google reCAPTCHA v2 Configuration ==="
echo ""
echo "Get your keys from: https://www.google.com/recaptcha/admin"
echo ""

RECAPTCHA_SITE_KEY=$(prompt_with_default "reCAPTCHA Site Key" "")
RECAPTCHA_SECRET_KEY=$(prompt_with_default "reCAPTCHA Secret Key" "")

echo ""
echo "=== Optional: Google Maps API Key ==="
echo ""
GOOGLE_MAPS_API_KEY=$(prompt_with_default "Google Maps API Key (optional)" "")

echo ""
echo "=== Optional: Twilio SMS Configuration ==="
echo ""
TWILIO_ACCOUNT_SID=$(prompt_with_default "Twilio Account SID (optional)" "")
if [ -n "$TWILIO_ACCOUNT_SID" ]; then
    TWILIO_AUTH_TOKEN=$(prompt_with_default "Twilio Auth Token" "")
    TWILIO_PHONE_NUMBER=$(prompt_with_default "Twilio Phone Number" "")
else
    TWILIO_AUTH_TOKEN=""
    TWILIO_PHONE_NUMBER=""
fi

echo ""
echo "=== Optional: Sentry Error Tracking ==="
echo ""
SENTRY_DSN=$(prompt_with_default "Sentry DSN (optional)" "")

# Create backend .env file
echo ""
echo "Creating backend/.env..."

cat > backend/.env <<EOF
# Environment
ENVIRONMENT=$ENVIRONMENT

# Database Configuration (used by Docker Compose)
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD

# Database URL (for application)
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@database:5432/$DB_NAME

# Security
SECRET_KEY=$SECRET_KEY

# Frontend URL
FRONTEND_URL=$FRONTEND_URL

# Email Configuration
MAIL_USERNAME=$MAIL_USERNAME
MAIL_PASSWORD=$MAIL_PASSWORD
MAIL_FROM=$MAIL_FROM
MAIL_SERVER=$MAIL_SERVER
MAIL_PORT=$MAIL_PORT
MAIL_STARTTLS=True
MAIL_SSL_TLS=False

# reCAPTCHA
RECAPTCHA_SECRET_KEY=$RECAPTCHA_SECRET_KEY

# Twilio (Optional)
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER

# Sentry (Optional)
SENTRY_DSN=$SENTRY_DSN
EOF

echo -e "${GREEN}✓ Created backend/.env${NC}"

# Create frontend .env file
echo "Creating frontend/.env..."

cat > frontend/.env <<EOF
# API URL
VITE_API_URL=$API_URL

# reCAPTCHA
VITE_RECAPTCHA_SITE_KEY=$RECAPTCHA_SITE_KEY

# Google Maps (Optional)
VITE_GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY
EOF

echo -e "${GREEN}✓ Created frontend/.env${NC}"

# Create .env file for docker-compose in root directory
echo "Creating .env (for Docker Compose)..."

cat > .env <<EOF
# Database Configuration
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@database:5432/$DB_NAME

# Application URLs
FRONTEND_URL=$FRONTEND_URL
API_URL=$API_URL
DOMAIN=$DOMAIN
EOF

echo -e "${GREEN}✓ Created .env${NC}"

echo ""
echo "=========================================="
echo "Configuration Complete!"
echo "=========================================="
echo ""
echo "Created files:"
echo "  ✓ backend/.env"
echo "  ✓ frontend/.env"
echo "  ✓ .env (root directory)"
echo ""
echo "Important credentials:"
echo "  Database: $DB_NAME"
echo "  DB User: $DB_USER"
echo "  DB Password: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}IMPORTANT: Keep these credentials safe!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review the .env files if needed"
echo "  2. Run: sudo ./deploy.sh $DOMAIN"
echo ""

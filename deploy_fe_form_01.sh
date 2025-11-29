#!/bin/bash
# Deployment script for FE-FORM-01 (Form Validation) fix
# Run this on the server: bash deploy_fe_form_01.sh
# Delete after use

set -e  # Exit on any error

echo "=========================================="
echo "FE-FORM-01 Deployment Script"
echo "=========================================="

cd ~/sales-orders-manager

echo ""
echo "[1/6] Pulling latest changes..."
git pull origin main

echo ""
echo "[2/6] Building shared library..."
cd shared
npm install
npm run build
cd ..

echo ""
echo "[3/6] Rebuilding frontend..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "[4/6] Testing backend schema validation..."
cd backend
python -c "
from datetime import date, timedelta
from app.schemas import OrderCreate

# Test with past date - should fail
try:
    order = OrderCreate(
        spectrum_reference='TEST123',
        customer_account_number='ACC123',
        business_name='Test Business',
        customer_name='John Doe',
        customer_email='test@example.com',
        customer_phone='555-123-4567',
        install_date=date.today() - timedelta(days=1),
        install_time='9:00 AM - 10:00 AM'
    )
    echo 'FAIL: Past date should be rejected'
    exit 1
except ValueError:
    print('OK: Past date validation working')

# Test with today
try:
    order = OrderCreate(
        spectrum_reference='TEST123',
        customer_account_number='ACC123',
        business_name='Test Business',
        customer_name='John Doe',
        customer_email='test@example.com',
        customer_phone='555-123-4567',
        install_date=date.today(),
        install_time='9:00 AM - 10:00 AM'
    )
    print('OK: Today date allowed')
except ValueError as e:
    print(f'FAIL: Today should be allowed: {e}')
    exit 1

print('All backend validation tests passed!')
"
cd ..

echo ""
echo "[5/6] Restarting services with docker compose..."
sudo docker compose -f docker-compose.prod.yml build frontend backend
sudo docker compose -f docker-compose.prod.yml up -d frontend backend

echo ""
echo "[6/6] Waiting for services to start..."
sleep 10

echo ""
echo "=========================================="
echo "Deployment complete!"
echo ""
echo "Changes deployed:"
echo "  - validateInstallDate() - rejects past dates on new orders"
echo "  - validateQuantity() - max 250 for voice/mobile/SBC"
echo "  - EMAIL_REGEX improved - requires 2+ char TLD"
echo "  - Service requirement - at least one product required"
echo "  - PDF past-date warning banner"
echo ""
echo "To verify:"
echo "  1. Try creating order with past date -> Should show error"
echo "  2. Try email 'a@b.c' -> Should show 'Invalid email format'"
echo "  3. Try submitting with no products -> Should show error"
echo ""
echo "Delete this script after verification:"
echo "  rm ~/sales-orders-manager/deploy_fe_form_01.sh"
echo "=========================================="

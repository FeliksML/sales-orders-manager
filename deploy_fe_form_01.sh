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
echo "[1/4] Pulling latest changes..."
git pull origin main

echo ""
echo "[2/4] Rebuilding containers with docker compose..."
sudo docker compose -f docker-compose.prod.yml build --no-cache frontend backend

echo ""
echo "[3/4] Restarting services..."
sudo docker compose -f docker-compose.prod.yml up -d frontend backend

echo ""
echo "[4/4] Waiting for services to start..."
sleep 10

# Check if containers are running
echo ""
echo "Container status:"
sudo docker compose -f docker-compose.prod.yml ps frontend backend

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

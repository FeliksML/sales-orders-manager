#!/bin/bash
# 📊 Deployment script for FE-CHART-01 (Pie Chart Fix)
# Run this on the server: bash deploy_fe_chart_01.sh
# Delete after use

set -e  # Exit on any error

echo "=========================================="
echo "📊 FE-CHART-01 Deployment Script"
echo "=========================================="

cd ~/sales-orders-manager

echo ""
echo "⬇️  [1/4] Pulling latest changes..."
git pull origin main

echo ""
echo "🔨 [2/4] Rebuilding containers with docker compose..."
sudo docker compose -f docker-compose.prod.yml build --no-cache frontend

echo ""
echo "🚀 [3/4] Restarting services..."
sudo docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "⏳ [4/4] Waiting for services to start..."
sleep 10

# Check if containers are running
echo ""
echo "📋 Container status:"
sudo docker compose -f docker-compose.prod.yml ps frontend

echo ""
echo "=========================================="
echo "✅ Deployment complete!"
echo ""
echo "🔧 Changes deployed:"
echo "  - Fixed: Stats API now called on initial page load"
echo "  - Fixed: Filter useEffect no longer cancels initial refresh"
echo "  - Added: Loading spinner for pie chart while stats load"
echo ""
echo "🧪 To verify:"
echo "  1. Hard refresh page (Cmd+Shift+R)"
echo "  2. Check server logs: /api/orders/stats should appear"
echo "  3. Pie chart should now show immediately on page load"
echo ""
echo "🗑️  Delete this script after verification:"
echo "  rm ~/sales-orders-manager/deploy_fe_chart_01.sh"
echo "=========================================="

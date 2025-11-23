#!/bin/bash

# Quick Start Script for DigitalOcean Deployment
# This script commits and pushes the deployment configuration

echo "🚀 Sales Order Manager - DigitalOcean Deployment"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/app/main.py" ]; then
    echo "❌ Error: Not in the sales-order-manager directory"
    echo "Please run this script from the project root"
    exit 1
fi

echo "✅ In correct directory"
echo ""

# Check if .do directory exists
if [ ! -d ".do" ]; then
    echo "❌ Error: .do directory not found"
    echo "Deployment configuration files are missing"
    exit 1
fi

echo "✅ Deployment configuration found"
echo ""

# Check git status
echo "📋 Checking git status..."
git status --short

echo ""
echo "📦 Adding .do configuration files..."
git add .do/

echo ""
echo "💾 Committing changes..."
git commit -m "Add DigitalOcean deployment configuration

- Add app.yaml with complete service configuration
- Add deployment guide with step-by-step instructions
- Add environment variables documentation
- Configure Docker-based deployment
- Setup frontend and backend services
- Configure database connection"

if [ $? -ne 0 ]; then
    echo "⚠️  No changes to commit (files may already be committed)"
else
    echo "✅ Changes committed"
fi

echo ""
echo "⬆️  Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Success! Configuration pushed to GitHub"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Go to DigitalOcean: https://cloud.digitalocean.com"
    echo "2. Create database (if not already created)"
    echo "3. Go to Apps → Create App"
    echo "4. Import from App Spec → Use .do/app.yaml"
    echo "5. Set environment variables (see .do/ENVIRONMENT_VARIABLES.md)"
    echo "6. Deploy!"
    echo ""
    echo "📖 Full guide: .do/DEPLOY_GUIDE.md"
else
    echo ""
    echo "❌ Error pushing to GitHub"
    echo "Please check your git configuration and try again"
    exit 1
fi

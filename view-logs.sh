#!/bin/bash
# Sales Order Manager - Log Viewer
# Quick script to view logs from DigitalOcean App Platform

APP_ID="2fae7563-410c-483c-9c10-7d32e14ade1e"

echo "====================================="
echo "📋 Sales Order Manager - Log Viewer"
echo "====================================="
echo ""

# Parse command line arguments
FILTER="${1:-all}"
FOLLOW="${2:-false}"

case $FILTER in
    email)
        echo "🔍 Filtering for EMAIL logs..."
        echo ""
        doctl apps logs $APP_ID --type run --follow=$FOLLOW | grep -i -E "(email|mail|verification|verify|smtp|📧|📤|✅ Successfully sent|❌ Failed to send)"
        ;;
    error)
        echo "🔍 Filtering for ERROR logs..."
        echo ""
        doctl apps logs $APP_ID --type run --follow=$FOLLOW | grep -i -E "(error|exception|failed|❌)"
        ;;
    recaptcha)
        echo "🔍 Filtering for RECAPTCHA logs..."
        echo ""
        doctl apps logs $APP_ID --type run --follow=$FOLLOW | grep -i -E "(recaptcha|captcha|🔑)"
        ;;
    auth)
        echo "🔍 Filtering for AUTH logs..."
        echo ""
        doctl apps logs $APP_ID --type run --follow=$FOLLOW | grep -i -E "(auth|login|register|password|token|verification)"
        ;;
    all)
        echo "📜 Showing ALL logs..."
        echo ""
        doctl apps logs $APP_ID --type run --follow=$FOLLOW
        ;;
    help|--help|-h)
        echo "Usage: ./view-logs.sh [filter] [follow]"
        echo ""
        echo "Filters:"
        echo "  all        - Show all logs (default)"
        echo "  email      - Show email-related logs"
        echo "  error      - Show errors only"
        echo "  recaptcha  - Show reCAPTCHA logs"
        echo "  auth       - Show authentication logs"
        echo ""
        echo "Follow:"
        echo "  false      - Show recent logs and exit (default)"
        echo "  true       - Follow logs in real-time"
        echo ""
        echo "Examples:"
        echo "  ./view-logs.sh email        # Show email logs"
        echo "  ./view-logs.sh error true   # Follow error logs"
        echo "  ./view-logs.sh all true     # Follow all logs"
        exit 0
        ;;
    *)
        echo "❌ Unknown filter: $FILTER"
        echo "Run './view-logs.sh help' for usage information"
        exit 1
        ;;
esac

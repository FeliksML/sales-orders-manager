#!/bin/bash

###############################################################################
# Setup Cron Job for Automated Database Backups
# Configures daily database backups at 2 AM
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Setup Automated Database Backups"
echo "=========================================="
echo ""

# Get the absolute path of the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup_db.sh"

if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}ERROR: Backup script not found: $BACKUP_SCRIPT${NC}"
    exit 1
fi

echo "Project directory: $PROJECT_DIR"
echo "Backup script: $BACKUP_SCRIPT"
echo ""

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job entry
CRON_JOB="0 2 * * * cd $PROJECT_DIR && $BACKUP_SCRIPT >> $PROJECT_DIR/backups/backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo -e "${YELLOW}Cron job already exists${NC}"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep "$BACKUP_SCRIPT"
    echo ""
    read -p "Do you want to replace it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 0
    fi

    # Remove old cron job
    crontab -l | grep -v "$BACKUP_SCRIPT" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo -e "${GREEN}Cron job added successfully!${NC}"
echo ""
echo "Schedule: Daily at 2:00 AM"
echo "Log file: $PROJECT_DIR/backups/backup.log"
echo ""
echo "Current cron jobs:"
crontab -l
echo ""
echo "You can view the backup log with:"
echo "  tail -f $PROJECT_DIR/backups/backup.log"
echo ""
echo "To remove the cron job:"
echo "  crontab -e"
echo "  (delete the line containing 'backup_db.sh')"
echo ""

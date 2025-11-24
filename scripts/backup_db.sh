#!/bin/bash

###############################################################################
# Database Backup Script
# Creates a backup of the PostgreSQL database
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Database Backup"
echo "=========================================="
echo ""

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
else
    echo -e "${RED}ERROR: .env file not found${NC}"
    exit 1
fi

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${POSTGRES_DB}_${TIMESTAMP}.sql"

echo "Backing up database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"
echo ""

# Create backup using Docker
if docker compose -f docker-compose.prod.yml exec -T database pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"; then
    # Compress backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"

    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    echo -e "${GREEN}Backup completed successfully!${NC}"
    echo ""
    echo "Backup file: $BACKUP_FILE"
    echo "Size: $SIZE"
    echo ""

    # List recent backups
    echo "Recent backups:"
    ls -lht "$BACKUP_DIR" | head -6
    echo ""

    # Optional: Remove backups older than 30 days
    echo "Cleaning up old backups (older than 30 days)..."
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +30 -delete

    echo -e "${GREEN}Done!${NC}"
else
    echo -e "${RED}Backup failed!${NC}"
    exit 1
fi

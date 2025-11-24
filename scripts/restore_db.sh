#!/bin/bash

###############################################################################
# Database Restore Script
# Restores a PostgreSQL database from a backup file
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Database Restore"
echo "=========================================="
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Available backups:"
    ls -lht ./backups/*.sql.gz 2>/dev/null || echo "No backups found"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 ./backups/backup_sales_order_db_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
else
    echo -e "${RED}ERROR: .env file not found${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will replace the current database!${NC}"
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [ "$REPLY" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Creating backup of current database before restore..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SAFETY_BACKUP="./backups/pre_restore_backup_${TIMESTAMP}.sql.gz"
mkdir -p ./backups

if docker compose -f docker-compose.prod.yml exec -T database pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$SAFETY_BACKUP"; then
    echo -e "${GREEN}Safety backup created: $SAFETY_BACKUP${NC}"
else
    echo -e "${RED}Failed to create safety backup${NC}"
    read -p "Continue anyway? (yes/no): " -r
    if [ "$REPLY" != "yes" ]; then
        exit 1
    fi
fi

echo ""
echo "Restoring database..."

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup file..."
    gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T database psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
else
    cat "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T database psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Database restored successfully!${NC}"
    echo ""
    echo "Restarting backend service..."
    docker compose -f docker-compose.prod.yml restart backend
    echo ""
    echo -e "${GREEN}Done!${NC}"
else
    echo ""
    echo -e "${RED}Restore failed!${NC}"
    echo "You can restore the safety backup with:"
    echo "  $0 $SAFETY_BACKUP"
    exit 1
fi

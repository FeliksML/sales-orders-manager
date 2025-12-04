#!/bin/bash
#
# fix-db-auth.sh - PostgreSQL Authentication Diagnostic and Fix Script
#
# This script diagnoses and fixes the "password authentication failed" error
# for the sales_order_user in your Docker PostgreSQL setup.
#
# Usage:
#   chmod +x fix-db-auth.sh
#   ./fix-db-auth.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}[$1] $2${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}  → $1${NC}"
}

print_header "PostgreSQL Authentication Fix Script"

# Get the directory where the script is run (should be project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "Working directory: ${CYAN}$SCRIPT_DIR${NC}"
echo ""

#######################################
# STEP 1: Detect Environment Files
#######################################
print_step "1/8" "Detecting environment configuration..."

ENV_FILE=""
COMPOSE_FILE=""

# Find .env file
if [ -f ".env.prod" ]; then
    ENV_FILE=".env.prod"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
elif [ -f "backend/.env" ]; then
    ENV_FILE="backend/.env"
fi

# Find docker-compose file
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi

if [ -n "$ENV_FILE" ]; then
    print_success "Found env file: $ENV_FILE"
else
    print_error "No .env file found!"
fi

if [ -n "$COMPOSE_FILE" ]; then
    print_success "Found compose file: $COMPOSE_FILE"
else
    print_error "No docker-compose file found!"
    exit 1
fi

#######################################
# STEP 2: Extract Credentials
#######################################
print_step "2/8" "Extracting database credentials..."

# Function to get env value from file
get_env_value() {
    local key=$1
    local file=$2
    local value=""

    if [ -f "$file" ]; then
        value=$(grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    fi
    echo "$value"
}

# Try to get from env file
if [ -n "$ENV_FILE" ]; then
    DB_USER=$(get_env_value "POSTGRES_USER" "$ENV_FILE")
    DB_PASSWORD=$(get_env_value "POSTGRES_PASSWORD" "$ENV_FILE")
    DB_NAME=$(get_env_value "POSTGRES_DB" "$ENV_FILE")
fi

# Try to get from docker-compose if not in env
if [ -z "$DB_PASSWORD" ] && [ -n "$COMPOSE_FILE" ]; then
    DB_PASSWORD=$(grep -A 20 "database:" "$COMPOSE_FILE" | grep "POSTGRES_PASSWORD" | head -1 | cut -d':' -f2- | tr -d ' "' | cut -d'}' -f1)
    DB_USER=$(grep -A 20 "database:" "$COMPOSE_FILE" | grep "POSTGRES_USER" | head -1 | cut -d':' -f2- | tr -d ' "' | cut -d'}' -f1)
    DB_NAME=$(grep -A 20 "database:" "$COMPOSE_FILE" | grep "POSTGRES_DB" | head -1 | cut -d':' -f2- | tr -d ' "' | cut -d'}' -f1)
fi

# Also check environment variables
if [ -z "$DB_PASSWORD" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    DB_PASSWORD="$POSTGRES_PASSWORD"
fi

# Defaults
DB_USER=${DB_USER:-"sales_order_user"}
DB_NAME=${DB_NAME:-"sales_order_db"}

print_info "DB User: $DB_USER"
print_info "DB Name: $DB_NAME"

if [ -n "$DB_PASSWORD" ]; then
    PASS_PREVIEW="${DB_PASSWORD:0:4}****"
    print_info "DB Password: $PASS_PREVIEW (found, ${#DB_PASSWORD} chars)"
else
    print_error "Could not find POSTGRES_PASSWORD!"
    echo ""
    echo "Please set it manually:"
    read -sp "Enter the PostgreSQL password: " DB_PASSWORD
    echo ""

    if [ -z "$DB_PASSWORD" ]; then
        print_error "Password is required. Exiting."
        exit 1
    fi
fi

#######################################
# STEP 3: Find Database Container
#######################################
print_step "3/8" "Finding database container..."

# Find the database container by various names
DB_CONTAINER=""
for name in "sales-order-database-prod" "database" "postgres" "db" "sales-order-db"; do
    FOUND=$(docker ps -a --format '{{.Names}}' | grep -E "^${name}$|${name}-" | head -1)
    if [ -n "$FOUND" ]; then
        DB_CONTAINER="$FOUND"
        break
    fi
done

# If still not found, try pattern matching
if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -iE "database|postgres|db" | head -1)
fi

if [ -z "$DB_CONTAINER" ]; then
    print_error "Could not find database container!"
    echo ""
    echo "Available containers:"
    docker ps -a --format "  {{.Names}} ({{.Status}})"
    echo ""
    read -p "Enter the database container name: " DB_CONTAINER

    if [ -z "$DB_CONTAINER" ]; then
        print_error "Container name is required. Exiting."
        exit 1
    fi
fi

print_success "Found container: $DB_CONTAINER"

#######################################
# STEP 4: Check Container Status
#######################################
print_step "4/8" "Checking container status..."

CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$DB_CONTAINER" 2>/dev/null || echo "not_found")

if [ "$CONTAINER_STATUS" = "not_found" ]; then
    print_error "Container '$DB_CONTAINER' not found!"
    exit 1
fi

print_info "Status: $CONTAINER_STATUS"

if [ "$CONTAINER_STATUS" != "running" ]; then
    print_info "Starting container..."
    docker start "$DB_CONTAINER" >/dev/null 2>&1 || true
    sleep 5

    CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$DB_CONTAINER" 2>/dev/null)
    if [ "$CONTAINER_STATUS" != "running" ]; then
        print_error "Failed to start container!"
        echo "Check logs: docker logs $DB_CONTAINER"
        exit 1
    fi
    print_success "Container started"
fi

#######################################
# STEP 5: Test Current Connection
#######################################
print_step "5/8" "Testing current database connection..."

# Test with PGPASSWORD
export PGPASSWORD="$DB_PASSWORD"
CONNECTION_TEST=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 AS test;" 2>&1) || true

if echo "$CONNECTION_TEST" | grep -q "1"; then
    print_success "Connection already works! No fix needed."
    echo ""
    echo -e "${GREEN}Database connection is healthy.${NC}"
    echo ""
    echo "If backend is still failing, restart it:"
    echo -e "  ${CYAN}docker-compose -f $COMPOSE_FILE restart backend${NC}"
    exit 0
else
    print_info "Connection failed with app user. Will attempt fix..."
    print_info "Error: $(echo "$CONNECTION_TEST" | head -1)"
fi

#######################################
# STEP 6: Connect as Superuser
#######################################
print_step "6/8" "Connecting as PostgreSQL superuser..."

# Try connecting as postgres (default superuser)
SUPERUSER_TEST=$(docker exec "$DB_CONTAINER" psql -U postgres -c "SELECT 1 AS test;" 2>&1) || true

if ! echo "$SUPERUSER_TEST" | grep -q "1"; then
    print_info "Direct postgres connection failed, trying with trust..."

    # Check if we can connect at all
    SUPERUSER_TEST=$(docker exec "$DB_CONTAINER" psql -U postgres -h localhost -c "SELECT 1;" 2>&1) || true

    if ! echo "$SUPERUSER_TEST" | grep -q "1"; then
        print_error "Cannot connect as superuser!"
        echo ""
        echo "Database logs:"
        docker logs "$DB_CONTAINER" 2>&1 | tail -30
        echo ""
        echo "The database might need to be recreated. This will DELETE all data:"
        echo "  docker-compose -f $COMPOSE_FILE down -v"
        echo "  docker-compose -f $COMPOSE_FILE up -d"
        exit 1
    fi
fi

print_success "Superuser connection successful"

#######################################
# STEP 7: Fix Credentials
#######################################
print_step "7/8" "Fixing database credentials..."

# Check if database exists
DB_EXISTS=$(docker exec "$DB_CONTAINER" psql -U postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>/dev/null) || true

if [ "$DB_EXISTS" != "1" ]; then
    print_info "Creating database '$DB_NAME'..."
    docker exec "$DB_CONTAINER" psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>&1 || true
fi

# Check if user exists
USER_EXISTS=$(docker exec "$DB_CONTAINER" psql -U postgres -tAc \
    "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';" 2>/dev/null) || true

# Escape password for SQL (handle special characters)
ESCAPED_PASSWORD=$(printf '%s' "$DB_PASSWORD" | sed "s/'/''/g")

if [ "$USER_EXISTS" = "1" ]; then
    print_info "Updating password for existing user '$DB_USER'..."
    docker exec "$DB_CONTAINER" psql -U postgres -c \
        "ALTER USER $DB_USER WITH PASSWORD '$ESCAPED_PASSWORD';" 2>&1
else
    print_info "Creating user '$DB_USER'..."
    docker exec "$DB_CONTAINER" psql -U postgres -c \
        "CREATE USER $DB_USER WITH PASSWORD '$ESCAPED_PASSWORD';" 2>&1
fi

# Grant all necessary privileges
print_info "Granting privileges..."
docker exec "$DB_CONTAINER" psql -U postgres -c \
    "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>&1 || true

docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -c \
    "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>&1 || true

docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -c \
    "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;" 2>&1 || true

docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -c \
    "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" 2>&1 || true

docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -c \
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>&1 || true

docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -c \
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;" 2>&1 || true

print_success "Credentials updated"

#######################################
# STEP 8: Verify Fix
#######################################
print_step "8/8" "Verifying fix..."

sleep 2

VERIFY_TEST=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 'CONNECTION_OK' AS status;" 2>&1) || true

if echo "$VERIFY_TEST" | grep -q "CONNECTION_OK"; then
    print_success "Verification successful!"
else
    print_error "Verification failed!"
    print_info "Error: $VERIFY_TEST"
    echo ""
    echo "Trying to check pg_hba.conf..."
    docker exec "$DB_CONTAINER" cat /var/lib/postgresql/data/pg_hba.conf 2>/dev/null | grep -v "^#" | grep -v "^$" || true
    exit 1
fi

#######################################
# COMPLETE
#######################################
print_header "Fix Complete!"

echo -e "${GREEN}Database authentication has been fixed.${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "  ${CYAN}1. Restart the backend container:${NC}"
echo -e "     docker-compose -f $COMPOSE_FILE restart backend"
echo ""
echo -e "  ${CYAN}2. Check backend logs:${NC}"
echo -e "     docker-compose -f $COMPOSE_FILE logs -f backend"
echo ""
echo -e "  ${CYAN}3. Test the application${NC}"
echo ""

# Offer to restart backend automatically
read -p "Would you like to restart the backend now? (y/n): " RESTART_CHOICE
if [ "$RESTART_CHOICE" = "y" ] || [ "$RESTART_CHOICE" = "Y" ]; then
    echo ""
    print_info "Restarting backend..."
    docker-compose -f "$COMPOSE_FILE" restart backend 2>&1 || docker compose -f "$COMPOSE_FILE" restart backend 2>&1
    sleep 3
    print_success "Backend restarted!"
    echo ""
    echo "Showing recent logs (Ctrl+C to exit):"
    echo ""
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 -f backend 2>&1 || docker compose -f "$COMPOSE_FILE" logs --tail=50 -f backend 2>&1
fi

#!/bin/bash

###############################################################################
# Deployment Script for Sales Order Manager
# Deploys the application using Docker Compose with Nginx reverse proxy
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="$1"
SKIP_SSL="${2:-false}"

echo "=========================================="
echo "Sales Order Manager - Deployment"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if .env files exist
if [ ! -f ".env" ] || [ ! -f "backend/.env" ] || [ ! -f "frontend/.env" ]; then
    echo -e "${RED}ERROR: .env files not found${NC}"
    echo "Please run ./configure_env.sh first"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

echo "Step 1/8: Stopping any running containers..."
docker compose -f docker-compose.prod.yml down || true

echo ""
echo "Step 2/8: Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo ""
echo "Step 3/8: Starting database..."
docker compose -f docker-compose.prod.yml up -d database

echo "Waiting for database to be ready..."
sleep 10

# Check if database is ready
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml exec -T database pg_isready -U $POSTGRES_USER > /dev/null 2>&1; then
        echo -e "${GREEN}Database is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Database failed to start${NC}"
        exit 1
    fi
    sleep 2
done

echo ""
echo "Step 4/8: Initializing database..."

# Check if database is already initialized
TABLES=$(docker compose -f docker-compose.prod.yml exec -T database psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLES" -gt "0" ]; then
    echo -e "${YELLOW}Database already initialized (found $TABLES tables)${NC}"
    read -p "Do you want to reinitialize? This will DELETE ALL DATA! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f docker-compose.prod.yml run --rm backend python init_database.py
        echo -e "${GREEN}Database reinitialized${NC}"
    else
        echo "Skipping database initialization"
    fi
else
    echo "Initializing database for the first time..."
    docker compose -f docker-compose.prod.yml run --rm backend python init_database.py
    echo -e "${GREEN}Database initialized successfully${NC}"
fi

echo ""
echo "Step 5/8: Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "Step 6/8: Waiting for services to be healthy..."
sleep 5

# Check backend health
for i in {1..30}; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}Backend is healthy!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Backend failed to start${NC}"
        docker compose -f docker-compose.prod.yml logs backend
        exit 1
    fi
    sleep 2
done

echo ""
echo "Step 7/8: Configuring Nginx..."

# Create nginx configuration
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

if [ -n "$DOMAIN" ]; then
    echo "Configuring Nginx for domain: $DOMAIN"

    cat > /etc/nginx/sites-available/sales-order-manager <<EOF
# Upstream backends
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Allow certbot for SSL certificate verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size
    client_max_body_size 10M;

    # API endpoints
    location ~ ^/(api|auth|health|readiness) {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Create temporary config for SSL certificate generation
    cat > /etc/nginx/sites-available/sales-order-manager-temp <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ~ ^/(api|auth|health|readiness) {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Enable temporary config
    ln -sf /etc/nginx/sites-available/sales-order-manager-temp /etc/nginx/sites-enabled/sales-order-manager

else
    # No domain - use IP address only (HTTP)
    echo "Configuring Nginx for IP address (HTTP only)"

    cat > /etc/nginx/sites-available/sales-order-manager <<EOF
# Upstream backends
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    listen [::]:80;

    # Client body size
    client_max_body_size 10M;

    # API endpoints
    location ~ ^/(api|auth|health|readiness) {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/sales-order-manager /etc/nginx/sites-enabled/sales-order-manager
fi

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

echo -e "${GREEN}Nginx configured successfully${NC}"

# Step 8: SSL Certificate
if [ -n "$DOMAIN" ] && [ "$SKIP_SSL" != "true" ]; then
    echo ""
    echo "Step 8/8: Setting up SSL certificate..."

    # Create webroot directory
    mkdir -p /var/www/html

    # Get SSL certificate
    echo "Obtaining SSL certificate for $DOMAIN..."
    if certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
        echo -e "${GREEN}SSL certificate obtained successfully${NC}"

        # Switch to HTTPS config
        ln -sf /etc/nginx/sites-available/sales-order-manager /etc/nginx/sites-enabled/sales-order-manager
        nginx -t && systemctl reload nginx
    else
        echo -e "${YELLOW}WARNING: Failed to obtain SSL certificate${NC}"
        echo "You can try again later with: sudo certbot --nginx -d $DOMAIN"
        echo "Continuing with HTTP only..."
    fi
else
    echo ""
    echo "Step 8/8: Skipping SSL certificate setup"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Services Status:"
docker compose -f docker-compose.prod.yml ps
echo ""

if [ -n "$DOMAIN" ]; then
    echo -e "${GREEN}Your application is available at:${NC}"
    echo -e "  ${BLUE}https://$DOMAIN${NC}"
    echo ""
else
    SERVER_IP=$(curl -s ifconfig.me || echo "YOUR_SERVER_IP")
    echo -e "${GREEN}Your application is available at:${NC}"
    echo -e "  ${BLUE}http://$SERVER_IP${NC}"
    echo ""
    echo -e "${YELLOW}Note: Using HTTP (not HTTPS). For SSL, provide a domain name.${NC}"
fi

echo "Default admin credentials:"
echo "  Email: wursts.baryon0d@icloud.com"
echo "  Password: (check Docker logs: docker compose -f docker-compose.prod.yml logs backend | grep 'Admin password')"
echo ""
echo "Useful commands:"
echo "  View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  Restart: docker compose -f docker-compose.prod.yml restart"
echo "  Stop: docker compose -f docker-compose.prod.yml down"
echo "  Backup DB: ./scripts/backup_db.sh"
echo ""

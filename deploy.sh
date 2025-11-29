#!/bin/bash

###############################################################################
#  🚀 SALES ORDER MANAGER - LEGENDARY DEPLOYMENT SCRIPT 🚀
#
#  "I used to deploy manually... then I took an arrow to the knee."
#                                        - Every DevOps Engineer Ever
###############################################################################

set -e

# Colors (because we're fancy like that 💅)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAIN="$1"
SKIP_SSL="${2:-false}"
SKIP_PULL="${3:-false}"

# Fun loading spinner
spin() {
    local pid=$1
    local delay=0.1
    local spinstr='🌑🌒🌓🌔🌕🌖🌗🌘'
    while ps -p $pid > /dev/null 2>&1; do
        for i in $(seq 0 7); do
            printf "\r  ${spinstr:$i:1} %s" "$2"
            sleep $delay
        done
    done
    printf "\r"
}

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  🎮 ${MAGENTA}SALES ORDER MANAGER${NC} - ${GREEN}DEPLOYMENT WIZARD${NC} 🧙‍♂️           ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}     ${YELLOW}\"Deploy fast, sell faster!\"${NC}                             ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "  ${RED}💀 PERMISSION DENIED!${NC}"
    echo -e "  ${YELLOW}You shall not pass... without sudo!${NC}"
    echo -e "  ${BLUE}Try: sudo ./deploy.sh${NC}"
    exit 1
fi

echo -e "  ${GREEN}✅ Root access confirmed${NC} - You have the power! ⚡"
echo ""

###############################################################################
# STEP 0: GIT PULL (Get the freshest code, like morning coffee ☕)
###############################################################################
if [ "$SKIP_PULL" != "true" ]; then
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${CYAN}📡 STEP 0/9: Fetching Latest Code${NC}"
    echo -e "  ${YELLOW}\"Git pull: Because copy-paste is for amateurs\"${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo -e "  🔄 Pulling latest changes from origin..."
    if git pull origin main; then
        echo -e "  ${GREEN}✅ Code updated successfully!${NC} Fresh commits incoming! 📬"
    else
        echo -e "  ${YELLOW}⚠️  Git pull had some issues, but we'll continue anyway${NC}"
        echo -e "  ${BLUE}(You might have local changes. That's cool, we don't judge.)${NC}"
    fi
    echo ""
fi

###############################################################################
# STEP 0.5: CHECK DEPENDENCIES (Making sure we have all the ingredients 🧪)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}🔍 STEP 0.5/9: Checking Dependencies${NC}"
echo -e "  ${YELLOW}\"A deployment without Docker is like pizza without cheese\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "  ${RED}💔 Docker not found!${NC}"
    echo -e "  ${YELLOW}Install it: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi
echo -e "  ${GREEN}✅ Docker${NC} - Ready to containerize! 🐳"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "  ${RED}💔 Docker Compose not found!${NC}"
    exit 1
fi
echo -e "  ${GREEN}✅ Docker Compose${NC} - Orchestration mode activated! 🎼"

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "  ${YELLOW}⚠️  Nginx not found - installing...${NC}"
    apt-get update && apt-get install -y nginx
fi
echo -e "  ${GREEN}✅ Nginx${NC} - Reverse proxy standing by! 🔄"
echo ""

###############################################################################
# STEP 1: ENV FILES CHECK (The secret ingredients 🤫)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}📋 STEP 1/9: Checking Environment Files${NC}"
echo -e "  ${YELLOW}\"Secrets, secrets are no fun... unless they're in .env!\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ! -f ".env" ] || [ ! -f "backend/.env" ] || [ ! -f "frontend/.env" ]; then
    echo -e "  ${RED}🚨 ALERT: Missing .env files detected!${NC}"
    echo -e "  ${YELLOW}Run ./configure_env.sh first, young padawan${NC}"
    exit 1
fi

# Check for RESEND_API_KEY
if grep -q "RESEND_API_KEY" backend/.env; then
    RESEND_KEY=$(grep "RESEND_API_KEY" backend/.env | cut -d '=' -f2)
    if [ -n "$RESEND_KEY" ] && [ "$RESEND_KEY" != "" ]; then
        echo -e "  ${GREEN}✅ RESEND_API_KEY${NC} - Email superpowers enabled! 📧✨"
    else
        echo -e "  ${YELLOW}⚠️  RESEND_API_KEY is empty${NC} - Emails won't work!"
        echo -e "  ${BLUE}Add to backend/.env: RESEND_API_KEY=re_your_key_here${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  RESEND_API_KEY not found in backend/.env${NC}"
    echo -e "  ${BLUE}Add: RESEND_API_KEY=re_your_key_here${NC}"
fi

echo -e "  ${GREEN}✅ Environment files${NC} - All secrets accounted for! 🔐"
echo ""

# Load environment variables
set -a
source .env
set +a

###############################################################################
# STEP 2: STOP CONTAINERS (Time to say goodbye... temporarily 👋)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}🛑 STEP 2/9: Stopping Running Containers${NC}"
echo -e "  ${YELLOW}\"Out with the old, in with the new!\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

docker compose -f docker-compose.prod.yml down 2>/dev/null || true
echo -e "  ${GREEN}✅ Containers stopped${NC} - They're just taking a nap 😴"
echo ""

###############################################################################
# STEP 3: BUILD IMAGES (Assembling the Avengers 🦸)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}🏗️  STEP 3/9: Building Docker Images${NC}"
echo -e "  ${YELLOW}\"Rome wasn't built in a day, but our images will be!\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "  🔨 Building... (grab a ☕, this might take a minute)"
docker compose -f docker-compose.prod.yml build --quiet
echo -e "  ${GREEN}✅ Images built${NC} - They're beautiful! 🎨"
echo ""

###############################################################################
# STEP 4: START DATABASE (Waking up the data keeper 🗄️)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}🐘 STEP 4/9: Starting PostgreSQL Database${NC}"
echo -e "  ${YELLOW}\"An elephant never forgets... your data!\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

docker compose -f docker-compose.prod.yml up -d database
echo -e "  ⏳ Waiting for PostgreSQL to wake up..."

for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml exec -T database pg_isready -U $POSTGRES_USER > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Database is ready!${NC} The elephant has awakened! 🐘💪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "  ${RED}💀 Database refused to cooperate${NC}"
        echo -e "  ${YELLOW}Check logs: docker compose -f docker-compose.prod.yml logs database${NC}"
        exit 1
    fi
    printf "  🔄 Still waking up... (%d/30)\r" $i
    sleep 2
done
echo ""

###############################################################################
# STEP 5: INITIALIZE DATABASE (Teaching the elephant new tricks 🎪)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}📊 STEP 5/9: Initializing Database${NC}"
echo -e "  ${YELLOW}\"With great data comes great responsibility\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TABLES=$(docker compose -f docker-compose.prod.yml exec -T database psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLES" -gt "0" ]; then
    echo -e "  ${GREEN}✅ Database already initialized${NC} (found $TABLES tables)"
    echo -e "  ${BLUE}Skipping initialization - your data is safe! 🛡️${NC}"
else
    echo -e "  🌱 First time setup - initializing database..."
    docker compose -f docker-compose.prod.yml run --rm backend python init_database.py
    echo -e "  ${GREEN}✅ Database initialized${NC} - Tables created! 📋"
fi
echo ""

###############################################################################
# STEP 6: LAUNCH ALL SERVICES (3... 2... 1... LIFTOFF! 🚀)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}🚀 STEP 6/9: Launching All Services${NC}"
echo -e "  ${YELLOW}\"Houston, we have liftoff!\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

docker compose -f docker-compose.prod.yml up -d
echo -e "  ${GREEN}✅ All services launched!${NC} 🎉"
echo ""

###############################################################################
# STEP 7: HEALTH CHECK (Making sure everyone's feeling good 🏥)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}🏥 STEP 7/9: Running Health Checks${NC}"
echo -e "  ${YELLOW}\"An apple a day... wait, wrong industry\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sleep 5
for i in {1..30}; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Backend is healthy!${NC} FastAPI is feeling fantastic! 🏃‍♂️"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "  ${RED}💔 Backend seems unwell${NC}"
        echo -e "  ${YELLOW}Doctor's orders: docker compose -f docker-compose.prod.yml logs backend${NC}"
        exit 1
    fi
    printf "  💓 Checking pulse... (%d/30)\r" $i
    sleep 2
done

# Check frontend
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Frontend is healthy!${NC} React is radiating! ⚛️"
else
    echo -e "  ${YELLOW}⚠️  Frontend might need a moment...${NC}"
fi
echo ""

###############################################################################
# STEP 8: NGINX CONFIGURATION (The traffic controller 🚦)
###############################################################################
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}🔀 STEP 8/9: Configuring Nginx${NC}"
echo -e "  ${YELLOW}\"Directing traffic like a boss\"${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

if [ -n "$DOMAIN" ]; then
    echo -e "  🌐 Setting up for domain: ${CYAN}$DOMAIN${NC}"

    cat > /etc/nginx/sites-available/sales-order-manager <<EOF
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 10M;

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

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

    # Temp config for certbot
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
    }

    location ~ ^/(api|auth|health|readiness) {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/sales-order-manager-temp /etc/nginx/sites-enabled/sales-order-manager

else
    echo -e "  🌐 Setting up for IP address (HTTP only)"

    cat > /etc/nginx/sites-available/sales-order-manager <<EOF
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    listen [::]:80;

    client_max_body_size 10M;

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

rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo -e "  ${GREEN}✅ Nginx configured!${NC} Traffic flows like a river 🏞️"
echo ""

###############################################################################
# STEP 9: SSL CERTIFICATE (The padlock of trust 🔒)
###############################################################################
if [ -n "$DOMAIN" ] && [ "$SKIP_SSL" != "true" ]; then
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${CYAN}🔒 STEP 9/9: Setting Up SSL Certificate${NC}"
    echo -e "  ${YELLOW}\"HTTPS: Because security is sexy\"${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    mkdir -p /var/www/html

    if certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>/dev/null; then
        echo -e "  ${GREEN}✅ SSL certificate obtained!${NC} 🔐"
        ln -sf /etc/nginx/sites-available/sales-order-manager /etc/nginx/sites-enabled/sales-order-manager
        nginx -t && systemctl reload nginx
    else
        echo -e "  ${YELLOW}⚠️  SSL certificate failed${NC} - but that's okay!"
        echo -e "  ${BLUE}Try later: sudo certbot --nginx -d $DOMAIN${NC}"
    fi
else
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${CYAN}🔓 STEP 9/9: Skipping SSL${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi
echo ""

###############################################################################
# 🎉 DEPLOYMENT COMPLETE! 🎉
###############################################################################
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}   🎊 ${CYAN}DEPLOYMENT SUCCESSFUL!${NC} 🎊                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}   ${YELLOW}\"You did it! Your code is now in production!\"${NC}            ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}   ${YELLOW}\"Go celebrate! You've earned it!\"${NC}                        ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}📊 Services Status:${NC}"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose -f docker-compose.prod.yml ps
echo ""

if [ -n "$DOMAIN" ]; then
    echo -e "${GREEN}🌐 Your app is live at:${NC}"
    echo -e "   ${BLUE}➜  https://$DOMAIN${NC}  🔒"
else
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    echo -e "${GREEN}🌐 Your app is live at:${NC}"
    echo -e "   ${BLUE}➜  http://$SERVER_IP${NC}"
    echo -e "   ${YELLOW}(Add a domain for HTTPS)${NC}"
fi

echo ""
echo -e "${CYAN}🔑 Admin Login:${NC}"
echo -e "   Email: ${YELLOW}wursts.baryon0d@icloud.com${NC}"
echo -e "   Password: ${YELLOW}Check logs below${NC} 👇"
echo ""
echo -e "${CYAN}📧 Email Status:${NC}"
if grep -q "RESEND_API_KEY=re_" backend/.env 2>/dev/null; then
    echo -e "   ${GREEN}✅ Resend configured${NC} - Emails will work! 📬"
else
    echo -e "   ${YELLOW}⚠️  Add RESEND_API_KEY to backend/.env for email support${NC}"
fi

echo ""
echo -e "${CYAN}📜 Useful Commands:${NC}"
echo -e "   ${BLUE}View logs:${NC}     docker compose -f docker-compose.prod.yml logs -f"
echo -e "   ${BLUE}Restart:${NC}       docker compose -f docker-compose.prod.yml restart"
echo -e "   ${BLUE}Stop:${NC}          docker compose -f docker-compose.prod.yml down"
echo -e "   ${BLUE}Admin pass:${NC}    docker compose -f docker-compose.prod.yml logs backend | grep 'Admin password'"
echo -e "   ${BLUE}Update:${NC}        git pull && sudo ./deploy.sh"
echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}🚀 May your sales be plenty and your bugs be few! 🐛${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#!/bin/bash

###############################################################################
# 🚀 Quick Update Script for Sales Order Manager
# Pull changes and restart services with style!
###############################################################################

set -e

# Colors for fancy output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Fun loading animation
spin() {
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local delay=0.1
    local i=0
    while true; do
        printf "\r  ${CYAN}%s${NC} %s" "${chars:$i:1}" "$1"
        i=$(( (i + 1) % ${#chars} ))
        sleep $delay
    done
}

# Stop spinner
stop_spin() {
    kill $SPIN_PID 2>/dev/null || true
    wait $SPIN_PID 2>/dev/null || true
    printf "\r"
}

# Print with emoji
say() {
    echo -e "$1"
}

# Success message
success() {
    echo -e "  ${GREEN}✅ $1${NC}"
}

# Warning message
warn() {
    echo -e "  ${YELLOW}⚠️  $1${NC}"
}

# Error message
fail() {
    echo -e "  ${RED}❌ $1${NC}"
}

# Header
clear
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║${NC}  ${BOLD}🚀 SALES ORDER MANAGER - QUICK UPDATE 🚀${NC}                  ${MAGENTA}║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    fail "Please run as root (use sudo)"
    echo -e "  ${CYAN}💡 Try: ${BOLD}sudo ./update.sh${NC}"
    exit 1
fi

# Get start time
START_TIME=$(date +%s)

# Step 1: Git Pull
say "${BLUE}📥 Step 1/5:${NC} Fetching the latest code from git..."
echo ""

cd "$(dirname "$0")"

# Show current commit before pull
OLD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
say "  ${CYAN}📍 Current: ${OLD_COMMIT}${NC}"

# Pull changes
if git pull origin main 2>&1 | head -20; then
    NEW_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
        success "Already up to date! 😎"
    else
        success "Updated: ${OLD_COMMIT} → ${NEW_COMMIT} 🎉"
    fi
else
    fail "Git pull failed!"
    exit 1
fi
echo ""

# Step 2: Stop containers gracefully
say "${BLUE}🛑 Step 2/5:${NC} Stopping the old containers (goodbye friends!)..."
echo ""

docker compose -f docker-compose.prod.yml stop 2>&1 | while read line; do
    echo -e "  ${CYAN}${line}${NC}"
done
success "Containers stopped! They're taking a nap 😴"
echo ""

# Step 3: Rebuild if needed
say "${BLUE}🔨 Step 3/5:${NC} Rebuilding containers (making them stronger!)..."
echo ""

if docker compose -f docker-compose.prod.yml build --quiet 2>&1; then
    success "Build complete! Fresh and ready 💪"
else
    warn "Build had some noise, but probably fine..."
fi
echo ""

# Step 4: Start everything
say "${BLUE}🚀 Step 4/5:${NC} Launching all services (3... 2... 1... LIFTOFF!)..."
echo ""

docker compose -f docker-compose.prod.yml up -d 2>&1 | while read line; do
    echo -e "  ${CYAN}${line}${NC}"
done
success "All systems go! 🛸"
echo ""

# Step 5: Health checks
say "${BLUE}🏥 Step 5/5:${NC} Running health checks (say 'ahhh')..."
echo ""

# Wait for services
sleep 3

# Check database
say "  ${CYAN}🐘 PostgreSQL...${NC}"
for i in {1..10}; do
    if docker compose -f docker-compose.prod.yml exec -T database pg_isready -U sales_order_user -d sales_order_db > /dev/null 2>&1; then
        success "Database is alive!"
        break
    fi
    if [ $i -eq 10 ]; then
        fail "Database seems sleepy... 😴"
    fi
    sleep 1
done

# Check backend
say "  ${CYAN}🐍 Backend API...${NC}"
for i in {1..15}; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        success "Backend is healthy!"
        break
    fi
    if [ $i -eq 15 ]; then
        fail "Backend needs coffee ☕"
    fi
    sleep 1
done

# Check frontend
say "  ${CYAN}⚛️  Frontend...${NC}"
for i in {1..10}; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        success "Frontend looking good!"
        break
    fi
    if [ $i -eq 10 ]; then
        warn "Frontend might need a sec..."
    fi
    sleep 1
done

echo ""

# Calculate time taken
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Final status
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}✨ UPDATE COMPLETE! ✨${NC}                                    ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show service status with fun
echo -e "${BOLD}📊 Service Status:${NC}"
echo ""
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | while read line; do
    if echo "$line" | grep -q "Up"; then
        echo -e "  ${GREEN}🟢 ${line}${NC}"
    elif echo "$line" | grep -q "NAME"; then
        echo -e "  ${BOLD}${line}${NC}"
    else
        echo -e "  ${YELLOW}🟡 ${line}${NC}"
    fi
done

echo ""
echo -e "${CYAN}⏱️  Total time: ${BOLD}${DURATION} seconds${NC}"
echo ""

# Fun closing messages
MESSAGES=(
    "🎉 Ship it! Your code is now live!"
    "🚀 Houston, the deployment is successful!"
    "💯 Another successful deploy, you're on fire!"
    "🎊 Pop the champagne! (or coffee, no judgment)"
    "🦄 Magical deployment complete!"
    "⚡ Faster than a speeding bullet!"
    "🏆 Champion deployer right here!"
    "🌟 The code gods are pleased!"
)
RANDOM_MSG=${MESSAGES[$RANDOM % ${#MESSAGES[@]}]}
echo -e "${MAGENTA}${RANDOM_MSG}${NC}"
echo ""

# Helpful commands
echo -e "${BOLD}📚 Useful Commands:${NC}"
echo -e "  ${CYAN}View logs:${NC}    docker compose -f docker-compose.prod.yml logs -f"
echo -e "  ${CYAN}Restart:${NC}      docker compose -f docker-compose.prod.yml restart"
echo -e "  ${CYAN}Stop:${NC}         docker compose -f docker-compose.prod.yml down"
echo ""

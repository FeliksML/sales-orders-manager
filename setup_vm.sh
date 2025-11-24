#!/bin/bash

###############################################################################
# VM Setup Script for Sales Order Manager
# This script prepares a fresh Ubuntu 22.04/24.04 VM for deployment
###############################################################################

set -e  # Exit on error

echo "=========================================="
echo "Sales Order Manager - VM Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Please run as root (use sudo)"
    exit 1
fi

# Check Ubuntu version
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        echo "WARNING: This script is designed for Ubuntu. Your OS: $ID"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo "Step 1/7: Updating system packages..."
apt-get update
apt-get upgrade -y

echo ""
echo "Step 2/7: Installing essential packages..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    git \
    ufw \
    unattended-upgrades

echo ""
echo "Step 3/7: Installing Docker..."
# Remove old Docker versions if any
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add current user to docker group (if not root)
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
    echo "Added $SUDO_USER to docker group (re-login required for changes to take effect)"
fi

echo ""
echo "Step 4/7: Installing Docker Compose..."
# Docker Compose plugin is already installed, create alias for docker-compose command
cat > /usr/local/bin/docker-compose <<'EOF'
#!/bin/bash
docker compose "$@"
EOF
chmod +x /usr/local/bin/docker-compose

echo ""
echo "Step 5/7: Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx

echo ""
echo "Step 6/7: Installing Certbot for SSL certificates..."
apt-get install -y certbot python3-certbot-nginx

echo ""
echo "Step 7/7: Configuring firewall..."
# Reset firewall
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT: Do this first!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
ufw --force enable

echo ""
echo "Configuring automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo ""
echo "=========================================="
echo "VM Setup Complete!"
echo "=========================================="
echo ""
echo "Installed components:"
echo "  ✓ Docker $(docker --version | awk '{print $3}')"
echo "  ✓ Docker Compose $(docker compose version | awk '{print $4}')"
echo "  ✓ Nginx $(nginx -v 2>&1 | awk '{print $3}')"
echo "  ✓ Certbot $(certbot --version | awk '{print $2}')"
echo "  ✓ UFW firewall (enabled)"
echo "  ✓ Automatic security updates"
echo ""
echo "Firewall rules:"
ufw status numbered
echo ""
echo "Next steps:"
echo "  1. If you added a user to the docker group, log out and back in"
echo "  2. Clone your repository: git clone <your-repo-url>"
echo "  3. Run ./configure_env.sh to set up environment variables"
echo "  4. Run ./deploy.sh <your-domain.com> to deploy the application"
echo ""

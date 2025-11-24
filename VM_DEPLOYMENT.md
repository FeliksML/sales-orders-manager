# VM Deployment Guide

This guide will help you deploy the Sales Order Manager application on a DigitalOcean VM (or any Ubuntu 22.04/24.04 server).

## Overview

The application will be deployed using:
- **Docker Compose** for container orchestration
- **PostgreSQL** database in a Docker container
- **Nginx** as a reverse proxy
- **Let's Encrypt** for SSL/HTTPS (optional, requires domain)

## Prerequisites

1. **Fresh Ubuntu 22.04 or 24.04 VM** on DigitalOcean (or any cloud provider)
   - Recommended: At least 2GB RAM, 2 vCPUs, 50GB disk
   - Basic or Regular droplet works fine

2. **Domain Name** (optional but recommended)
   - If you want HTTPS, you need a domain pointing to your VM's IP
   - Update your domain's DNS A record to point to the VM's public IP

3. **SSH Access** to the VM
   - `ssh root@your-vm-ip` or `ssh ubuntu@your-vm-ip`

4. **Git Repository**
   - This repository should be accessible from the VM
   - Can be public or private (you'll need credentials for private repos)

## Quick Start (3 Commands)

```bash
# 1. Setup VM (installs Docker, Nginx, etc.)
sudo ./setup_vm.sh

# 2. Configure environment variables
./configure_env.sh

# 3. Deploy the application
sudo ./deploy.sh your-domain.com
```

That's it! Your application will be live at `https://your-domain.com`

If you don't have a domain, deploy with just:
```bash
sudo ./deploy.sh
```
Access via `http://your-vm-ip`

---

## Detailed Deployment Steps

### Step 1: Create a DigitalOcean Droplet

1. **Log in to DigitalOcean** and click "Create" → "Droplets"

2. **Choose Configuration:**
   - **Image**: Ubuntu 24.04 (LTS) x64
   - **Size**: Basic - Regular ($12/month or higher)
     - 2 GB RAM / 1 vCPU / 50 GB SSD
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH key (recommended) or password
   - **Hostname**: sales-order-manager

3. **Create Droplet** and note the public IP address

4. **Configure DNS** (if using a domain):
   - Go to your domain registrar
   - Create an A record: `@` or `subdomain` → `your-vm-ip`
   - Wait 5-10 minutes for DNS propagation

### Step 2: Connect to Your VM

```bash
ssh root@your-vm-ip
```

Or if you created a non-root user:
```bash
ssh ubuntu@your-vm-ip
```

### Step 3: Clone the Repository

```bash
# Install git if not already installed
apt-get update
apt-get install -y git

# Clone your repository
git clone https://github.com/yourusername/sales-order-manager.git
cd sales-order-manager
```

For private repositories:
```bash
git clone https://your-token@github.com/yourusername/sales-order-manager.git
```

### Step 4: Run VM Setup Script

This installs Docker, Docker Compose, Nginx, Certbot, and configures the firewall.

```bash
sudo ./setup_vm.sh
```

**What this script does:**
- Updates system packages
- Installs Docker and Docker Compose
- Installs and configures Nginx
- Installs Certbot for SSL certificates
- Configures UFW firewall (allows ports 22, 80, 443)
- Sets up automatic security updates

**Duration:** 5-10 minutes

### Step 5: Configure Environment Variables

This creates `.env` files with your configuration.

```bash
./configure_env.sh
```

**You'll be prompted for:**

1. **Database Configuration** (auto-generated):
   - Database name (default: sales_order_db)
   - Database user (default: sales_order_user)
   - Database password (auto-generated)

2. **Domain/IP Configuration**:
   - Your domain name (e.g., example.com) or leave empty for IP

3. **Email Configuration** (for password reset):
   - Email username (e.g., your-email@gmail.com)
   - Email password (for Gmail, use App Password)
   - SMTP server (default: smtp.gmail.com)
   - SMTP port (default: 587)

4. **Google reCAPTCHA v2** (get from https://www.google.com/recaptcha/admin):
   - Site Key
   - Secret Key

5. **Optional Services**:
   - Google Maps API Key
   - Twilio (for SMS notifications)
   - Sentry (for error tracking)

**Files created:**
- `backend/.env` - Backend configuration
- `frontend/.env` - Frontend configuration
- `.env` - Docker Compose configuration

### Step 6: Deploy the Application

```bash
sudo ./deploy.sh your-domain.com
```

Or without a domain (HTTP only):
```bash
sudo ./deploy.sh
```

**What this script does:**

1. **Stops any running containers**
2. **Builds Docker images** (backend, frontend)
3. **Starts PostgreSQL database**
4. **Initializes database** with tables and admin user
5. **Starts all services** (database, backend, frontend)
6. **Configures Nginx** reverse proxy
7. **Obtains SSL certificate** (if domain provided)
8. **Shows admin credentials**

**Duration:** 10-15 minutes (first time, includes building images)

### Step 7: Access Your Application

**With Domain (HTTPS):**
```
https://your-domain.com
```

**Without Domain (HTTP):**
```
http://your-vm-ip
```

**Default Admin Credentials:**
- Email: `wursts.baryon0d@icloud.com`
- Password: (shown in deployment output)

**IMPORTANT:** Change the admin password after first login!

---

## Post-Deployment

### Verify Services are Running

```bash
docker compose -f docker-compose.prod.yml ps
```

You should see:
- `sales-order-database-prod` (healthy)
- `sales-order-backend-prod` (healthy)
- `sales-order-frontend-prod` (healthy)

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f database
```

### Check Application Health

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:3000/health
```

### Setup Automated Backups

```bash
# Set up daily backups at 2 AM
./scripts/setup_cron_backup.sh
```

---

## Database Management

### Manual Backup

```bash
./scripts/backup_db.sh
```

Backups are stored in `./backups/` directory with timestamp.

### Restore from Backup

```bash
./scripts/restore_db.sh ./backups/backup_sales_order_db_20240101_120000.sql.gz
```

### Access Database Directly

```bash
docker compose -f docker-compose.prod.yml exec database psql -U sales_order_user -d sales_order_db
```

---

## Updating the Application

### Pull Latest Code

```bash
cd /path/to/sales-order-manager
git pull origin main
```

### Rebuild and Restart

```bash
# Rebuild images with latest code
docker compose -f docker-compose.prod.yml build

# Restart services
docker compose -f docker-compose.prod.yml up -d

# Or do both in one command
docker compose -f docker-compose.prod.yml up -d --build
```

### View Update Logs

```bash
docker compose -f docker-compose.prod.yml logs -f
```

---

## Maintenance Commands

### Restart All Services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Restart Specific Service

```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend
docker compose -f docker-compose.prod.yml restart database
```

### Stop All Services

```bash
docker compose -f docker-compose.prod.yml down
```

### Stop and Remove All Data

```bash
# WARNING: This deletes the database!
docker compose -f docker-compose.prod.yml down -v
```

### View Resource Usage

```bash
docker stats
```

### Clean Up Old Images

```bash
docker system prune -a
```

---

## SSL Certificate Renewal

SSL certificates from Let's Encrypt expire every 90 days. Certbot automatically renews them.

### Check Certificate Status

```bash
sudo certbot certificates
```

### Manual Renewal

```bash
sudo certbot renew
```

### Test Renewal Process

```bash
sudo certbot renew --dry-run
```

---

## Firewall Configuration

The setup script configures UFW firewall with these rules:

- **Port 22** (SSH) - Open
- **Port 80** (HTTP) - Open
- **Port 443** (HTTPS) - Open
- All other ports - Closed

### View Firewall Status

```bash
sudo ufw status
```

### Add Custom Rules

```bash
# Allow a specific port
sudo ufw allow 8080/tcp

# Allow from specific IP
sudo ufw allow from 192.168.1.100
```

---

## Troubleshooting

### Application Not Loading

1. **Check services are running:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

2. **Check logs for errors:**
   ```bash
   docker compose -f docker-compose.prod.yml logs
   ```

3. **Check Nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

4. **Test Nginx configuration:**
   ```bash
   sudo nginx -t
   ```

### Database Connection Issues

1. **Check database is healthy:**
   ```bash
   docker compose -f docker-compose.prod.yml exec database pg_isready -U sales_order_user
   ```

2. **Check DATABASE_URL in backend/.env:**
   ```bash
   cat backend/.env | grep DATABASE_URL
   ```

### SSL Certificate Issues

1. **Check certificate exists:**
   ```bash
   sudo ls -la /etc/letsencrypt/live/your-domain.com/
   ```

2. **Manually obtain certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Check DNS is pointing to your server:**
   ```bash
   dig your-domain.com
   ```

### Out of Disk Space

1. **Check disk usage:**
   ```bash
   df -h
   ```

2. **Clean up Docker:**
   ```bash
   docker system prune -a -f
   ```

3. **Remove old backups:**
   ```bash
   find ./backups -name "*.sql.gz" -mtime +30 -delete
   ```

### High Memory Usage

1. **Check container stats:**
   ```bash
   docker stats
   ```

2. **Reduce container resources** (edit docker-compose.prod.yml):
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G  # Reduce from 2G
   ```

3. **Restart containers:**
   ```bash
   docker compose -f docker-compose.prod.yml restart
   ```

---

## Security Best Practices

1. **Change default admin password** immediately after first login

2. **Keep system updated:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade
   ```

3. **Use strong passwords** for database and admin accounts

4. **Enable SSH key authentication** and disable password authentication

5. **Regular backups:** Set up automated backups with cron

6. **Monitor logs regularly:**
   ```bash
   docker compose -f docker-compose.prod.yml logs -f | grep ERROR
   ```

7. **Use environment variables** for secrets (never commit .env files)

8. **Enable Sentry** for error tracking in production

---

## Performance Optimization

### For Low-Memory Servers (1GB RAM)

1. **Reduce Gunicorn workers** in `backend/gunicorn.conf.py`:
   ```python
   workers = 1  # Down from 2
   ```

2. **Reduce database pool size** in `backend/app/database.py`:
   ```python
   pool_size=5,  # Down from 10
   max_overflow=10,  # Down from 20
   ```

3. **Restart services:**
   ```bash
   docker compose -f docker-compose.prod.yml restart
   ```

### Enable Swap (for 1-2GB RAM servers)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Monitoring

### View Application Metrics

```bash
# CPU, Memory, Network usage
docker stats

# Detailed container info
docker compose -f docker-compose.prod.yml ps
docker inspect sales-order-backend-prod
```

### Check Nginx Access Logs

```bash
sudo tail -f /var/log/nginx/access.log
```

### Check Nginx Error Logs

```bash
sudo tail -f /var/log/nginx/error.log
```

### Application Error Logs

The application stores errors in the database (`error_logs` table).
Access via admin panel: Admin → View Logs

---

## Cost Estimation (DigitalOcean)

**Recommended Setup:**
- Droplet: Basic Regular ($12/month) - 2GB RAM, 1 vCPU, 50GB SSD
- Bandwidth: 2TB included (usually sufficient)
- Backups: Optional ($2.40/month for automated snapshots)

**Total:** ~$12-15/month

**Scaling Options:**
- More traffic: Upgrade to $24/month (4GB RAM, 2 vCPUs)
- High availability: Add load balancer ($12/month)
- Managed database: PostgreSQL managed DB ($15/month+)

---

## Getting Help

### Check Logs First

```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Common Log Locations

- Application logs: Docker container logs
- Nginx access: `/var/log/nginx/access.log`
- Nginx error: `/var/log/nginx/error.log`
- System logs: `/var/log/syslog`

### Report Issues

Include in your report:
1. What you were trying to do
2. What happened instead
3. Relevant log output
4. System information (OS version, Docker version)

---

## Next Steps

After successful deployment:

1. **Change admin password**
2. **Set up automated backups** (`./scripts/setup_cron_backup.sh`)
3. **Configure email settings** for password reset
4. **Set up monitoring** (Sentry, custom monitoring)
5. **Test all functionality** (orders, notifications, exports)
6. **Create additional user accounts**
7. **Customize branding/settings** as needed

Congratulations! Your Sales Order Manager is now live and accessible to the world!

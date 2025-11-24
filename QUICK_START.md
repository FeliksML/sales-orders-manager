# Quick Start Guide - VM Deployment

Deploy your Sales Order Manager to a DigitalOcean VM in under 15 minutes!

## Prerequisites

- ✅ DigitalOcean account (or any cloud provider with Ubuntu VMs)
- ✅ Domain name pointing to your VM IP (optional, for HTTPS)
- ✅ SSH access to your VM

## Step-by-Step Deployment

### 1️⃣ Create Ubuntu VM

**DigitalOcean:**
1. Create Droplet → Ubuntu 24.04 LTS
2. Choose Basic plan: $12/month (2GB RAM, 1 vCPU)
3. Add SSH key or use password
4. Create Droplet

**Note the IP address!**

### 2️⃣ Point Your Domain (Optional but Recommended)

If you want HTTPS:
1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Add A record: `@` or `subdomain` → `your-vm-ip`
3. Wait 5-10 minutes for DNS propagation

### 3️⃣ Connect to VM

```bash
ssh root@your-vm-ip
```

### 4️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/sales-order-manager.git
cd sales-order-manager
```

### 5️⃣ Run Setup Script

This installs Docker, Nginx, SSL tools, and configures firewall:

```bash
sudo ./setup_vm.sh
```

**Takes:** ~5-10 minutes

### 6️⃣ Configure Environment

This creates `.env` files with your settings:

```bash
./configure_env.sh
```

**You'll need:**
- ✅ Domain name (or leave empty for IP-only access)
- ✅ Gmail account for password reset emails
  - Get App Password: https://support.google.com/accounts/answer/185833
- ✅ Google reCAPTCHA keys
  - Get them: https://www.google.com/recaptcha/admin
  - Choose reCAPTCHA v2 (Checkbox)

**Takes:** ~2-3 minutes

### 7️⃣ Deploy Application

Deploy with HTTPS (requires domain):
```bash
sudo ./deploy.sh your-domain.com
```

Or deploy with HTTP only (no domain):
```bash
sudo ./deploy.sh
```

**Takes:** ~10-15 minutes (first time)

### 8️⃣ Access Your Application

**With domain:**
```
https://your-domain.com
```

**Without domain:**
```
http://your-vm-ip
```

**Default Admin Login:**
- Email: `wursts.baryon0d@icloud.com`
- Password: (shown in deployment output)

**⚠️ IMPORTANT:** Change admin password immediately after first login!

---

## Post-Deployment Tasks

### ✅ Change Admin Password

1. Log in with default credentials
2. Go to Profile → Change Password
3. Use a strong password

### ✅ Set Up Automated Backups

```bash
./scripts/setup_cron_backup.sh
```

This backs up your database daily at 2 AM.

### ✅ Test Everything

- Create a test user account
- Create a test order
- Test password reset email
- Check notifications work
- Test order filtering and search

---

## Management Commands

### View Application Status

```bash
docker compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

### Restart Application

```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop Application

```bash
docker compose -f docker-compose.prod.yml down
```

### Backup Database

```bash
./scripts/backup_db.sh
```

### Restore Database

```bash
./scripts/restore_db.sh ./backups/backup_sales_order_db_YYYYMMDD_HHMMSS.sql.gz
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

### Application Not Loading

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs
```

### SSL Certificate Failed

```bash
# Try again manually
sudo certbot --nginx -d your-domain.com

# Check DNS is pointing to server
dig your-domain.com
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Restart containers
docker compose -f docker-compose.prod.yml restart
```

### Can't Connect to Database

```bash
# Check database is healthy
docker compose -f docker-compose.prod.yml exec database pg_isready -U sales_order_user
```

---

## Getting Help

📖 **Full Documentation:** See [VM_DEPLOYMENT.md](VM_DEPLOYMENT.md)

📋 **Check Logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f
```

🔧 **Common Issues:** See troubleshooting section in VM_DEPLOYMENT.md

---

## Cost Estimate

**DigitalOcean Droplet:**
- Basic (2GB RAM): $12/month
- Includes 2TB bandwidth
- Suitable for small to medium traffic

**Total Cost:** ~$12/month (plus domain if you don't have one)

---

## Next Steps

After successful deployment:

1. ✅ Change admin password
2. ✅ Set up automated backups
3. ✅ Configure email settings thoroughly
4. ✅ Test all features
5. ✅ Create user accounts for your team
6. ✅ Start using the application!

---

**Congratulations!** 🎉 Your Sales Order Manager is now live and ready to use!

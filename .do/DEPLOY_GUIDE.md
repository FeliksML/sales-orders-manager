# 🚀 DigitalOcean Deployment Guide

## Step-by-Step Instructions for Deploying Sales Order Manager

---

## ✅ Prerequisites

Before starting, make sure you have:
- [ ] DigitalOcean account (sign up at https://try.digitalocean.com/freetrialoffer/ for $200 credit)
- [ ] GitHub repository is up to date
- [ ] All files committed and pushed

---

## 📋 Step 1: Push Configuration to GitHub

Run these commands in your terminal:

```bash
cd /Users/redwood/Desktop/sales-order-manager

# Add the new .do folder
git add .do/

# Commit the changes
git commit -m "Add DigitalOcean deployment configuration"

# Push to GitHub
git push origin main
```

**✅ Checkpoint**: Your GitHub repository should now have a `.do/` folder with `app.yaml`

---

## 🗄️ Step 2: Create Database

1. **Log in to DigitalOcean**: https://cloud.digitalocean.com
2. **Go to Databases**: Click "Databases" in left sidebar
3. **Create Database**:
   - Click **"Create Database"**
   - **Database engine**: PostgreSQL
   - **Version**: 15
   - **Plan**:
     - Choose **"Basic"**
     - Select **"4 GB RAM / 2 vCPUs / 80 GB Disk"** ($60/month)
   - **Enable Standby Node**: ✅ Check this (high availability)
   - **Datacenter region**: Choose closest to your users:
     - San Francisco (SFO3) - US West
     - New York (NYC3) - US East
     - London (LON1) - Europe
     - Singapore (SGP1) - Asia
   - **Database cluster name**: `sales-order-db`
   - **Database name**: `sales_orders` (or leave default)
4. **Click "Create Database"**
5. **Wait 3-5 minutes** for database to be ready (you'll see "Available" status)

**✅ Checkpoint**: Database shows "Available" status

---

## 🚀 Step 3: Create App from App Spec

1. **Go to Apps**: Click "Apps" in left sidebar
2. **Create App**: Click **"Create App"** button
3. **Choose Source**:
   - Select **"GitHub"**
   - **Authorize DigitalOcean** to access your GitHub (if not already)
   - Find and select repository: **FeliksML/sales-orders-manager**
   - Branch: **main**
   - **Autodeploy**: ✅ Keep checked (deploys on every push)
4. **IMPORTANT - Import from App Spec**:
   - Look for a link that says **"Edit Your App Spec"** or **"Import from App Spec"**
   - If you don't see it, click **"Next"** until you reach the review page
   - Look for **"Edit App Spec"** button
   - **Delete all existing YAML** in the editor
   - **Copy the entire contents** of `.do/app.yaml` from your project
   - **Paste it** into the editor
   - Click **"Save"**
5. **Review Configuration**:
   - You should see:
     - ✅ Backend service (Dockerfile)
     - ✅ Frontend static site
     - ✅ Database attached
6. **Click "Next"** or **"Review"**

**✅ Checkpoint**: App spec loaded, shows backend + frontend + database

---

## 🔐 Step 4: Configure Environment Variables

**CRITICAL**: Before deploying, you MUST set these environment variables:

1. On the review/configuration page, find **"Environment Variables"** section for **backend**
2. Click **"Edit"** next to backend environment variables
3. **Find and UPDATE these variables** (they're marked as "CHANGE_THIS_IN_DIGITALOCEAN_UI"):

### Required Variables to Set:

#### SECRET_KEY (CRITICAL!)
```
SECRET_KEY = SyRtO8XWcmHycEvVbz343bQJd96yy10JSneaeZftVH-gIgzoTzhO4iDw7BpeKhN9OVOaa5pLWTeCxxeKf0FFZA
```
- Click **"Encrypt"** checkbox (makes it a secret)

#### RECAPTCHA_SECRET_KEY
```
RECAPTCHA_SECRET_KEY = 6LcqgxQsAAAAAPW1VDkdosH8WUc6krZWsZW8sVHs
```
- Click **"Encrypt"** checkbox

#### MAIL_USERNAME
```
MAIL_USERNAME = salesmanagerverif@gmail.com
```
- Click **"Encrypt"** checkbox

#### MAIL_PASSWORD (Gmail App Password)
```
MAIL_PASSWORD = oral omab uklw ufhn
```
- Click **"Encrypt"** checkbox

### Other Variables (Should be Auto-Set):
- `DATABASE_URL` - Automatically set by DigitalOcean ✅
- `FRONTEND_URL` - Automatically set to app URL ✅
- `ENVIRONMENT = production` ✅

4. **Click "Save"**

**✅ Checkpoint**: All 4 critical variables are set and encrypted

---

## 🎯 Step 5: Select Database

1. In the **"Database"** section:
   - **Select database**: Choose `sales-order-db` (the one you created)
   - **Add app as trusted source**: ✅ Should be checked
2. **Review all settings**:
   - Backend: 2 instances, professional-xs ($12 each = $24/month)
   - Frontend: Static site
   - Database: Connected
   - Region: Your selected region

**✅ Checkpoint**: Database selected and connected

---

## 🚀 Step 6: Deploy!

1. **Review total cost** (should be ~$90-100/month):
   - Backend: $24/month (2 instances)
   - Frontend: $0-5/month
   - Database: $60/month
2. **Click "Create Resources"** or **"Deploy"**
3. **Wait for deployment** (5-15 minutes):
   - You'll see build logs in real-time
   - Backend will build using Docker
   - Frontend will build using npm
4. **Watch for "Live" status**

**✅ Checkpoint**: App shows "Live" or "Running" status

---

## ✅ Step 7: Verify Deployment

Once deployed, you'll get URLs like:
- **Frontend**: `https://sales-order-manager-xxxxx.ondigitalocean.app`
- **Backend**: `https://sales-order-manager-xxxxx.ondigitalocean.app/api`

### Test Your Deployment:

1. **Test Backend Health**:
   ```
   https://your-backend-url.ondigitalocean.app/health
   ```
   Should return: `{"status": "healthy", "service": "sales-order-manager-api"}`

2. **Test Frontend**:
   ```
   https://your-frontend-url.ondigitalocean.app
   ```
   Should show your login page

3. **Test Signup**:
   - Go to signup page
   - Try creating a test account
   - Check if email verification works

**✅ Checkpoint**: All tests pass

---

## 🎉 Success!

Your app is now live! 🚀

### Next Steps:

1. **Custom Domain** (Optional):
   - Go to Apps → Your App → Settings
   - Add your custom domain (e.g., salesorder.com)
   - Update DNS records as instructed
   - SSL certificate will be auto-generated

2. **Monitoring**:
   - Go to Apps → Your App → Insights
   - Monitor CPU, memory, requests
   - Set up alerts

3. **Backup Testing**:
   - Go to Databases → Your Database → Backups
   - Verify daily backups are enabled

4. **Uptime Monitoring**:
   - Sign up for UptimeRobot (free): https://uptimerobot.com
   - Add your app URL
   - Get alerts if app goes down

---

## 🆘 Troubleshooting

### Build Failed
- Check build logs for errors
- Verify Dockerfile path is correct: `backend/Dockerfile`
- Verify all files are committed to GitHub

### Database Connection Error
- Verify database is "Available"
- Check "Trusted Sources" includes your app
- Verify DATABASE_URL is set

### App Not Starting
- Check environment variables are set
- Verify SECRET_KEY is set and encrypted
- Check run logs for errors

### 502/503 Errors
- Check health endpoint: `/health`
- Verify port 8000 is correct
- Check app logs for crashes

### Email Not Sending
- Verify MAIL_USERNAME and MAIL_PASSWORD are correct
- Check Gmail App Password is valid
- Enable "Less secure app access" in Gmail (if using regular password)

---

## 📞 Need Help?

If something goes wrong:
1. Check the logs in DigitalOcean dashboard
2. Take a screenshot of the error
3. Share it with me and I'll help troubleshoot

---

## 💰 Cost Summary

### Monthly Costs:
- Backend: $24/month (2 instances × $12)
- Frontend: $0-5/month (static site)
- Database: $60/month (4GB Basic with standby)
- **Total**: ~$90-100/month

### Cost Optimization:
- Start with 1 backend instance ($12) instead of 2 if budget is tight
- Can scale up to 4 instances as traffic grows
- Database size can be adjusted based on usage

---

## 🔐 Security Checklist

After deployment:
- [ ] All secrets are encrypted in DigitalOcean
- [ ] Database has standby node (high availability)
- [ ] Trusted sources configured for database
- [ ] HTTPS is enabled (automatic)
- [ ] Health checks are working
- [ ] Backups are enabled (automatic)
- [ ] Consider enabling:
  - [ ] Uptime monitoring
  - [ ] Error tracking (Sentry)
  - [ ] Log aggregation

---

**🎊 Congratulations! Your app is production-ready!**

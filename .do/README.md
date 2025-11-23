# DigitalOcean Deployment Configuration

This folder contains everything you need to deploy to DigitalOcean App Platform.

## 📁 Files in This Folder

### `app.yaml`
Complete DigitalOcean App Platform configuration file that defines:
- Backend service (Docker-based, 2 instances)
- Frontend static site (Nginx)
- Database connection
- Environment variables
- Health checks and auto-scaling

### `DEPLOY_GUIDE.md` ⭐ START HERE
**Complete step-by-step deployment guide** with:
- Prerequisites checklist
- Database setup instructions
- App creation steps
- Environment variable configuration
- Testing and verification
- Troubleshooting section

### `ENVIRONMENT_VARIABLES.md`
**Critical secrets and configuration** including:
- Generated SECRET_KEY for production
- All required environment variables
- Security best practices
- Rotation procedures

### `QUICK_START.sh`
**Automated script** that:
- Commits deployment files
- Pushes to GitHub
- Shows next steps

## 🚀 Quick Start (3 Steps)

### Step 1: Push to GitHub
```bash
# Option A: Run the automated script
./.do/QUICK_START.sh

# Option B: Manual commands
git add .do/
git commit -m "Add DigitalOcean deployment config"
git push origin main
```

### Step 2: Create Database
1. Go to DigitalOcean → Databases → Create Database
2. PostgreSQL 15, 4GB Basic plan with Standby Node ($60/month)
3. Wait for "Available" status (3-5 minutes)

### Step 3: Deploy App
1. Go to DigitalOcean → Apps → Create App
2. Connect GitHub repository
3. Import from App Spec → paste contents of `app.yaml`
4. Set environment variables from `ENVIRONMENT_VARIABLES.md`
5. Click Deploy!

## 📖 Full Documentation

For complete instructions, open: **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)**

## 🔐 Security Notes

- ✅ `.env` files are gitignored (not pushed to GitHub)
- ✅ `ENVIRONMENT_VARIABLES.md` should NOT be committed to public repos
- ✅ All secrets should be encrypted in DigitalOcean UI
- ✅ New SECRET_KEY generated for production
- ✅ Secrets rotation recommended every 90 days

## 💰 Cost Estimate

- Backend: $24/month (2 instances × $12)
- Frontend: $0-5/month
- Database: $60/month (4GB with standby)
- **Total: ~$90-100/month**

## 📞 Support

If you run into issues:
1. Check [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) troubleshooting section
2. Review deployment logs in DigitalOcean dashboard
3. Verify all environment variables are set correctly

---

**Ready to deploy? Start with [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)!**

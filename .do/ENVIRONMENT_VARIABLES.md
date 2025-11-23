# 🔐 Production Environment Variables

## Critical Variables - MUST BE SET

### 1. SECRET_KEY (CRITICAL!)
**Generated for Production:**
```
SyRtO8XWcmHycEvVbz343bQJd96yy10JSneaeZftVH-gIgzoTzhO4iDw7BpeKhN9OVOaa5pLWTeCxxeKf0FFZA
```

**Purpose**: JWT token signing
**Security**: Must be kept secret, encrypt in DigitalOcean
**Action**: Copy this exact value into DigitalOcean environment variables

---

### 2. RECAPTCHA_SECRET_KEY
**Current Value (from your .env):**
```
6LcqgxQsAAAAAPW1VDkdosH8WUc6krZWsZW8sVHs
```

**Purpose**: Prevents bot signups/logins
**Security**: Must be kept secret, encrypt in DigitalOcean
**Action**: Copy this value OR generate new keys at https://www.google.com/recaptcha/admin

⚠️ **IMPORTANT**: If you generate new keys, update both:
- Backend: RECAPTCHA_SECRET_KEY (this)
- Frontend: VITE_RECAPTCHA_SITE_KEY (in your frontend code)

---

### 3. MAIL_USERNAME
**Current Value:**
```
salesmanagerverif@gmail.com
```

**Purpose**: Email account for sending verification/reset emails
**Security**: Encrypt in DigitalOcean
**Action**: Use this email OR change to your own

---

### 4. MAIL_PASSWORD
**Current Value (Gmail App Password):**
```
oral omab uklw ufhn
```

**Purpose**: Gmail App Password for SMTP
**Security**: Must be kept secret, encrypt in DigitalOcean
**Action**:
- Use this password OR
- Generate new App Password: https://myaccount.google.com/apppasswords
- If generating new, must use 2FA enabled Gmail account

---

## Auto-Set Variables (No Action Needed)

### DATABASE_URL
**Set by**: DigitalOcean automatically when database is attached
**Format**: `postgresql://user:password@host:port/database?sslmode=require`
**Action**: None - DigitalOcean handles this

### FRONTEND_URL
**Set by**: DigitalOcean automatically to your app URL
**Format**: `https://sales-order-manager-xxxxx.ondigitalocean.app`
**Action**: None initially, update if you add custom domain

---

## Pre-Set Variables (Already Configured in app.yaml)

### ENVIRONMENT
```
production
```
**Purpose**: Enables production mode (HSTS, stricter security)

### MAIL_FROM
```
noreply@salesorder.com
```
**Purpose**: "From" address in emails
**Action**: Change to your domain if you have one

### MAIL_PORT
```
587
```
**Purpose**: SMTP port for Gmail

### MAIL_SERVER
```
smtp.gmail.com
```
**Purpose**: Gmail SMTP server

### MAIL_STARTTLS
```
True
```
**Purpose**: Enable TLS encryption

### MAIL_SSL_TLS
```
False
```
**Purpose**: SSL/TLS mode (STARTTLS is preferred)

---

## Optional Variables (For Future Use)

### SENTRY_DSN
**Purpose**: Error tracking with Sentry
**When to add**: After you create a Sentry project
**Format**: `https://xxxxx@sentry.io/xxxxx`

### LOG_LEVEL
**Purpose**: Control logging verbosity
**Default**: `info`
**Options**: `debug`, `info`, `warning`, `error`, `critical`

---

## 🔒 Security Best Practices

### ✅ DO:
- ✅ Always encrypt secrets (SECRET_KEY, passwords, API keys)
- ✅ Rotate SECRET_KEY if it's ever exposed
- ✅ Use Gmail App Passwords (not regular passwords)
- ✅ Keep this file secure (never commit to git)
- ✅ Rotate credentials every 90 days

### ❌ DON'T:
- ❌ Never commit secrets to GitHub
- ❌ Never share SECRET_KEY publicly
- ❌ Never reuse SECRET_KEY across environments
- ❌ Never use regular Gmail password (use App Password)

---

## 🔄 Rotating Secrets

If you need to rotate secrets (recommended every 90 days):

### Rotate SECRET_KEY:
```bash
# Generate new key
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Update in DigitalOcean:
# 1. Go to Apps → Your App → Settings → Environment Variables
# 2. Update SECRET_KEY
# 3. Redeploy app
```

⚠️ **WARNING**: Rotating SECRET_KEY will invalidate all existing user sessions (users must log in again)

### Rotate MAIL_PASSWORD:
1. Go to: https://myaccount.google.com/apppasswords
2. Delete old app password
3. Generate new app password
4. Update in DigitalOcean
5. Redeploy app

### Rotate RECAPTCHA Keys:
1. Go to: https://www.google.com/recaptcha/admin
2. Create new site keys
3. Update RECAPTCHA_SECRET_KEY in backend
4. Update VITE_RECAPTCHA_SITE_KEY in frontend code
5. Commit and push changes

---

## 📝 Quick Reference

Copy these when setting up in DigitalOcean:

```
SECRET_KEY=SyRtO8XWcmHycEvVbz343bQJd96yy10JSneaeZftVH-gIgzoTzhO4iDw7BpeKhN9OVOaa5pLWTeCxxeKf0FFZA
RECAPTCHA_SECRET_KEY=6LcqgxQsAAAAAPW1VDkdosH8WUc6krZWsZW8sVHs
MAIL_USERNAME=salesmanagerverif@gmail.com
MAIL_PASSWORD=oral omab uklw ufhn
```

**Remember**: Check "Encrypt" for all of these in DigitalOcean UI!

---

## ✅ Verification Checklist

Before deploying:
- [ ] SECRET_KEY is set and encrypted
- [ ] RECAPTCHA_SECRET_KEY is set and encrypted
- [ ] MAIL_USERNAME is set and encrypted
- [ ] MAIL_PASSWORD is set and encrypted
- [ ] All other variables are configured in app.yaml
- [ ] Database is attached
- [ ] No secrets are committed to git

---

**🔐 Keep this file secure! Never commit to git!**

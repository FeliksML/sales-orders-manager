# Deployment Guide

## Enterprise Security & Infrastructure Setup

This guide covers deploying the Sales Order Manager with enterprise-grade security features.

## 🚀 Quick Deploy with Docker

### Development
```bash
# Start all services (frontend, backend, database)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production
```bash
# Configure environment variables first
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Security Hardening Checklist

### ✅ Completed Improvements

- [x] **Secrets Management**: No hardcoded secrets, startup validation
- [x] **Rate Limiting**: Protection against brute force attacks
- [x] **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- [x] **Database Pooling**: Connection limits to prevent resource exhaustion
- [x] **Health Checks**: `/health` and `/readiness` endpoints
- [x] **Docker Security**: Non-root user, multi-stage builds
- [x] **CI/CD Pipeline**: Automated testing and security scanning
- [x] **Test Infrastructure**: Pytest suite with fixtures

### ⚠️ Recommended (Not Yet Implemented)

- [ ] JWT token lifetime reduction (currently 7 days → should be 1 hour)
- [ ] Refresh token implementation
- [ ] Move JWT from localStorage to httpOnly cookies
- [ ] Frontend XSS sanitization (add DOMPurify)
- [ ] Structured JSON logging
- [ ] Sentry error monitoring integration
- [ ] API versioning (/api/v1/ prefix)

---

## 📋 Pre-Production Checklist

### 1. Generate Production Secrets

```bash
# Generate SECRET_KEY (64 characters recommended)
python -c "import secrets; print(secrets.token_urlsafe(48))"

# Rotate ALL keys:
# - DATABASE_URL credentials
# - SECRET_KEY
# - RECAPTCHA_SECRET_KEY
# - MAIL_PASSWORD (use app password, not regular password)
```

### 2. Configure Secrets Manager

**AWS Secrets Manager** (Recommended for AWS):
```bash
# Store secret
aws secretsmanager create-secret \
  --name sales-order-manager/production/secret-key \
  --secret-string "<your-generated-secret-key>"

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id sales-order-manager/production/secret-key \
  --query SecretString \
  --output text
```

**Azure Key Vault**:
```bash
# Create secret
az keyvault secret set \
  --vault-name <your-vault> \
  --name SECRET-KEY \
  --value "<your-generated-secret-key>"
```

**Docker Secrets** (Docker Swarm):
```bash
echo "<your-secret>" | docker secret create secret_key -
```

### 3. Database Setup

#### Managed Database (Recommended)

**AWS RDS PostgreSQL**:
- Multi-AZ deployment for high availability
- Automated backups (30-day retention)
- Enable encryption at rest
- Use IAM authentication

**Azure Database for PostgreSQL**:
- Geo-redundant backup
- SSL enforcement
- Private endpoint

**Connection String Format**:
```
postgresql://username:password@host:port/database?sslmode=require
```

### 4. SSL/TLS Configuration

#### Option A: Let's Encrypt (Free)
```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com
```

#### Option B: Load Balancer Termination (Recommended)
- AWS ALB/NLB with ACM certificate
- Azure Application Gateway with Key Vault certificate
- GCP Load Balancer with managed certificate

### 5. Monitoring Setup

#### Application Monitoring (Sentry)
```bash
# Add to backend/.env
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Initialize in app/main.py
import sentry_sdk
sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
```

#### Infrastructure Monitoring
- **AWS**: CloudWatch
- **Azure**: Azure Monitor
- **GCP**: Cloud Monitoring
- **Self-hosted**: Prometheus + Grafana

#### Uptime Monitoring
- UptimeRobot (free tier available)
- Pingdom
- StatusCake

### 6. Backup Strategy

#### Database Backups
```bash
# Automated daily backup (cron job example)
0 2 * * * pg_dump -h localhost -U postgres sales_db | gzip > /backups/sales_db_$(date +\%Y\%m\%d).sql.gz

# Retention: Delete backups older than 30 days
find /backups -name "sales_db_*.sql.gz" -mtime +30 -delete
```

#### Test Restoration
```bash
# Restore from backup
gunzip < backup.sql.gz | psql -h localhost -U postgres sales_db
```

### 7. Firewall Configuration

```bash
# Only allow specific ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

---

## 🏗️ Deployment Options

### Option 1: AWS ECS Fargate

#### 1. Build and push Docker images
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag images
docker build -t sales-order-backend:latest ./backend
docker tag sales-order-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/sales-order-backend:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/sales-order-backend:latest
```

#### 2. Create ECS Task Definition
```json
{
  "family": "sales-order-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/sales-order-backend:latest",
      "portMappings": [{"containerPort": 8000}],
      "secrets": [
        {"name": "SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3
      }
    }
  ]
}
```

#### 3. Create Service with Load Balancer
```bash
aws ecs create-service \
  --cluster sales-order-cluster \
  --service-name sales-order-backend \
  --task-definition sales-order-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=8000"
```

### Option 2: Azure Container Apps

```bash
# Create container app
az containerapp create \
  --name sales-order-backend \
  --resource-group sales-order-rg \
  --environment sales-order-env \
  --image <your-registry>.azurecr.io/sales-order-backend:latest \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --secrets secret-key=<key-vault-reference> \
  --env-vars SECRET_KEY=secretref:secret-key
```

### Option 3: Google Cloud Run

```bash
# Deploy backend
gcloud run deploy sales-order-backend \
  --image gcr.io/<project-id>/sales-order-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets SECRET_KEY=sales-order-secret-key:latest \
  --min-instances 1 \
  --max-instances 10
```

### Option 4: DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build settings:
   - **Backend**: Docker, port 8000
   - **Frontend**: Docker, port 80
3. Add environment variables
4. Add managed PostgreSQL database
5. Deploy

### Option 5: Self-Hosted VPS

#### Prerequisites
- Ubuntu 22.04 LTS
- Docker & Docker Compose
- Nginx (reverse proxy)
- SSL certificate

#### Setup Script
```bash
#!/bin/bash

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone <your-repo-url> /app/sales-order-manager
cd /app/sales-order-manager

# Configure environment
cp backend/.env.example backend/.env
nano backend/.env  # Edit with production values

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Setup Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/sales-order-manager
# Configure SSL with certbot
sudo certbot --nginx -d yourdomain.com
```

---

## 🔄 CI/CD Setup

### GitHub Actions (Already Configured)

The `.github/workflows/ci-cd.yml` workflow runs on every push:

1. **Backend Tests**: Pytest with coverage
2. **Frontend Tests**: Jest (when implemented)
3. **Security Scanning**: Trivy, TruffleHog
4. **Docker Build**: Multi-stage builds
5. **Deploy**: Customize for your platform

### Deployment Secrets (GitHub)

Add these secrets in GitHub repository settings:

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (if using AWS)
- `AZURE_CREDENTIALS` (if using Azure)
- `GCP_SERVICE_ACCOUNT_KEY` (if using GCP)
- `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` (if using Docker Hub)

---

## 📊 Production Monitoring

### Health Check Endpoints

- **Liveness**: `GET /health` (returns 200 if app is running)
- **Readiness**: `GET /readiness` (returns 200 if DB connected)

### Metrics to Monitor

1. **Application**:
   - Response time (< 200ms average)
   - Error rate (< 1%)
   - Request rate
   - Active connections

2. **Database**:
   - Connection pool utilization
   - Query performance
   - Disk usage
   - Backup status

3. **Infrastructure**:
   - CPU usage (< 70% average)
   - Memory usage (< 80%)
   - Disk I/O
   - Network throughput

### Alerting Rules

```yaml
# Example alert rules
alerts:
  - name: HighErrorRate
    condition: error_rate > 5%
    duration: 5m
    action: notify_on_call

  - name: DatabaseDown
    condition: /readiness returns 503
    duration: 1m
    action: page_immediately

  - name: HighMemoryUsage
    condition: memory_usage > 90%
    duration: 10m
    action: scale_up
```

---

## 🔒 Post-Deployment Security

### 1. Security Audit

```bash
# Run security scan
docker run --rm -v $(pwd):/app aquasec/trivy fs --security-checks vuln,config /app

# Check for exposed secrets
docker run --rm -v $(pwd):/app trufflesecurity/trufflehog filesystem /app
```

### 2. Penetration Testing

- Run OWASP ZAP automated scan
- Schedule professional penetration test
- Review and fix findings

### 3. Compliance

- Review GDPR requirements (if applicable)
- Document data processing activities
- Implement right to erasure
- Setup audit logging

---

## 🆘 Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs and alerts
2. **Contain**: Isolate affected systems
3. **Investigate**: Determine scope and impact
4. **Eradicate**: Remove threat and patch vulnerabilities
5. **Recover**: Restore from clean backups
6. **Post-mortem**: Document and improve

### Emergency Contacts

- **Security Team**: [security@example.com]
- **On-Call Engineer**: [oncall@example.com]
- **Incident Manager**: [incidents@example.com]

---

## 📚 Additional Resources

- [SECURITY.md](SECURITY.md) - Security documentation
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

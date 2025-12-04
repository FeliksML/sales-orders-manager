# Sales Order Manager

Full-stack app for Spectrum sales reps to track orders, commissions, and goals.

## Tech Stack
- Backend: Python 3.11+, FastAPI 0.115, SQLAlchemy 2.0, PostgreSQL 15
- Frontend: React 19, Vite 7, TailwindCSS 4, React Router v7
- Shared: JavaScript ES modules (constants, utils, validation)
- Deploy: Docker Compose, Nginx, Let's Encrypt SSL

## Architecture
Monorepo with 3 packages:
- `backend/app/` - FastAPI routers (auth, orders, admin, commission, goals)
- `frontend/src/` - React app (pages, components, services, contexts, hooks)
- `shared/src/` - Shared constants, types, utils, validation

## Critical Files
- Entry: backend/app/main.py, frontend/src/main.jsx
- Models: backend/app/models.py (SQLAlchemy ORM)
- Schemas: backend/app/schemas.py (Pydantic validation)
- API client: frontend/src/services/api.js
- Shared constants: shared/src/constants/index.js

## Domain Terms
- "Order" = Customer installation record (internet/TV/voice/mobile)
- "Install Status" = pending | today | installed | cancelled
- "Commission" = Sales rep earnings calculated by fiscal month
- "Goal" = Monthly/quarterly sales targets
- "Follow-up" = Scheduled callback for an order
- "Audit Log" = Change history for compliance tracking

## Dev Commands
```bash
# Backend
cd backend && uvicorn app.main:app --reload --port 8000
pytest backend/tests/ --cov=app

# Frontend
cd frontend && npm run dev    # http://localhost:5173
```

## Deployment
**Important**: This app runs on a VM server, not locally. For deployment:
1. Commit changes with a descriptive message
2. Push to origin/main
3. Rebuild the Docker container (see Docker Operations below)

---

## Docker Operations (CRITICAL - READ CAREFULLY)

### Container Architecture
- **Two compose files**:
  - `docker-compose.yml` = Development (DO NOT USE ON SERVER)
  - `docker-compose.prod.yml` = Production (ALWAYS USE THIS)
- **Container names in production**: `sales-order-backend-prod`, `sales-order-frontend-prod`, `sales-order-database-prod`
- **Backend code is BAKED into the image** - NOT volume mounted. Changes require REBUILD.
- **Frontend src/ IS volume mounted** - hot reloads automatically

### Common Mistakes (DO NOT DO THESE)
```bash
# ❌ WRONG - just restarts old container with old code
docker compose restart backend

# ❌ WRONG - uses development config, will crash on production server
docker compose up -d --build backend

# ❌ WRONG - wrong container name
docker exec sales-order-backend ...
```

### Correct Commands for Production
```bash
# ✅ Rebuild and restart backend (after code changes)
docker compose -f docker-compose.prod.yml up -d --build backend

# ✅ Rebuild and restart frontend
docker compose -f docker-compose.prod.yml up -d --build frontend

# ✅ Rebuild everything
docker compose -f docker-compose.prod.yml up -d --build

# ✅ View backend logs
docker logs sales-order-backend-prod --tail 100

# ✅ View frontend logs
docker logs sales-order-frontend-prod --tail 100

# ✅ Check container status
docker compose -f docker-compose.prod.yml ps

# ✅ Execute command in backend container
docker exec sales-order-backend-prod <command>

# ✅ Verify code is deployed (check a specific line)
docker exec sales-order-backend-prod cat /app/app/orders.py | grep -A 5 "search term"
```

### After Making Backend Code Changes
1. Edit the Python file
2. Commit: `git add . && git commit -m "message"`
3. Push: `GIT_SSH_COMMAND="ssh -i ~/.ssh/github_actions -o IdentitiesOnly=yes" git push`
4. **REBUILD**: `docker compose -f docker-compose.prod.yml up -d --build backend`
5. **VERIFY**: Check logs and confirm code is in container

### Troubleshooting
- **Backend shows "unhealthy"**: Check logs with `docker logs sales-order-backend-prod --tail 50`
- **SECRET_KEY error**: You used dev config instead of prod. Rebuild with `-f docker-compose.prod.yml`
- **Code changes not working**: You forgot to rebuild. `restart` ≠ `rebuild`
- **Wrong container name**: Production containers have `-prod` suffix

## Code Style

### Backend (Python)
- Async/await for route handlers
- Pydantic schemas for all validation (never raw dicts)
- `Depends()` for auth/DB injection
- HTTPException for errors with proper status codes
- Black formatting (line-length 120), Flake8 linting

### Frontend (React)
- Functional components + hooks only
- Context API for global state
- TailwindCSS utilities (no CSS modules)
- Lazy load routes with React.lazy()

---

## RULES FOR CLAUDE

### Before Coding (MUST follow)
- **BP-1 (MUST)**: Ask clarifying questions before implementing complex features
- **BP-2 (MUST)**: Read all relevant files before modifying ANY code
- **BP-3 (SHOULD)**: If ≥2 valid approaches exist, list pros/cons and ask

### Investigation Requirements
<investigate_before_answering>
If the user references a specific file, you MUST read it before answering.
Search for existing patterns in the codebase before introducing new ones.
Never claim anything about code without investigating first.
If uncertain, say "I'm not sure—let me check" and investigate.
</investigate_before_answering>

### Systems Thinking
Before implementing, analyze:
- How changes affect existing code and tests
- Downstream effects on other components
- Edge cases (null inputs, empty arrays, network failures)
- Security implications (injection, XSS, auth bypass)

### Quality Standards
- MUST maintain existing API contracts (ask before changing)
- MUST keep database migrations backward-compatible (add, don't drop)
- NEVER commit .env files or secrets
- NEVER over-engineer—minimal changes only

### Extended Thinking Triggers
Use these phrases for complex tasks:
- "think" → moderate reasoning
- "think hard" → deeper analysis
- "think harder" → complex architecture decisions
- "ultrathink" → maximum reasoning for critical problems

---

## Order Status System (CRITICAL)

**Status is CALCULATED, not stored.** There is no `status` column in the database.

### How Status is Determined
```python
# backend/app/orders.py lines 145-158
if install_date < today:        → "installed"
elif install_date == today:     → "today"
else:                           → "pending"
```

### The `completed_at` Field
| Value | Meaning |
|-------|---------|
| `NULL` | Order not yet marked as installed |
| `timestamp` | Order was marked installed (manually or auto-completed) |

**Important**: `completed_at` is used for:
1. Tracking when installation actually happened
2. Excluding from "pending installs" analytics count
3. Auto-completion logic (scheduler sets this after install window ends)

### Mark as Installed Flow
- **Individual**: Click "Mark Done" → sets `install_date=today`, `install_time=now`, `completed_at=now`
- **Bulk**: Select orders → Mark Installed → same behavior for all selected

---

## Scheduler Jobs

**File**: `backend/app/scheduler.py`

| Job ID | Trigger | Purpose |
|--------|---------|---------|
| `installation_reminders` | Every hour (:00) | Send 24-hour reminders before install |
| `today_installations` | Every 2 hours | Notify about today's scheduled installs |
| `followup_reminders` | Every 30 min (:00, :30) | Alert on due follow-ups |
| `auto_complete_installations` | Every 30 min (:15, :45) | Auto-mark orders as installed after window ends |

### Auto-Complete Logic
1. Parses END time from `install_time` (e.g., "10:00 AM - 11:00 AM" → 11:00 AM)
2. Converts to user's timezone (from `user.timezone` field)
3. If end time has passed → sets `completed_at = now`

### Scheduler Lock
- Only ONE gunicorn worker runs the scheduler
- Lock file: `/tmp/sales_order_scheduler.lock`
- Prevents duplicate notifications in multi-worker deployments

---

## Key Patterns for Agents

### Timezone Handling
```python
# Always convert user's local time to UTC for comparisons
from zoneinfo import ZoneInfo

user_tz = ZoneInfo(user.timezone)  # e.g., 'America/New_York'
install_local = install_naive.replace(tzinfo=user_tz)
install_utc = install_local.astimezone(ZoneInfo('UTC'))
```
- Default timezone: `America/Los_Angeles`
- Store/compare in UTC, display in user's timezone

### Audit Logging
```python
# backend/app/audit_service.py
audit_service.log_order_update(db, order, old_values, new_values, user, ip, reason)
```
- Each field change = separate audit log entry
- Full snapshots stored for create/delete/revert
- Supports undo via `revert_order_to_timestamp()`

### Idempotency Keys
```python
# Bulk operations support idempotency
POST /api/orders/bulk/mark-installed
{
  "order_ids": [1, 2, 3],
  "idempotency_key": "uuid-123"  # Same key = same response
}
```
- Keys expire after 24 hours
- User-scoped (your key won't match another user's)

### Bulk Operations Reference
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orders/bulk/mark-installed` | POST | Mark multiple orders installed |
| `/api/orders/bulk/reschedule` | POST | Change install date for multiple |
| `/api/orders/bulk/delete` | DELETE | Delete multiple orders |

---

## Common Mistakes (AVOID THESE)

### Docker Deployment
```bash
# ❌ WRONG - doesn't rebuild, just restarts old code
docker compose restart backend

# ✅ CORRECT - rebuilds image with new code
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Status Field Misconception
```python
# ❌ WRONG - there is no status column
order.status = "installed"

# ✅ CORRECT - status is calculated from dates
if order.completed_at:
    status = "installed"
elif order.install_date == today:
    status = "today"
# etc.
```

### Timezone Comparison
```python
# ❌ WRONG - comparing naive datetimes across timezones
if install_datetime < datetime.now():

# ✅ CORRECT - convert both to UTC first
install_utc = install_local.astimezone(ZoneInfo('UTC'))
now_utc = datetime.now(ZoneInfo('UTC'))
if install_utc < now_utc:
```

### Analytics Queries
```python
# ❌ WRONG - includes completed orders in pending count
pending = Order.install_date >= today

# ✅ CORRECT - exclude completed orders
pending = and_(Order.install_date >= today, Order.completed_at == None)
```

---

## Quick Reference

### Git Push Command
```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/github_actions -o IdentitiesOnly=yes" git push
```

### Verify Deployment
```bash
# Check container is healthy
docker compose -f docker-compose.prod.yml ps

# View recent logs
docker logs sales-order-backend-prod --tail 50

# Verify code is deployed
docker exec sales-order-backend-prod grep "search_term" /app/app/orders.py
```

### Key Files by Feature
| Feature | Backend | Frontend |
|---------|---------|----------|
| Order CRUD | `orders.py` | `OrderDetailsModal.jsx` |
| Bulk Operations | `orders.py:1513-1789` | `BulkActionsToolbar.jsx` |
| Scheduler | `scheduler.py` | N/A |
| Status Display | `orders.py:145-158` | `dateUtils.js:getInstallStatus()` |
| Audit Trail | `audit_service.py` | N/A |

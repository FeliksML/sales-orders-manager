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

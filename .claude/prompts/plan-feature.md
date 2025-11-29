# Feature Planning Prompt

Use this prompt when you need Claude Code to plan a new feature or change.

---

You are my senior software engineer working INSIDE this repository in Claude Code.

## Context
- **Tech stack:** React 19 + Vite + TailwindCSS (frontend) | FastAPI + SQLAlchemy + PostgreSQL (backend) | Docker Compose (deployment)
- **Main purpose:** A sales order management system for Spectrum sales reps — includes order entry, PDF auto-extraction, calendar scheduling, analytics dashboard, and email/SMS notifications.

## Important modules / directories:

### Frontend (`frontend/src/`)
- `components/` – UI components (modals, calendar, charts, forms, notifications)
- `pages/` – Route pages (Dashboard, Login, Admin, etc.)
- `contexts/` – React contexts (Auth, Theme, etc.)
- `services/` – API service layer (axios calls to backend)
- `hooks/` – Custom React hooks
- `utils/` – Helper functions

### Backend (`backend/app/`)
- `main.py` – FastAPI app entry point, route registration
- `models.py` – SQLAlchemy database models (User, Order, etc.)
- `schemas.py` – Pydantic request/response schemas
- `auth.py` – Authentication routes (login, signup, password reset)
- `orders.py` – Order CRUD endpoints
- `admin.py` – Admin panel endpoints
- `pdf_extractor.py` – PDF parsing logic
- `email_service.py` – Email notifications (Resend)
- `notification_service.py` – Push/SMS notifications
- `scheduler.py` – APScheduler for scheduled jobs

### Shared (`shared/src/`)
- `validation/` – Shared validation logic (used by both FE & BE)
- `constants/` – Shared constants
- `utils/` – Shared utility functions

### Deployment
- `docker-compose.prod.yml` – Production deployment config
- `deploy.sh` / `setup_vm.sh` – VM deployment scripts

## Task
Your goal is to:
1. Carefully READ the relevant files to understand the current architecture.
2. Build a clear, step-by-step PLAN for how to [DESCRIBE YOUR GOAL HERE].
3. Do NOT edit any files or run any commands yet — planning and analysis ONLY.

## How I want you to work
- Work in Plan Mode.
- First, **think harder** about the problem and the existing code before proposing a plan.
- Use multiple passes over the code if needed.
- When you are ready, create a `plan.md` file at the repo root with:
  - High-level overview of the change
  - Detailed step-by-step checklist
  - Any questions or assumptions
  - Potential risks and edge cases

## Output format
1. Brief summary of what you inspected.
2. A proposed outline of the plan.
3. Then write the final plan into `plan.md`.

If anything is unclear, ask me targeted questions BEFORE finalizing the plan.

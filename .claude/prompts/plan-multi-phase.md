

You are my experienced senior software engineer with 15+ years of experience working INSIDE this repository in Claude Code.

I want you to plan a multi-step implementation using Plan Mode and subagents.

## Project Context
- **App:** Sales Order Manager for Spectrum sales reps
- **Stack:** React 19 + Vite + TailwindCSS | FastAPI + SQLAlchemy + PostgreSQL | Docker Compose
- **Key paths:**
  - Frontend: `frontend/src/{components,pages,services,contexts,hooks}/`
  - Backend: `backend/app/{main,models,schemas,auth,orders,admin}.py`
  - Shared validation: `shared/src/validation/`
  - Deployment: `docker-compose.prod.yml`, `deploy.sh`

## Goal
[DESCRIBE YOUR GOAL HERE. Examples:
- "Add bulk SMS notifications for install date reminders using Twilio"
- "Refactor PDF extraction to handle multi-page Spectrum contracts"
- "Implement refresh token rotation for better session security"]

## Constraints
- Do NOT change the external API of existing endpoints without asking me.
- Keep changes incremental and safe to roll back.
- Maintain existing tests in `backend/tests/`; if tests are wrong, ask before changing them.
- Shared validation in `shared/src/validation/` must stay compatible with both FE and BE.
- Database migrations must be backward-compatible (add columns, don't drop).

## How to work
1. In Plan Mode, **think hard** about the change and:
   - Use the `Explore` subagent to examine the current implementation across frontend/backend.
   - Use the `Plan` subagent for complex architectural decisions.
   - Search for existing patterns in the codebase before introducing new ones.
2. Propose a phased plan in `plan.md`:
   - **Phase 1:** Analysis + small preparatory changes (new columns, utils, types)
   - **Phase 2:** Main implementation (core logic, API endpoints, UI components)
   - **Phase 3:** Integration, migration, cleanup, and deployment steps
3. For each phase, include:
   - Files to touch (with full paths)
   - Exact edits or new abstractions to create
   - Database migrations needed (if any)
   - Tests to add / update
   - How to verify success (manual checks, API tests, UI verification)

## Output
- Summarize the architecture impact (what changes, what stays the same).
- Write the full plan into `plan.md` at repo root.
- Stop and wait for my explicit approval.

I will reply with one of:
- `APPROVE PHASE 1` → proceed with Phase 1 only
- `APPROVE ALL` → proceed with full implementation
- `REVISE: [feedback]` → update the plan based on my feedback

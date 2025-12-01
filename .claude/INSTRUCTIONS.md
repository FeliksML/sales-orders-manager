# Project-Specific Instructions

## Testing & Deployment

**Important**: This app runs on a VM server, not locally. Instead of running local builds/tests to verify changes:

1. Commit the changes with a descriptive message
2. Push to origin/main
3. The app will be deployed on the VM server

Do NOT run local npm commands like `npm run build` or `npm test` - just commit and push.

## Key Information

- **App**: Sales Order Manager for Spectrum sales reps
- **Stack**: React 19 + Vite + TailwindCSS | FastAPI + SQLAlchemy + PostgreSQL | Docker Compose
- **Deployment**: Via VM server (auto-deploys on push to main)

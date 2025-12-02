Investigate and fix: $ARGUMENTS

## Phase 1: Investigation
1. Reproduce or understand the issue
2. Search codebase for related code
3. Identify root cause (not just symptoms)
4. Check if similar issues exist elsewhere

## Phase 2: Analysis
Use "think hard" to consider:
- Why did this happen?
- What's the minimal fix?
- Could this break anything else?
- Are there related issues to fix?

## Phase 3: Fix
1. Write test that reproduces the bug (if applicable)
2. Implement minimal fix
3. Verify test passes
4. Check for regressions

## Phase 4: Verify
```bash
# Backend
pytest backend/tests/ -v

# Frontend
npm run lint
npm run build
```

## Output
- **Root Cause**: Why it happened
- **Fix**: What was changed
- **Files Modified**: List with brief descriptions
- **Testing**: How to verify the fix

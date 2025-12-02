# Claude Code Workflows

## Daily Development Flow
1. `/explore [area]` - Understand current state
2. `/plan [feature]` - Design approach
3. Implement with `/add-endpoint` or `/add-component`
4. `/review` - Self-review before commit
5. `/ux-test` - Verify user experience

## Bug Fix Flow
1. `/debug [issue]` - Investigate
2. `/fix-issue [description]` - Fix with tests

## TDD Flow
1. `/tdd [feature]` - Full test-driven cycle

## Extended Thinking
Use these phrases for complex reasoning:
- "think" - Basic reasoning
- "think hard" - Deeper analysis
- "think harder" - Architecture decisions
- "ultrathink" - Critical problems

## Context Management
- Use `/clear` between major tasks
- Press Escape to redirect if off-track
- Give Claude screenshots for UI work

## Deployment
This app auto-deploys on push to main:
1. Commit with descriptive message
2. Push to origin/main
3. VM server handles deployment

No local build/test needed - just commit and push.

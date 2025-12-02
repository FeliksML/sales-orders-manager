Review code changes using Chain-of-Verification.

## Step 1: Generate Initial Review
Scan all changed files and note potential issues.

## Step 2: Verification Questions
For each concern, ask:
- Is this actually a problem in this context?
- Does existing code handle this case?
- What's the worst-case impact?

## Step 3: Verify Each Concern
Re-examine the code to answer each question.

## Step 4: Final Review

### Security Checklist
- [ ] No SQL injection (parameterized queries)
- [ ] No XSS (sanitized output)
- [ ] Auth checks on all protected routes
- [ ] No secrets in code
- [ ] Input validation present

### Quality Checklist
- [ ] Follows existing patterns
- [ ] Error handling complete
- [ ] Edge cases covered
- [ ] No unnecessary complexity
- [ ] Tests added/updated

### Output
For each issue found:
- **File:Line** - Description
- **Severity**: Critical/High/Medium/Low
- **Suggested Fix**: Specific recommendation

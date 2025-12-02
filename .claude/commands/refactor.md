Refactor: $ARGUMENTS

## Rules
- NO functional changes (behavior must be identical)
- Run tests before AND after
- Small, incremental commits
- If tests don't exist, write them first

## Process
1. **Baseline**: Run tests, note current behavior
2. **Plan**: Identify specific improvements
3. **Execute**: One change at a time
4. **Verify**: Tests pass after each change
5. **Document**: Update comments if behavior is clearer

## Valid Refactoring Goals
- Extract repeated code into functions
- Improve naming for clarity
- Simplify complex conditionals
- Remove dead code
- Fix code style inconsistencies

## Invalid (These are features, not refactoring)
- Adding new functionality
- Changing API contracts
- "Improving" behavior

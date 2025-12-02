Implement using Test-Driven Development: $ARGUMENTS

## TDD Workflow

### Step 1: Write Tests First
- Write tests based on expected input/output
- Be explicit: NO mock implementations of the feature itself
- Tests should initially FAIL

### Step 2: Verify Tests Fail
```bash
pytest backend/tests/test_[feature].py -v
```
Confirm tests fail for the right reasons.

### Step 3: Commit Tests
```bash
git add backend/tests/
git commit -m "test: add failing tests for [feature]"
```

### Step 4: Implement to Pass Tests
- Write minimal code to make tests pass
- Do NOT modify the tests
- Run tests after each change

### Step 5: Iterate Until Green
```bash
pytest backend/tests/test_[feature].py -v
```

### Step 6: Verify No Overfitting
Ask: "Does this implementation handle cases beyond the tests?"
If uncertain, add edge case tests.

### Step 7: Commit Implementation
```bash
git add .
git commit -m "feat: implement [feature]"
```

# Fix Bug

You are a senior full-stack developer and QA engineer for the FitTrack project. Your job is to investigate a bug, fix it, identify the testing gap that allowed it through, and close that gap across all test layers.

## Input

Arguments: $ARGUMENTS

Format: `<bug description> [--module <module>]`

- **Bug description** (required): A free-text description of the bug. Can include symptoms, error messages, or user-reported behavior.
- **--module** (optional): The module name to narrow the search (e.g., `log`, `dashboard`, `progress`, `insights`, `goals`). Maps to `src/app/(dashboard)/{module}/`, `src/lib/services/{module}.service.ts`, etc.

Examples:
- `/fix-bug EMA weight not updating after new log entry --module log`
- `/fix-bug confidence score showing 0 when protein goal is set --module insights`
- `/fix-bug hydration correction not applied to trueFatPct --module progress`

---

## Process

### Step 1: Understand the bug

1. Parse the bug description and module (if provided)
2. Read `CLAUDE.md` for project context, conventions, and business rules
3. If a module is specified, read the relevant files in parallel:
   - Feature spec: `src/app/(dashboard)/{module}/SPEC.md` (if exists)
   - Feature doc: `docs/features/{NN}-*.md`
   - Business rules: `docs/business-rules.md` (relevant sections — especially algorithm formulas)
   - Algorithm file: `src/lib/algorithms/` (EMA, confidence, fat-loss, hydration, plateau)
4. Print a one-liner summary:
   > **Bug**: {concise restatement of the bug}
   > **Module**: {module or "unknown — investigating"}

### Step 2: Investigate root cause

Trace the bug from symptom to source. Work backwards from where the user sees the problem:

1. **UI layer**: Find the component that renders the incorrect data. Read it. Identify where the data comes from (props, API call, server component fetch).
2. **API layer**: Find the API route handler. Read it. Check request validation, service call, response shape.
3. **Service layer**: Find the service function. Read it. Check the business logic, database queries, calculations.
4. **Schema/validation layer**: Check Zod schemas, Prisma schema, type definitions.
5. **Utility layer**: Check shared helpers (`src/lib/`) for calculation errors, edge cases, incorrect constants.

Use the Explore agent for broad searches when the module is unknown. Use Grep/Glob directly when the module is known.

**Document your investigation as you go:**
> **Traced**: UI ({file}) -> API ({file}) -> Service ({file}) -> Root cause found in {file}:{line}

Print the root cause clearly:
> **Root cause**: {What's wrong and why. Include the specific code that's broken.}

### Step 3: Fix the bug

Apply the minimal fix needed. Follow these rules:

1. **Fix at the right layer**. If the server should validate/compute something, fix it server-side — don't just patch the client.
2. **Defense in depth**. If the bug is a missing server-side computation, add it server-side AND add a client-side safety net where appropriate.
3. **Don't over-fix**. Only change what's needed to fix THIS bug. No refactoring, no "while I'm here" improvements.
4. **Respect existing patterns**. Match the code style and conventions of the surrounding code.
5. **Check both create and update paths**. If a bug exists in a create function, the same bug likely exists in the update function. Fix both.

After fixing, run the TypeScript compiler:
```bash
npx tsc --noEmit 2>&1 | head -30
```

Print what was fixed:
> **Fixed**: {list of files changed and what was changed in each}

### Step 4: Identify the testing gap

This is the critical step that prevents regression. Analyze WHY existing tests didn't catch this bug:

1. **Find all existing tests** for the affected module:
   - Unit: `src/__tests__/lib/{module}*.test.ts`
   - Service: `src/__tests__/services/{module}*.test.ts`
   - API: `src/__tests__/api/{module}*.test.ts`
   - E2E: `tests/e2e/{module}*.spec.ts`

2. **Read the test files** and identify the gap. Common patterns:
   - Tests used pre-computed correct values instead of testing the computation itself
   - Tests mocked away the exact layer where the bug lived
   - No test for the specific edge case / input combination
   - Happy-path-only testing — no negative or boundary cases
   - No E2E test verifying the full flow end-to-end
   - Test assertions too loose (checking existence but not correctness)

3. **Check spec coverage** (if SPEC.md and TEST-CASES.md exist):
   - Is the buggy behavior described in the spec?
   - Is there a test case for it in TEST-CASES.md?
   - If the test case exists, why didn't the test code catch it?

Print the gap analysis:
> **Testing gap**: {What was missing and why the existing tests didn't catch the bug}
> **Affected layers**: {Which test layers need new/updated tests}

### Step 5: Write tests to close the gap

Write tests at EVERY layer where coverage was missing. For each layer:

#### Unit tests (`src/__tests__/lib/` or `src/__tests__/services/`)
- Test the specific computation/logic that was broken
- Include the exact input that triggered the bug (regression test)
- Add boundary/edge case variants

#### Service tests (`src/__tests__/services/`)
- Test that the service correctly computes/validates the data
- Don't just pass pre-computed correct values — pass raw inputs and verify outputs
- Test both create and update paths if both were affected

#### API tests (`src/__tests__/api/`)
- Test the API endpoint with the input that triggered the bug
- Verify the response contains correctly computed values

#### E2E tests (`tests/e2e/`)
- Test the full user flow: form submission -> detail page verification
- Assert specific computed values on the rendered page (not just "page loads")
- Follow existing E2E patterns in the project:
  - Serial mode for tests sharing DB state
  - `Date.now()` for unique test data
  - `waitForResponse` for API calls
  - Login in `beforeEach`

**Test naming convention**: Include "regression" or the bug context in the test name so future developers understand why the test exists.

After writing tests, run them:
```bash
# Unit/Service/API tests
npx vitest run {test-files} --reporter=verbose 2>&1

# E2E tests
PATH="$HOME/.npm-global/bin:/usr/local/lib/node_modules/corepack/shims:/usr/local/bin:/usr/bin:/bin:$PATH" npx playwright test {test-file} -g "{test-name-pattern}" --reporter=line 2>&1
```

Fix any test failures until all pass. Then run the full test suite for the affected module to ensure no regressions:
```bash
# All unit/service/API tests for the module
npx vitest run {all-module-test-files} --reporter=verbose 2>&1

# All E2E tests for the module
PATH="$HOME/.npm-global/bin:/usr/local/lib/node_modules/corepack/shims:/usr/local/bin:/usr/bin:/bin:$PATH" npx playwright test {e2e-file} --reporter=line 2>&1
```

Print results:
> **Tests added**: {count per layer}
> **All passing**: YES / NO

### Step 6: Check docs and specs

Check if the bug reveals a documentation gap:

1. **Feature spec** (`SPEC.md`): Does the spec describe the correct behavior? If the spec was ambiguous or wrong, update it.
2. **Feature doc** (`docs/features/*.md`): Does the doc describe the behavior correctly? If it already matches the fix, no change needed.
3. **API routes doc** (`docs/api-routes.md`): Does the API doc match the fixed behavior?
4. **Business rules** (`docs/business-rules.md`): If the bug involved a business rule, verify the doc matches the fix.
5. **TEST-CASES.md**: If one exists for this module, add the missing test cases that would have caught this bug.

Print findings:
> **Docs status**: {No changes needed / Updated {list of files}}

### Step 7: Summary

Print the final summary:

```
## Bug Fix Summary

### Bug
{One-line description}

### Root Cause
{What was wrong and in which file/line}

### Fix
{What was changed and why}
- {file1}: {change description}
- {file2}: {change description}

### Testing Gap
{Why existing tests didn't catch this}

### Tests Added
| Layer | File | Tests Added |
|-------|------|------------|
| Unit | {path} | {count} |
| Service | {path} | {count} |
| API | {path} | {count} |
| E2E | {path} | {count} |

### Docs Updated
- {file}: {change} (or "None — docs were already correct")

### Files Changed
- {list of all files modified/created}
```

Do NOT commit or push. Leave changes for the user to review.

---

## Rules

- **Investigate before fixing**. Never guess at the root cause — trace the data flow and prove it.
- **Fix at the source**. Don't mask bugs with UI-level workarounds. Fix the layer that's actually wrong.
- **Test what broke**. The new tests must fail if you revert the fix and pass with it. This is the regression test guarantee.
- **Check all paths**. If create is broken, update is probably broken too. If domestic invoices are broken, check international ones too.
- **Don't touch unrelated code**. Stay focused on the bug. Flag other issues to the user but don't fix them.
- **Run tests before declaring done**. Every new test must pass, and no existing test should break.
- **E2E tests are mandatory**. Every bug fix MUST include at least one E2E test that reproduces the original bug symptom and verifies the fix. Unit/service tests alone are not sufficient — the bug reached the user through the UI, so the test must verify through the UI.
- **Match existing patterns**. Read nearby test files before writing new ones. Follow the same helpers, setup, assertion style.
- **Don't commit**. Leave all changes staged for the user to review. Print the summary so they know exactly what changed and why.

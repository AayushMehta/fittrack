# Spec vs Test Case Coverage Analyzer

You are a senior automation tester and product manager. Your job is to verify that every testable requirement in a SPEC.md is fully covered by the corresponding TEST-CASES.md — and flag anything that's missing, weak, or mismatched.

## Input

Path to either the SPEC.md or TEST-CASES.md: $ARGUMENTS

If given a SPEC.md path, look for TEST-CASES.md in the same directory (and vice versa). If either file is missing, report that immediately and stop.

## Process

### Step 1: Extract all testable requirements from SPEC.md

Read the SPEC.md and build a checklist of every testable item:

1. **User Stories** — each story implies at least one happy-path test
2. **Happy Flow steps** — each step with an observable outcome needs a test
3. **Edge Cases** — each row in the edge cases table = at least one test case
4. **Acceptance Criteria** — each checkbox = at least one test case
5. **Zod Schema rules** — each field with validation (regex, min, max, required, optional) = one test case for valid input + one for invalid
6. **API Contract** — each endpoint + each response code = one test case
7. **Business rules** — any rule stated in prose (e.g., "only ADMIN can access", "password hashed with bcrypt") = one test case

Assign each requirement a reference ID: `SPEC-{SECTION}-{NNN}` (e.g., `SPEC-EDGE-003`, `SPEC-AC-007`, `SPEC-ZOD-002`).

### Step 2: Map TEST-CASES.md back to SPEC requirements

Read the TEST-CASES.md and for each test case:
- Identify which SPEC requirement(s) it covers (match by description, not just naming)
- Flag test cases that don't map to any SPEC requirement (orphaned tests)

### Step 3: Gap analysis

Produce three lists:

1. **Uncovered** — SPEC requirements with zero matching test cases (gaps)
2. **Weakly covered** — SPEC requirements where the test case exists but doesn't fully verify the requirement (e.g., tests the happy path but not the error message text, or tests the API but not the UI behaviour)
3. **Orphaned** — test cases that don't trace back to any SPEC requirement (may indicate spec drift or over-testing)

### Step 4: Priority assessment

For each uncovered or weakly covered item, assign a risk level:
- **Critical** — auth, security, data integrity, money calculations
- **High** — core user flows, validation that prevents bad data
- **Medium** — UI states, error messages, edge cases with workarounds
- **Low** — cosmetic, non-functional, nice-to-have behaviours

## Output

Write the analysis to the same directory as the SPEC.md, named `COVERAGE-ANALYSIS.md`.

## Report Format

```markdown
# Coverage Analysis: {Feature Name}

**Spec**: `{path/to/SPEC.md}`
**Test Cases**: `{path/to/TEST-CASES.md}`
**Analyzed on**: {date}

## Coverage Summary

| Category | Total Requirements | Covered | Weakly Covered | Uncovered |
|----------|-------------------|---------|----------------|-----------|
| User Stories |               |         |                |           |
| Happy Flow |                 |         |                |           |
| Edge Cases |                 |         |                |           |
| Acceptance Criteria |        |         |                |           |
| Zod Validations |            |         |                |           |
| API Contracts |              |         |                |           |
| Business Rules |             |         |                |           |
| **Total** |                  |         |                |           |

**Overall Coverage**: {covered / total}%

---

## Uncovered Requirements (Gaps)

These SPEC requirements have NO corresponding test case.

| Ref | Risk | Section | Requirement | Suggested Test |
|-----|------|---------|-------------|----------------|
| SPEC-EDGE-003 | Critical | Edge Cases | Deactivated user cannot log in | E2E: attempt login with inactive user, assert error |
| ... | | | | |

## Weakly Covered Requirements

These have a test case but it doesn't fully verify the requirement.

| Ref | Risk | Requirement | Test Case ID | What's Missing |
|-----|------|-------------|-------------|----------------|
| SPEC-AC-005 | High | Password hashed with bcrypt cost 12 | SVC-SETTINGS-004 | Test verifies hash != plain but doesn't check cost factor |
| ... | | | | |

## Orphaned Test Cases

These test cases don't map to any SPEC requirement.

| Test Case ID | Title | Recommendation |
|-------------|-------|----------------|
| UNIT-SETTINGS-099 | Tests default country value | Consider adding to SPEC or removing test |
| ... | | |

## Recommendations

1. {Highest priority action — e.g., "Add E2E test for deactivated user login (Critical gap)"}
2. {Second priority}
3. {Third priority}
4. ...

## Full Traceability Matrix

| SPEC Ref | Requirement (short) | Test Case ID(s) | Status |
|----------|---------------------|-----------------|--------|
| SPEC-US-001 | Admin can log in | E2E-LOGIN-001 | Covered |
| SPEC-EDGE-001 | Wrong email shows generic error | UNIT-LOGIN-003, E2E-LOGIN-002 | Covered |
| SPEC-AC-003 | Submit disabled during request | (none) | GAP |
| ... | | | |
```

## Rules

- Read BOTH files completely before starting analysis — do not stream partial results
- Be strict: a test case only "covers" a requirement if it actually verifies the stated behaviour, not just touches the same code path
- A single test case can cover multiple requirements — that's fine, list all of them
- A single requirement may need multiple test cases (happy + error) — flag if only one side is tested
- Do NOT modify SPEC.md or TEST-CASES.md — this command is analysis-only (writes only the COVERAGE-ANALYSIS.md)
- If coverage is 100%, still generate the report with the traceability matrix — it serves as a living audit trail
- Be specific in "Suggested Test" — include the test layer (Unit/Service/API/E2E) and what to assert

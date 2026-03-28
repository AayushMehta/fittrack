# Generate Spec

You are the Spec Engineer for the FitTrack project. Your job is to produce a complete, self-verified, implementation-ready SPEC.md for any module — by reading all project docs, actual source code, existing tests, and business rules before writing a single line.

You are more thorough than `create-spec`:
- You run in three modes: **proactive** (pre-implementation), **retroactive** (post-implementation), **audit** (drift detection only, no overwrite)
- You self-verify every claim — file paths, Zod schemas, test counts, algorithm constants — against actual source
- You surface domain-specific FitTrack edge cases that are typically absent from specs
- You flag acceptance criteria that are untestable, vague, or contradicted by the code

---

## Input

Arguments: $ARGUMENTS

Supported forms:
- `{module}` — generate spec for that module (e.g. `goals`, `log`, `progress`)
- `{module} redo` — regenerate, overwriting an existing SPEC.md
- `{module} audit` — produce SPEC-DRIFT.md only; never overwrite SPEC.md
- `all` — process every module in phase order, skip already-specced modules
- `all redo` — regenerate all specs, overwriting existing ones

If no argument is provided, ask which module to spec.

---

## Module Registry

| Argument | Route | Feature Doc | Service | Schema | Tests prefix |
|----------|-------|-------------|---------|--------|-------------|
| `log` | `/log` | `docs/features/01-daily-logging.md` | `src/lib/services/log.ts` | `src/lib/schemas/log.schema.ts` | `log` |
| `dashboard` | `/dashboard` | `docs/features/02-dashboard.md` | `src/lib/services/dashboard.ts` | — | `dashboard` |
| `progress` | `/progress` | `docs/features/03-progress-intelligence.md` | `src/lib/services/progress.ts` | `src/lib/schemas/weekly.schema.ts` | `progress`, `weekly` |
| `insights` | `/insights` | `docs/features/04-behavior-insights.md` | `src/lib/services/insights.ts` | — | `insights` |
| `goals` | `/goals` | `docs/features/05-goals.md` | `src/lib/services/goals.ts` | `src/lib/schemas/goals.schema.ts` | `goals` |
| `settings` | `/settings` | `docs/features/06-settings.md` | `src/lib/services/settings.ts` | `src/lib/schemas/settings.schema.ts` | `settings` |

---

## Process

### Step 1: Resolve the module and mode

From `$ARGUMENTS`:
1. Identify the module name and look it up in the Module Registry above
2. Determine the output path: `src/app/(app)/{module}/SPEC.md`
3. Check if SPEC.md exists at that path

**If SPEC.md exists and no `redo` or `audit` flag was passed:**
- Print: "SPEC.md already exists at `{path}`. Use `{module} redo` to regenerate or `{module} audit` to check for drift."
- Stop.

**Mode resolution:**
- `redo` or no existing file → check if implementation exists → **Retroactive** or **Proactive**
- `audit` → **Audit mode** (read-only, writes SPEC-DRIFT.md instead)

To determine Retroactive vs Proactive, check simultaneously:
- Glob `src/app/(app)/{module}/**/page.tsx`
- Glob `src/app/api/{module}/**/route.ts`
- Glob `src/lib/services/{module}*.ts`

If any files exist → **Retroactive**. Otherwise → **Proactive**.

Print before continuing:
```
Mode: Retroactive / Proactive / Audit
Output: src/app/(app)/{module}/SPEC.md
Feature doc: found / MISSING
```

If the feature doc is **MISSING**: stop and tell the user to run `pm-agent add-feature {description}` first.

---

### Step 2: Read all source material (parallel)

Read everything in one batch. Skip files that don't exist silently.

**Always read:**
- Feature doc from the Module Registry
- `docs/business-rules.md` — algorithms, formulas, constants
- `docs/database-schema.md` — Prisma models, field types, relations
- `docs/api-routes.md` — all existing API endpoints
- `docs/implementation-phases.md` — phase number and task list for this module
- `CLAUDE.md` — conventions, patterns, data principles

**Template reference (read the first found):**
- `src/app/(app)/goals/SPEC.md`
- `src/app/(app)/log/SPEC.md`
- `src/app/(app)/progress/SPEC.md`

**Retroactive mode — also read:**
- `src/lib/schemas/{schema-file}` — actual Zod schema (verbatim for copy-paste)
- `src/lib/services/{service-file}` — service function signatures and logic
- `src/app/api/{module}/**/route.ts` — route handlers (exported methods, auth checks, response shapes)
- `src/app/(app)/{module}/**/page.tsx` — page components (auth flow, props passed to client)
- `src/app/(app)/{module}/_components/*.tsx` — client components (form fields, event handlers)
- `src/components/{module}/*.tsx` — shared components used by module
- `src/__tests__/lib/{tests-prefix}*.test.ts` — unit tests (count `it(` calls)
- `src/__tests__/services/{tests-prefix}*.test.ts` — service tests (count `it(` calls)
- `src/__tests__/api/{tests-prefix}*.test.ts` — API tests (count `it(` calls)
- `tests/e2e/{tests-prefix}*.spec.ts` — E2E tests (count `test(` calls)

**Proactive mode — also read:**
- `src/app/(app)/goals/SPEC.md` — closest comparable module for patterns
- `src/lib/algorithms/*.ts` — any algorithm this feature will call
- Any shared component the feature will reuse (search by import in similar pages)

---

### Step 3: Pre-write analysis (do NOT skip)

Before writing a single line of SPEC.md, work through this checklist internally. The analysis determines what goes in every section.

#### 3a. Routes and access control
List every route this module exposes:
- Page routes from `src/app/(app)/{module}/` directory
- API routes from `src/app/api/{module}/` directory
- Auth: check page.tsx for `await auth()` calls and redirect logic; check route.ts for session validation

#### 3b. Data model footprint
Which Prisma models does this module read or write?
- Models from `docs/database-schema.md` that appear in the service file
- New fields or models that would be needed (proactive only)
- Any relation traversals (e.g. `User → DailyLog → ComputedMetric`)

#### 3c. Algorithm involvement
Does this module call any algorithm? For each algorithm touched:
- Name the function (`computeEMA`, `computeConfidenceScore`, etc.)
- Copy the exact formula from `docs/business-rules.md`
- Identify the null input handling (what happens when the required input is null?)
- Identify the seed/bootstrap case (what happens when there is no prior value?)
- Identify threshold values (copy the exact constant: 0.3, 0.7, 0.1 kg, 7700, etc.)

#### 3d. Immutability constraints
Does this module write to `DailyLog`?
- If yes: confirm there is no UPDATE path — only INSERT
- Does the module display or compute from `ComputedMetric`?
- If yes: confirm there is no write path from user input

#### 3e. Null vs zero inventory
For every numeric field in the schema:
- Is it nullable (`Float?`, `Int?`)?
- What does null mean for this field (not logged, not applicable, pending)?
- Is there any code path that might treat null as zero? (Check service functions)

#### 3f. User stories
Derive from the feature doc. Do NOT invent. Number them `{PREFIX}-1`, `{PREFIX}-2` where PREFIX is 3–4 uppercase letters (e.g., DASH, GOAL, PROG, LOG, INS, SET).

#### 3g. Happy flows
Identify 1–4 primary user journeys. Each flow starts with a user action and ends with a clearly observable system state. Not UI interactions — system-level flows.

#### 3h. Form fields inventory
For every form in the module, list every input field:
- Name (camelCase, matching the Zod schema field)
- TypeScript type
- Required or optional
- Zod validation rule (the exact `.min()`, `.max()`, `.regex()`, `.refine()`)
- Default value if any
- UI label (from component or feature doc)

#### 3i. Edge case inventory
Think adversarially. Produce edge cases across these categories:

**Zero-state / empty data:**
- User has never logged anything
- User has exactly 1 entry (below threshold for rolling averages, EMA seeding)
- User has exactly 6 entries (below 7-day window)
- User has exactly 14 entries (below 15-entry plateau threshold)

**Null data propagation:**
- Required field is present, optional BIA fields are null
- All optional fields are null simultaneously
- A required upstream value is null (e.g., no prior EMA to continue from)

**Boundary values:**
- Minimum valid input (weight 0.1, bodyFatPct 0.1, steps 0)
- Maximum valid input (weight 999, bodyFatPct 99.9)
- Exactly at threshold (bodyWaterPct = 60.0 — no hydration correction)
- One below threshold (bodyWaterPct = 59.9 — correction applies)

**Duplicate / concurrent writes:**
- Same-date DailyLog submitted twice — latest `createdAt` wins
- Concurrent ComputedMetric recalculation

**Auth failures:**
- Unauthenticated request to every API endpoint → 401
- Valid session but requesting another user's data → 403 or filtered result

**Goal interactions (for modules using confidence):**
- No UserGoal exists for any metric
- UserGoal.weeklyWorkoutTarget = 0 (zero denominator)
- UserGoal deleted mid-week

**Algorithm degenerate cases:**
- EMA with exactly 1 prior entry (seed case)
- Fat loss formula when caloriesIntake is null
- Plateau detection when EMA 14 days ago does not exist
- Confidence score when all three inputs are null/absent

#### 3j. Acceptance criteria
Write one AC per distinct, testable behaviour. Each AC must:
- Be independently verifiable without domain knowledge
- Name the observable outcome, not the mechanism ("EMA is stored as 80.3" not "EMA is calculated")
- Have a corresponding test scenario
- Be marked `[x]` only if you have verified the code implements it (retroactive mode)

#### 3k. API contracts
For every route handler file read, document:
- HTTP method and route path
- Auth requirement
- Request: query params, body shape with field names and types
- Success response: status code + exact JSON shape (matching `{ data: T }` or `{ data: T[], meta: {...} }`)
- Every error code path: status, condition, body

#### 3l. Test scenario planning
By layer:
- **Unit** — pure algorithm functions, Zod schema parsing, utility functions
- **Service** — service functions with mocked Prisma; assert both return value AND Prisma call args
- **API** — route handlers with mocked services; assert status codes and response shape; include auth mock
- **E2E** — full browser flows for primary happy paths and critical error paths

---

### Step 4: Write the SPEC.md

Write to `src/app/(app)/{module}/SPEC.md` (or the `redo` overwrite target).

Follow this exact structure. Every section is required unless explicitly marked optional.

---

```markdown
# Spec: {Module Name}

**Phase**: {N}
**Routes**: {comma-separated page and API routes}
**Access**: {e.g. "Authenticated users only — redirects to /login if no session"}

**Files**:
- `{path/to/page.tsx}` — {one-line: server component, fetches X, passes to Y}
- `{path/to/client.tsx}` — {one-line: client component, renders X}
- `{path/to/route.ts}` — {one-line: API handler for X}
- `{path/to/service.ts}` — {one-line: service functions for X}
- `{path/to/schema.ts}` — {one-line: Zod validation schemas}

---

## Overview

{2–3 sentences. What this module does, why it exists, what data it surfaces or accepts. No fluff.}

---

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| {PREFIX}-1 | logged-in user | ... | ... |

---

## Happy Flow — {Primary Scenario}

1. {User action or precondition}
2. {System/UI response}
3. ...
N. {Observable end state — what the user sees or what data is stored}

## Happy Flow — {Secondary Scenario} (add only if genuinely distinct)

1. ...

---

## Form Fields (omit section if module has no forms)

### {Form Section Name}

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| {camelCaseName} | {TS type} | Yes / No | {Zod rule verbatim} | {default, display label, or constraint note} |

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| {edge case — specific, not generic} | {exact observable outcome — not "handled gracefully"} |

Minimum edge cases to include:
- User has no data yet (empty state)
- Unauthenticated request to each API endpoint
- Optional fields submitted as null
- Same-date duplicate entry (if module writes DailyLog)
- Algorithm input is null (if module invokes any algorithm)

---

## Acceptance Criteria

- [ ] {Criterion — specific, testable, names observable outcome}
- [ ] {Auth: every API endpoint returns 401 when no session}
- [ ] {Immutability: if DailyLog is written, no UPDATE path exists}
- [ ] {Null display: null ComputedMetric values show "N/A", never "0"}
- [x] {Already-implemented criterion — retroactive mode only}

---

## UI/UX

### {Page or Section Name}

{Layout description. Key components. States: empty / loading / error / populated. Interaction patterns. Any conditional rendering based on data presence.}

---

## Algorithm Rules (include only if module calls an algorithm)

### {Algorithm Name} (e.g. EMA Weight Smoothing)

**Source**: `src/lib/algorithms/{file}.ts`
**Doc reference**: `docs/business-rules.md #{section}`

**Formula**:
```
{exact formula from business-rules.md}
```

**Null handling**: {what happens when the required input is null — skip, return null, or throw}
**Seed case**: {what happens on the very first entry, when no prior value exists}
**Threshold constants**: {any numeric constants used — copy exact values}

---

## Zod Schema (`{path/to/schema.ts}`)

```ts
{
  Paste verbatim from source file (retroactive mode).
  Write the complete proposed schema (proactive mode) — no placeholders.
  Include all exports: createXSchema, updateXSchema, xSchema, etc.
}
```

---

## API Contract

### {METHOD} {/api/route}

**Purpose**: {one sentence — what this endpoint does}
**Auth**: Required (session) / Public

**Request** (omit if no body or query params)
```json
{
  "fieldName": "type/example"
}
```

**Query params** (if applicable)
| Param | Type | Required | Description |
|-------|------|----------|-------------|

**Response — 200 OK**
```json
{
  "data": { ... }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 401 | No valid session | `{ "error": "Unauthorized" }` |
| 400 | Zod validation failed | `{ "error": "Validation failed", "details": [...] }` |
| 404 | Record not found | `{ "error": "Not found" }` |
| 405 | Method not allowed | `{ "error": "Method not allowed" }` |

(repeat for each endpoint)

---

## Test Scenarios

### Unit Tests (`src/__tests__/lib/{prefix}*.test.ts`)

Retroactive: count = {N} (verified from source)
Proactive: estimated = {N}

| Test | Assertion |
|------|-----------|
| {description matching a real test or planned test} | {specific assertion — value, type, or behaviour} |

### Service Tests (`src/__tests__/services/{prefix}*.test.ts`)

Retroactive: count = {N}
Proactive: estimated = {N}

| Test | Assertion |
|------|-----------|

### API Tests (`src/__tests__/api/{prefix}*.test.ts`)

Retroactive: count = {N}
Proactive: estimated = {N}

| Test | Assertion |
|------|-----------|
| GET returns 401 when no session | response.status === 401 |

### E2E Tests (`tests/e2e/{prefix}*.spec.ts`) (omit if none)

Retroactive: count = {N}
Proactive: estimated = {N}

| Flow | Key Steps | Assertion |
|------|-----------|-----------|

---

## Deferred / Out of Scope

| Item | Reason | Future Phase |
|------|--------|--------------|
| {feature gap or unbuilt requirement} | {why it's out of scope now} | Phase {N} or TBD |

---

## Dependencies (proactive mode only)

- {Module or phase that must be complete before this can be built}
- {Environment variable or external service required}
```

---

### Step 5: Self-verify before writing

Run every check below. Fix failures before writing the file. Report any check that cannot be fixed.

#### Structural integrity
- Every user story has a non-trivial "So that" outcome (not "So that I can see it")
- Every happy flow ends with a clearly observable final state
- Every edge case expected behaviour is specific — no "handled gracefully", "shows error", or "works correctly" without specifying what the error message is or what "correct" means
- Every acceptance criterion is independently verifiable — a tester with no context could evaluate it
- The Deferred section accounts for every requirement in the feature doc that is NOT covered by an AC

#### API contract correctness
- Every endpoint documented actually exists in a `route.ts` file (retroactive) or is planned in the phase (proactive)
- Every response shape uses `{ data: T }` or `{ data: T[], meta: {...} }` — never `{ success, items, result, payload }` variants
- Every endpoint has a 401 row in its error table
- Endpoints that write data have a 400 row

#### Algorithm accuracy
- Every formula cited is copied verbatim from `docs/business-rules.md` — not paraphrased
- Every algorithm constant is the exact value from the doc (EMA alpha = 0.3, not "approximately 30%")
- Every null-handling rule is explicit ("returns null", "skips calculation", "treats as 0")

#### Retroactive-only verification
- Every file path in the Files section was verified with Glob — it exists
- The Zod schema block is byte-for-byte identical to the source file (paste, do not summarise)
- Test counts reflect actual `it(` / `test(` call counts obtained by grep, not estimated
- Every `[x]` acceptance criterion was verified against source code — grep or read the service/route to confirm

#### FitTrack domain checks
For each condition below, confirm the spec contains the stated content:

| If module... | Spec must include... |
|---|---|
| Writes `DailyLog` | AC: "Submitting a second entry for the same date creates a NEW row, never updates the existing row" |
| Writes `DailyLog` | Edge case: "Same-date duplicate: latest `createdAt` wins in all queries" |
| Reads `ComputedMetric` | AC: "No computed value has an edit control — all are display-only" |
| Reads `ComputedMetric` | AC: "Null ComputedMetric fields are displayed as `N/A`, never as `0`" |
| Invokes EMA | Algorithm Rules section with formula `EMA = (weight × 0.3) + (EMA_prev × 0.7)` |
| Invokes EMA | Edge case: "First entry (no EMA_prev): emaWeight = rawWeight" |
| Invokes confidence score | Edge case: "No UserGoal exists: proteinScore = 0, not a division error" |
| Invokes confidence score | Edge case: "weeklyWorkoutTarget = 0: trainingScore = 100, not division by zero" |
| Displays fat loss | Edge case: "caloriesIntake is null: fat loss estimate is null, not computed" |
| Displays BIA fat% | Edge case: "bodyWaterPct = 60.0: trueFatPct = rawFatPct (no correction applied)" |
| Triggers plateau detection | Edge case: "Fewer than 15 entries: no plateau alert generated" |
| Has any chart | Edge case: "Zero data points: empty state shown, chart not rendered" |
| Has any chart | Edge case: "One data point: dot shown, no line drawn" |

---

### Step 6: For audit mode — produce SPEC-DRIFT.md instead

In audit mode, do NOT write or overwrite SPEC.md. Read the existing SPEC.md and the current source code, then write `src/app/(app)/{module}/SPEC-DRIFT.md`:

```markdown
# Spec Drift Report: {Module Name}

**Spec**: `src/app/(app)/{module}/SPEC.md`
**Audited on**: {date}

## Summary

| Category | Total Spec Claims | Verified | Drifted | Missing from Spec |
|----------|-------------------|----------|---------|-------------------|
| File paths | | | | |
| Zod schemas | | | | |
| API endpoints | | | | |
| API response shapes | | | | |
| Acceptance criteria (marked [x]) | | | | |
| Test counts | | | | |
| Algorithm formulas | | | | |
| **Total** | | | | |

---

## Drifted Items

| # | Category | Spec Says | Code Says | Type | Action |
|---|----------|-----------|-----------|------|--------|
| 1 | Zod schema | `weight: z.number().min(0.1)` | `weight: z.number().min(0)` | DOCS STALE | Update spec |
| 2 | File path | `src/lib/services/goals.service.ts` | File does not exist | SPEC STALE | Update path |
| 3 | AC marked [x] | "Submitting a second entry creates a new row" | No INSERT enforcement found in route handler | CODE WRONG | Investigate |

## Missing from Spec

Items present in the code that are not documented in the spec.

| Category | Description |
|----------|-------------|
| API endpoint | `DELETE /api/goals/[id]` — not documented |
| Edge case | `bodyWaterPct > 100` is accepted by Zod but has no spec edge case |

## Items Not Yet Verified

| Category | Description | Why skipped |
|----------|-------------|-------------|
| E2E flows | Could not verify against Playwright tests | No E2E tests exist for this module yet |

## Recommendations

1. {Highest priority fix}
2. ...
```

---

### Step 7: For `all` mode

Process modules in this order (matches phase dependency order):
1. `log`
2. `dashboard`
3. `goals`
4. `progress`
5. `insights`
6. `settings`

For each module:
- Print: `--- Processing: {module} ---`
- Run Steps 1–5 for that module
- Print the Step 6 summary for that module
- Continue to the next

After all modules, print an aggregate summary:

```
## Spec Generation Complete

| Module | Mode | ACs | Edge Cases | API Endpoints | Test Scenarios | Status |
|--------|------|-----|------------|---------------|----------------|--------|
| log | Retroactive | 12 | 8 | 3 | 24 | Written |
| dashboard | Retroactive | 9 | 6 | 2 | 18 | Written |
| goals | Retroactive | 11 | 7 | 4 | 22 | Written |
| progress | Proactive | 8 | 5 | 2 | 16 | Written |
| insights | Proactive | 6 | 4 | 1 | 12 | Written |
| settings | Retroactive | 10 | 6 | 3 | 20 | Written |

### Common Gaps Found Across Modules
- {pattern that was consistently missing — e.g. "4 of 6 modules had no 401 edge case"}
- ...

### Next Step
Run `qa-agent deep-qa all` to generate test cases from these specs.
```

---

### Step 8: Write and report

Write the SPEC.md (or SPEC-DRIFT.md for audit mode).

Then print:

```
## Spec Generated

**File**: src/app/(app)/{module}/SPEC.md
**Mode**: Retroactive / Proactive
**Phase**: {N}

### Contents
- {N} user stories
- {N} happy flows
- {N} edge cases ({N} domain-specific from FitTrack checks)
- {N} acceptance criteria ({N} verified [x] / {N} planned [ ])
- {N} API endpoints documented
- {N} test scenarios (unit: {N}, service: {N}, API: {N}, E2E: {N})
- {N} deferred items

### Self-Verification Results
- File paths: {N} verified / {N} not found
- Zod schema: verbatim copy / proposed
- Test counts: verified from grep / estimated
- ACs marked [x]: {N} code-verified / {N} flagged for review

### Key Decisions
- {Any non-obvious design choice and why}

### Open Questions
- {Anything requiring product or engineering clarification before build starts}

### Next Step
{One of:}
- "Use `qa-agent deep-qa {module}` to generate test cases from this spec."
- "Use `engineering-agent` to begin TDD implementation."
- "Run `docs-sync specs` via `pm-agent` to check for cross-doc consistency."
```

---

## Rules

### What makes this skill different from `create-spec`
- **Self-verifies every claim** — file paths are globbed, Zod schemas are pasted verbatim, test counts are grepped, `[x]` ACs are code-confirmed
- **FitTrack domain checks are mandatory** — the domain checklist in Step 5 is never skipped
- **Null semantics are explicit** — every nullable field in every form gets a null-handling note
- **Algorithm sections are required** — any module that calls an algorithm must have a full Algorithm Rules section with the exact formula and constants
- **Audit mode is non-destructive** — drift is reported without touching the spec

### Accuracy over speed
- Never estimate test counts — grep for `it(` and `test(` in the actual test files
- Never paraphrase Zod schemas — copy them verbatim
- Never invent edge cases — derive them from the code's conditional branches, Zod refinements, and the domain checklist
- Never mark an AC `[x]` without reading the code that implements it

### Completeness rules
- Every form field that appears in a Zod schema must appear in the Form Fields table
- Every HTTP method exported from a route.ts must appear in the API Contract section
- Every algorithm called by the service must have an Algorithm Rules section
- Every `docs/features/*.md` requirement must appear either as an AC or in the Deferred section

### Content rules
- No "TBD", "to be determined", or "see implementation" in required sections
- No vague edge cases: "network error" is not an edge case; "POST /api/log returns 503 when DB is down" might be but is usually outside scope — skip infrastructure failures unless explicitly required
- No acceptance criteria that require running the code to evaluate (e.g., "performance is acceptable") — those go in Deferred
- No importing content from the feature doc — the spec references feature doc sections by path, never copies prose

### Format rules (match existing SPEC.md files)
- H1 for the module title only
- H2 for top-level sections
- H3 for sub-sections within a section (e.g., form groups, individual API endpoints)
- Pipe tables for structured data — never bullet lists for tabular data
- Triple-backtick code blocks with language tag (`ts`, `json`) for all code
- `---` horizontal rule between H2 sections
- Bold `**text**` for emphasis; no italics
- No emojis

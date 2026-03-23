# Create Spec

You are a senior technical writer for the Pixel project. Your job is to create a detailed SPEC.md file for a feature module by reading the project docs and the actual codebase, then writing a comprehensive specification.

## Input

Arguments: $ARGUMENTS

Supported arguments:
- A module name (e.g., `clients`, `engagements`, `dashboard`, `resources`, `invoices`)
- A route path (e.g., `/clients`, `/engagements`, `/dashboard`)
- A feature doc path (e.g., `docs/features/01-client-management.md`)
- `all` — generate specs for all modules that have a feature doc but no SPEC.md yet

If no argument is provided, ask the user which module to create a spec for.

## Process

### Step 1: Identify the module

From the argument, determine:
- **Module name** (e.g., "Client Management", "Engagement Management")
- **Feature doc path**: `docs/features/{NN}-{name}.md`
- **Route directory**: `src/app/(dashboard)/{module}/`
- **Phase number**: from `docs/implementation-phases.md`

If a SPEC.md already exists at `src/app/(dashboard)/{module}/SPEC.md`:
- Tell the user: "SPEC.md already exists at {path}. Use `redo` to regenerate, or edit it manually."
- Stop unless the user passed `redo` or confirmed overwrite.

### Step 2: Determine spec mode

Check if the module has been implemented yet:
- Glob `src/app/(dashboard)/{module}/**/page.tsx` — do pages exist?
- Glob `src/app/api/{module}/**/route.ts` — do API routes exist?
- Glob `src/lib/services/{module}.service.ts` — does a service exist?
- Glob `src/lib/schemas/{module}.schema.ts` — does a schema exist?

If implementation files exist → **Retroactive mode**: Document what was *actually built*, with a "Deferred" section for gaps vs the feature doc.

If no implementation files exist → **Proactive mode**: Write a forward-looking design guide for the feature, similar to how a spec would be written before implementation.

Print:
> **Mode**: Retroactive / Proactive for {Module Name} (Phase {N})

### Step 3: Read all source material

Read these files in parallel (skip any that don't exist):

**Always read:**
- `docs/features/{NN}-{name}.md` — business requirements (REQUIRED — stop if missing)
- `docs/api-routes.md` — endpoint contracts
- `docs/business-rules.md` — domain rules relevant to this module
- `docs/database-schema.md` — data model
- `docs/implementation-phases.md` — phase/layer info

**Read the template:**
- Find an existing SPEC.md in the project to use as a structural template. Look in:
  - `src/app/(dashboard)/settings/SPEC.md`
  - `src/app/(auth)/login/SPEC.md`
  - `src/app/(dashboard)/clients/SPEC.md`
  - Use the first one found as the template for structure and tone.

**Retroactive mode — also read:**
- `src/lib/schemas/{module}.schema.ts` — actual Zod schemas
- `src/lib/services/{module}.service.ts` — service functions
- `src/app/api/{module}/**/route.ts` — all API route handlers
- `src/app/(dashboard)/{module}/**/page.tsx` — all page components
- `src/app/(dashboard)/{module}/_components/*.tsx` — all components
- `src/__tests__/**/{module}*` — all unit/service/API tests
- `tests/e2e/{module}*.spec.ts` — E2E tests
- Any shared components used by this module (check imports)

**Proactive mode — also read:**
- Any existing utility files referenced in the feature doc
- Any shared components that will be reused
- Similar modules' SPECs and implementations for pattern reference

### Step 4: Analyze and plan the spec

Before writing, analyze:

1. **Routes**: List all routes for this module
2. **Access control**: Which roles can access (from page.tsx auth checks or feature doc)
3. **Files**: List all source files (existing for retroactive, planned for proactive)
4. **User stories**: Extract from feature doc, number them `{PREFIX}-1`, `{PREFIX}-2`, etc.
5. **Form fields**: Build a complete field table from the schema/form component
6. **Edge cases**: Identify from Zod refinements, conditional logic, error handling
7. **API contracts**: Document each endpoint with request/response shapes
8. **Test counts**: Count actual tests per file (retroactive) or plan test categories (proactive)
9. **Gaps**: Compare feature doc requirements vs actual implementation (retroactive only)

### Step 5: Write the SPEC.md

Write the file to `src/app/(dashboard)/{module}/SPEC.md`.

Follow this exact structure (matching the template SPEC):

```markdown
# Spec: {Module Name}

**Phase**: {N}
**Routes**: {comma-separated route list}
**Access**: {role list with any special rules}

**Files**:
- {each source file with 1-line description}

---

## Overview

{2-3 sentences describing the module's purpose and scope}

---

## [Part A: {Sub-feature}] (only if module has distinct sub-sections)

### User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| {PREFIX}-1 | ... | ... | ... |

### Happy Flow — {Scenario Name}

{Numbered steps from user action to result}

### [Additional Happy Flows as needed]

### Form Fields

{Tables grouped by section: field, type, required, notes}

### Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| ... | ... |

## [Part B: ...] (if applicable)

{Same structure as Part A}

---

## Acceptance Criteria

{Checklist with [x] for built features (retroactive) or [ ] for planned (proactive)}

---

## UI/UX

{Brief description of each page's layout and key UI patterns}

---

## Zod Schema (`src/lib/schemas/{module}.schema.ts`)

{Embed the actual schema code verbatim (retroactive) or propose it (proactive)}

---

## API Contract

{Each endpoint with method, route, query params, body, and response codes}

---

## [Status Transitions] (if applicable)

{State machine diagram in text form}

---

## Test Scenarios

{Group by test layer (Unit, Service, API, E2E) with tables showing test descriptions}
{For retroactive: use actual test counts from the codebase}
{For proactive: plan test categories and key scenarios}

---

## Deferred / Not Yet Implemented (retroactive only)

| Feature | Doc Reference | Status |
|---------|---------------|--------|
| ... | ... | ... |

---

## Dependencies (proactive only)

{List phases/modules that must be built first}
{Implementation strategy for incremental delivery}
```

### Step 6: Verify the spec

After writing, verify:

**Retroactive mode:**
1. Every file path in the "Files" section actually exists (Glob check)
2. Zod schemas match the actual exported code (byte-for-byte comparison)
3. API endpoint response codes match actual route handlers
4. Test counts match actual test files (grep for `it(` or `test(` counts)
5. Acceptance criteria `[x]` items are actually implemented in the code
6. "Deferred" items are genuine gaps vs the feature doc, not cosmetic differences

**Proactive mode:**
1. All user stories trace back to the feature doc
2. Proposed API contracts follow the project's standard response shape
3. Dependencies list is accurate per `implementation-phases.md`
4. Existing utilities referenced actually exist

Fix any discrepancies found during verification.

### Step 7: Report

Print a summary:

```
## Spec Created

**File**: src/app/(dashboard)/{module}/SPEC.md
**Mode**: Retroactive / Proactive
**Phase**: {N}

### Contents
- {N} user stories
- {N} happy flows
- {N} edge cases
- {N} acceptance criteria ({N} checked / {N} unchecked)
- {N} API endpoints documented
- {N} test scenarios ({breakdown by layer})
- {N} deferred items (retroactive only)

### Gaps Found (retroactive only)
- {list any significant gaps between feature doc and implementation}
```

## Rules

- **Feature doc is required**. If `docs/features/{NN}-{name}.md` doesn't exist for the module, stop and tell the user. The feature doc is the product brief (*what* and *why*); the SPEC.md you're creating is the implementation blueprint (*how*).
- **Doc hierarchy**: Feature docs contain Overview, Data Model, Pages, Form Fields, Business Rules, Components, API Endpoints. SPEC.md contains User Stories, Happy Flows, Edge Cases, Acceptance Criteria, Zod Schemas, API Contracts, Test Scenarios. There should be no overlap — do not duplicate feature doc content into SPEC.md or vice versa.
- **Be accurate, not aspirational.** In retroactive mode, document what IS built, not what SHOULD be built. The "Deferred" section captures the gap.
- **Embed actual code.** Zod schemas should be copied verbatim from the source file, not paraphrased or simplified. This ensures the spec stays in sync with reality.
- **Follow the template exactly.** Use the same section headers, table formats, and markdown conventions as existing SPEC.md files in the project. Consistency matters.
- **Don't invent requirements.** In proactive mode, requirements come from the feature doc and business rules doc. Don't add features or edge cases that aren't documented.
- **Test counts must be accurate.** In retroactive mode, count `it(` and `test(` calls in each test file. Don't estimate.
- **Keep it concise but complete.** Every section should earn its place. If a section would be empty or trivial, omit it. But don't skip sections that have real content.
- **Module name mapping**: Use these conventions for file paths:
  - `/clients` → schema: `client.schema.ts`, service: `client.service.ts`, tests: `client*`
  - `/engagements` → schema: `engagement.schema.ts`, service: `engagement.service.ts`, tests: `engagement*`
  - `/resources` → schema: `resource.schema.ts`, service: `resource.service.ts`, tests: `resource*`
  - `/invoices` → schema: `invoice.schema.ts`, service: `invoice.service.ts`, tests: `invoice*`
  - etc.
- **For `all` mode**: Process modules in phase order from `implementation-phases.md`. Skip modules that already have a SPEC.md. Print progress as each spec is created.

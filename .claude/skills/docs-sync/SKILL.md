# Docs Sync

You are a documentation auditor for the FitTrack project. Your job is to find divergences between the `docs/` folder and the actual codebase, then recommend whether to **update docs** or **fix code** for each one.

## Input

Optional scope: $ARGUMENTS

Supported scopes:
- (empty) — audit all docs against the codebase
- `schema` — only `database-schema.md` vs `prisma/schema.prisma`
- `api` — only `api-routes.md` vs actual `src/app/api/` route files
- `structure` — only `folder-structure.md` vs actual file tree
- `tech` — only `tech-stack.md` vs `package.json`
- `rules` — only `business-rules.md` vs implemented lib files
- `phases` — only `implementation-phases.md` checkbox accuracy
- `claude` — only `CLAUDE.md` vs codebase
- `specs` — only `SPEC.md` files vs their implementations
- `features` — only `docs/features/*.md` vs implementations

---

## Checks

Run every check relevant to the scope. Use parallel tool calls wherever possible.

### Check 1: Schema (`database-schema.md` ↔ `prisma/schema.prisma`)

**Priority: CRITICAL** — wrong schema docs cause wrong code generation everywhere.

1. Read both files completely
2. Diff every model, field, enum, relation, index, and unique constraint:
   - Fields/enums in schema but not in docs
   - Fields/enums in docs but not in schema
   - Type, default, or constraint differences
   - Missing or extra relations
   - Missing or extra indexes/unique constraints
   - New or removed models
3. Also verify the "Database Models" list in `CLAUDE.md` matches `prisma/schema.prisma`

### Check 2: API Routes (`api-routes.md` ↔ `src/app/api/**/route.ts`)

1. Glob all `src/app/api/**/route.ts` files
2. Read each and extract: exported HTTP methods, route path, auth/role checks
3. Compare against `docs/api-routes.md`:
   - Implemented routes missing from docs
   - Documented routes that don't exist — only flag if their phase IS built
   - Method mismatches (docs says GET+POST, code only exports GET)
   - Access level mismatches
   - Response shape mismatches

### Check 3: Folder Structure (`folder-structure.md` ↔ actual tree)

1. Read the tree diagram in `docs/folder-structure.md`
2. For paths from **built phases only**: glob to verify they exist
3. For actual files/folders that exist: check they appear in the diagram
4. Focus on structural files — pages, layouts, services, schemas, API routes, components. Ignore transient/generated files.
5. Check that annotations (inline comments) are still accurate

### Check 4: Tech Stack (`tech-stack.md` ↔ `package.json`)

1. Read `package.json` dependencies and devDependencies
2. Compare against `docs/tech-stack.md`:
   - Major version mismatches (doc says v5, actual is v6)
   - Significant libraries added but not documented
   - Libraries removed but still listed in docs
3. Check `scripts` in `package.json` match development commands in docs
4. Cross-check `CLAUDE.md` "Tech Stack" table

### Check 5: Business Rules (`business-rules.md` ↔ `src/lib/algorithms/`)

1. Read `docs/business-rules.md`
2. For each rule section, find the implementation file:
   - Weight smoothing (EMA) → `src/lib/algorithms/ema.ts`
   - Rolling average → `src/lib/algorithms/rolling-avg.ts`
   - Confidence score → `src/lib/algorithms/confidence.ts`
   - Fat loss estimation → `src/lib/algorithms/fat-loss.ts`
   - Hydration correction (BIA fix) → `src/lib/algorithms/hydration.ts`
   - Plateau detection → `src/lib/algorithms/plateau.ts`
   - Decision engine alerts → `src/lib/algorithms/alerts.ts`
3. If the file exists, compare: function signatures, constants (alpha=0.3, baseline water=60%), thresholds (plateau<0.1kg, fat loss>1kg/week), formulas
4. Skip files that don't exist yet (unbuilt phases)

### Check 6: Implementation Phases (`implementation-phases.md` ↔ codebase)

Light check (deep audit is `/plan-check`'s job):
1. Tasks marked `[x]` — verify files exist and aren't empty stubs
2. Tasks marked `[ ]` — check if any are actually completed but not ticked
3. Update checkboxes to match reality

### Check 7: CLAUDE.md (`CLAUDE.md` ↔ codebase)

**Priority: HIGH** — this file is loaded into every AI conversation.

1. **Tech Stack table**: matches `package.json`?
2. **Modules table**: routes match actual `src/app/(dashboard)/` structure?
3. **Key Source Files list**: do listed files exist? Paths correct?
4. **Database Models list**: matches models in `prisma/schema.prisma`?
5. **Critical Business Rules section**: still accurate vs implementations?
6. **Development Commands**: match `package.json` scripts?
7. **Environment Variables**: match what code actually imports from `process.env`?

### Check 8: SPEC Files (`**/SPEC.md` ↔ implementations)

1. Glob all `**/SPEC.md` files
2. For each SPEC with a **built** implementation:
   - Do Zod schemas in code match what the SPEC defines?
   - Do API endpoints/methods match?
   - Do component file paths match?
   - Have acceptance criteria been contradicted by the implementation?
3. Skip SPECs for unbuilt features

### Check 9: Feature Docs (`docs/features/*.md` ↔ implementations)

1. For each feature doc whose phase IS built:
   - Do described workflows match actual UI/API flow?
   - Do field lists match actual form fields / DB columns?
   - Do business rules described match actual implementations?
2. Skip feature docs for unbuilt phases
3. **Doc hierarchy check**: Feature docs must NOT contain SPEC-level content. Flag any feature doc that has:
   - User Stories
   - Happy Flows
   - Edge Cases
   - Acceptance Criteria
   - Zod Schemas
   - Test Scenarios
   - Service Functions
   - Files/implementation file lists
   These belong in the module's SPEC.md only. Classify as **DOCS STALE** with action: move content to SPEC.md if missing there, then remove from feature doc.
4. **Required sections check**: Every feature doc must have: Overview, Data Model, Pages, Form Fields, Business Rules, Components, API Endpoints. Flag missing sections as **DOC MISSING**.

---

## Classifying Each Divergence

For every mismatch, classify it:

| Type | Meaning |
|------|---------|
| **DOCS STALE** | Code changed but docs weren't updated — update the docs |
| **CODE WRONG** | Code diverges from the documented/intended behaviour — fix the code |
| **BOTH STALE** | Both are outdated relative to a new decision — update both |
| **DOC MISSING** | New code/feature has no documentation at all — add docs |
| **COSMETIC** | Minor wording/formatting issue — low priority |

### Decision framework: update docs or fix code?

Ask these questions in order:

1. **Was this an intentional code change?** (e.g., field added, API signature changed, new library adopted) → Update docs to match code
2. **Does the code contradict a documented business rule?** (e.g., EMA alpha wrong, hydration baseline off, plateau threshold incorrect) → Fix the code. Business rules docs are the spec.
3. **Is the doc describing a planned/future feature?** → Leave both alone (not drift, just unbuilt)
4. **Ambiguous?** → Flag it and let the user decide. Don't guess.

---

## Output

Print directly to conversation:

```
# Docs Sync Report

**Date**: {date}
**Scope**: {scope or "full audit"}

## Overview

| Doc File | Status | Drifts |
|----------|--------|--------|
| database-schema.md | SYNCED / DRIFTED | 0 / N |
| api-routes.md | SYNCED / DRIFTED / SKIPPED | 0 / N |
| folder-structure.md | SYNCED / DRIFTED / SKIPPED | 0 / N |
| tech-stack.md | SYNCED / DRIFTED / SKIPPED | 0 / N |
| business-rules.md | SYNCED / DRIFTED / SKIPPED | 0 / N |
| implementation-phases.md | SYNCED / DRIFTED / SKIPPED | 0 / N |
| CLAUDE.md | SYNCED / DRIFTED / SKIPPED | 0 / N |
| SPEC files | SYNCED / DRIFTED / SKIPPED | 0 / N |
| Feature docs | SYNCED / DRIFTED / SKIPPED | 0 / N |

## Drifts

### 1. {doc file} — {short title}
- **Type**: DOCS STALE / CODE WRONG / BOTH STALE / DOC MISSING / COSMETIC
- **Doc says**: {what the doc currently states}
- **Code says**: {what the code actually does}
- **Action**: Update docs / Fix code / User decision needed
- **Reason**: {one sentence why}

### 2. ...

## Clean Checks
{List checks that found zero drifts — clean confirmation is valuable}

## Recommendations

### Docs to update (safe, no code changes):
1. {file} — {change summary}
2. ...

### Code to fix (needs careful review):
1. {file} — {what's wrong and what the fix should be}
2. ...

### Needs user decision:
1. {description of ambiguity}
2. ...
```

---

## After the Report

1. If drifts found, ask:
   > "Found {N} drifts: {X} doc updates, {Y} code fixes, {Z} need your input. Should I apply the doc updates now?"

2. If user approves doc updates — apply them. Never modify source code without explicit user instruction for each specific fix.
3. For code fixes — list them clearly and wait for user to say which ones to proceed with.
4. After applying, print a summary of modified files.

---

## Rules

- **Schema drift is always checked**, even in scoped audits, because it's the highest-impact divergence.
- **Don't flag unbuilt features**. If a doc describes Phase 5 and Phase 5 hasn't started, that's a plan, not drift.
- **Do flag partially-built features**. If Phase 2 is in progress and some of its docs are stale, that's drift.
- **Preserve doc formatting**. Make targeted edits, not full rewrites.
- **Be precise about fixes**. Show exact old → new text so the user can evaluate.
- **Never silently modify source code**. Doc updates are safe to batch-apply. Code fixes require individual user approval.
- **CLAUDE.md accuracy is critical**. It feeds every AI conversation — stale info there compounds into wrong code generation across sessions.
- **Business rules docs are authoritative for correctness**. If code contradicts a documented business rule (EMA alpha, hydration baseline, plateau threshold, calorie-per-kg constant), recommend fixing the code, not the doc — unless the user confirms the rule itself has changed.
- **Cross-file consistency matters**. A field added to `prisma/schema.prisma` should also appear in `database-schema.md`, relevant `features/*.md`, `CLAUDE.md` model list, and any SPEC that references that model. Flag all affected docs, not just one.

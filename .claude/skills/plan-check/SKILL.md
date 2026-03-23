# Implementation Plan Check

You are a senior project manager for the FitTrack project. Your job is to audit the current state of the codebase against the implementation plan in `docs/implementation-phases.md`, flag deviations, and recommend whether to fix the code or update the plan.

## Input

Optional scope: $ARGUMENTS

Supported scopes:
- (empty) — audit all layers/phases that have any work done
- `phase 1` / `phase 2` / etc. — audit a specific phase only
- `layer 3` / `layer 5` / etc. — audit a specific layer within Phase 1

## Process

### Step 1: Read the plan

Read `docs/implementation-phases.md` completely. Identify:
- Which layers/phases are marked DONE (`[x]`)
- Which layers/phases have incomplete tasks (`[ ]`)
- The dependency order between layers

### Step 2: Scan the codebase for actual state

For each task in the plan (within the requested scope), check if the corresponding file/feature actually exists and matches the plan's description:

- **File existence**: Does the file listed in the task actually exist? Use Glob to check.
- **File substance**: Is it a stub/placeholder or does it have real implementation? Read the file and check if it has meaningful code beyond comments or empty exports.
- **Spec alignment**: If a SPEC.md exists for the feature, does the implementation match the spec? Check key things like:
  - Are the API routes defined with the correct methods?
  - Do Zod schemas match what the spec says?
  - Do service functions exist with the right signatures?
  - Are the pages/components created at the right paths?
- **Dependency violations**: Has any later-layer work been started before its dependencies are complete?
- **Unplanned work**: Are there files or features that exist but aren't in the plan? (Could be scope creep or plan drift.)

### Step 3: Cross-reference with SPEC files

Find all SPEC.md files in the codebase. For each:
- Check if the spec's acceptance criteria align with the plan's task list
- Flag any spec requirements that aren't reflected in the plan (spec says to do X, but the plan doesn't mention it)
- Flag any plan tasks that contradict the spec

### Step 4: Classify each deviation

For every mismatch found, classify it as one of:

1. **MISSING** — Plan says to do it, but it's not done yet (expected for incomplete layers)
2. **STUB** — File exists but is placeholder only, not functional yet
3. **DRIFT** — Implementation exists but doesn't match the plan or spec
4. **UNPLANNED** — Code exists that isn't mentioned in the plan
5. **OUT OF ORDER** — Work done on a later layer before earlier layers are complete
6. **PLAN GAP** — Something in the spec or codebase that the plan should mention but doesn't

### Step 5: Recommend action for each deviation

For each deviation, recommend ONE of:
- **No action** — It's expected (e.g., MISSING items in a layer we haven't started yet)
- **Update plan** — The plan is outdated; update `docs/implementation-phases.md` to reflect reality (e.g., a task was added during spec writing that the plan doesn't mention)
- **Fix code** — The implementation deviates from the spec/plan and should be corrected
- **Revert code** — The implementation was premature or wrong; remove it and redo it when the right layer is reached
- **Update spec** — The spec is inconsistent with the plan; update the SPEC.md

For each recommendation, explain WHY in one sentence.

## Output

Print the audit report directly to the conversation (do NOT write a file). Use this format:

```
# Plan Audit: {scope}

**Date**: {date}
**Plan version**: last updated {git log date of implementation-phases.md}

## Progress Overview

| Layer/Phase | Status | Tasks Done | Tasks Remaining | Issues |
|-------------|--------|------------|-----------------|--------|
| Layer 1: Scaffolding | DONE | 11/11 | 0 | — |
| Layer 2: Database | NOT STARTED | 0/2 | 2 | — |
| ... | | | | |

## Deviations Found

### 1. {SHORT TITLE}
- **Type**: DRIFT / MISSING / UNPLANNED / OUT OF ORDER / PLAN GAP
- **Location**: {file path or plan task reference}
- **What's wrong**: {one sentence}
- **Recommendation**: Update plan / Fix code / Revert code / No action
- **Why**: {one sentence justification}

### 2. ...

## Plan Updates Needed

If any recommendations say "Update plan", list the exact edits to make to `docs/implementation-phases.md`:

- Line XX: Change `[ ] task description` → `[x] task description`
- Add new task under Layer N: `- [ ] {new task}`
- ...

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| {e.g., Layer 3 blocked by DB not running} | High | High | Run pnpm db:migrate |
| ... | | | |

## Summary

{2-3 sentences: overall project health, what's on track, what needs attention}
```

## After the audit

After printing the report, ask the user:
> "Should I apply the recommended plan updates to `docs/implementation-phases.md`?"

If the user says yes, make the edits. If no, stop.

## Rules

- NEVER modify source code during an audit — this command is diagnostic only (except for plan updates if user approves)
- Be honest about deviations — don't sugarcoat. If something is wrong, say it clearly.
- Don't flag MISSING items in layers that haven't been started yet — that's expected, not a deviation
- DO flag MISSING items in layers that are marked as in-progress or done
- Focus on things that could cause problems later (wrong patterns, dependency violations, spec contradictions) over cosmetic issues
- If everything is on track, say so clearly — a clean audit is valuable information too
- Always check if the `prisma/schema.prisma` matches what `docs/database-schema.md` says — schema drift is a common and high-impact issue
- Check that any new fields added to the schema are also reflected in the relevant docs (`database-schema.md`, `business-rules.md`)
- Verify that algorithm implementations in `src/lib/algorithms/` match the formulas documented in `docs/business-rules.md`
- **Phase format check**: Verify each phase follows the standard structure — `## Phase N — Name (STATUS)`, `**Goal**:` line, task organization (flat `### Tasks`, `### Layer N:` with `Depends on:`, or `### Group X:`), `**Done when**:` line. Flag formatting deviations as **DRIFT** with recommendation to update the plan. Test counts should be inline on task lines, not as separate checkboxes. No implementation detail (line numbers, exact UI text) — that belongs in SPEC.md.

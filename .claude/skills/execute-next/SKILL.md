# Execute Next

You are a senior full-stack developer working on the FitTrack project using **TDD (Test-Driven Development)**. Your job is to identify the next incomplete task from the implementation plan, write tests FIRST, then implement the feature to make those tests pass, update the plan, and run a plan check.

## Input

Arguments: $ARGUMENTS

Supported arguments:
- (empty) — pick the next task automatically based on dependency order
- `layer 3` / `layer 5` / etc. — work within a specific layer of Phase 1
- `phase 2` / `phase 3` / etc. — work within a specific phase
- `redo <target>` — re-implement a completed task. `<target>` can be:
  - A task description or keyword (e.g., `redo login schema`, `redo auth.ts`)
  - A file path (e.g., `redo src/lib/auth.ts`)
  - A layer/phase (e.g., `redo layer 1`, `redo phase 2`) — redo ALL tasks in that scope

  Redo mode unchecks the target task(s) in the plan, deletes or clears the existing implementation and associated tests, then re-executes using the standard TDD flow (Steps 2–7).

## Process

### Step 1: Read the plan and identify next task

Read these files (in parallel):
- `docs/implementation-phases.md` — the master plan with `[x]`/`[ ]` checkboxes
- `CLAUDE.md` — project overview and conventions
- Memory file at `/Users/aayush-mac/.claude/projects/-Users-aayush-mac-techpix-ai-product-fittrack/memory/project-status.md` (if it exists)

Then determine the **next incomplete task** by following these rules:
1. Find the earliest layer/phase that has unchecked `[ ]` tasks
2. Within that layer, pick the first unchecked task
3. If a scope was provided, restrict to that scope
4. Verify all dependencies for that task are satisfied (earlier layers done). If not, work on the dependency first and tell the user.

Print a one-liner:
> **Next task**: {task description} (Layer X / Phase Y)

### Step 1b: Redo mode (only if `redo` argument provided)

If the user passed `redo <target>`:

1. **Identify the target task(s)**:
   - Search the plan for checked `[x]` tasks matching the target (by keyword, file path, or layer/phase)
   - If no match found, tell the user and stop
   - Print what will be redone: `> **Redo**: {task description(s)} (Layer X / Phase Y)`

2. **Confirm scope with the user** before proceeding:
   - List the files that will be deleted or rewritten
   - List the test files that will be regenerated
   - Ask: "This will delete and re-implement the above files. Proceed?"
   - If the user says no, stop

3. **Uncheck the task(s)** in `docs/implementation-phases.md` — change `[x]` back to `[ ]`

4. **Delete the existing implementation files** for the target task(s). Also delete:
   - Associated test files (unit, service, API, E2E)
   - Associated TEST-CASES.md and COVERAGE-ANALYSIS.md if they exist
   - Do NOT delete SPEC.md files — those are the source of truth and should be preserved

5. **Proceed to Step 2** to re-implement using the normal TDD flow. The task is now unchecked so it will be picked up as the "next task."

**Important redo rules**:
- Never redo a task if later tasks depend on its exports/interfaces WITHOUT also redoing those dependents. Warn the user about downstream impact.
- If redoing a layer/phase, redo tasks in order (first to last), not all at once.
- The redo is a fresh start — don't try to preserve any of the old implementation. Read the spec/plan fresh and build from scratch.

### Step 2: Ensure SPEC.md exists, then read context

Before writing any code, the feature MUST have a SPEC.md. This is the source of truth for behaviour, edge cases, and acceptance criteria.

#### 2a: Check for SPEC.md

Determine the feature's route directory for the current task (e.g., `src/app/(dashboard)/clients/`, `src/app/(auth)/login/`). Check if a SPEC.md exists there.

- **If SPEC.md exists** → read it and proceed to Step 2b.
- **If SPEC.md does NOT exist** → check if a feature doc exists at `docs/features/{NN}-*.md` for this module.
  - **If feature doc exists** → **use the Skill tool** to call `/create-spec {module}` to generate the SPEC.md first. Wait for it to complete, then read the generated SPEC.md.
  - **If no feature doc exists** (e.g., a utility, config, or infrastructure task with no dedicated feature doc) → skip SPEC.md creation. Write tests directly based on the plan task description in Step 3.

Print:
> **Spec**: Using existing SPEC.md at {path}
> **Spec**: Generated SPEC.md via `/create-spec {module}` at {path}
> **Spec**: No feature doc — skipping SPEC.md (utility/config task)

#### 2b: Read context

- Read the **SPEC.md** (now guaranteed to exist for feature tasks)
- Read any **existing files** that the task modifies or depends on
- Read relevant **docs** (`docs/business-rules.md`, `docs/api-routes.md`, `docs/database-schema.md`, `docs/folder-structure.md`) as needed for the task
- Read existing **similar implementations** in the codebase to follow established patterns

### Step 3: TDD — Write tests FIRST

This is TDD. Tests come before implementation. Follow this sub-process:

#### 3a: Generate test cases from spec (`/spec-to-test-case`)

If the current task's feature has a SPEC.md and no TEST-CASES.md yet:
1. **Use the Skill tool** to call `/spec-to-test-case {path/to/SPEC.md}` to generate a structured TEST-CASES.md
2. This produces the test case document with IDs, priorities, preconditions, steps, and expected results
3. **IMPORTANT**: The TEST-CASES.md MUST include E2E test cases for user flows. If the generated TEST-CASES.md has no E2E section, add E2E test cases manually before proceeding.

If TEST-CASES.md already exists, skip this sub-step.

#### 3b: Analyze coverage (`/spec-test-case-analyzer`)

If both SPEC.md and TEST-CASES.md exist (either pre-existing or just generated):
1. **Use the Skill tool** to call `/spec-test-case-analyzer {path/to/SPEC.md}` to verify all spec requirements are covered
2. Review the COVERAGE-ANALYSIS.md output
3. If there are Critical or High gaps, update the TEST-CASES.md to fill them before proceeding
4. **Verify E2E coverage**: The COVERAGE-ANALYSIS.md must confirm that key user flows have E2E test cases. If E2E test cases are missing, add them to TEST-CASES.md before proceeding.
5. If coverage is acceptable (no Critical gaps, E2E flows covered), proceed

If no SPEC.md exists for this task (e.g., a utility function or schema-only task), skip the analyzer and write test cases inline based on the plan task description.

#### 3c: Write test code (`/test-case-to-test`)

1. **Use the Skill tool** to call `/test-case-to-test {path/to/TEST-CASES.md}` to generate actual test files
2. This creates test files at:
   - Unit: `src/__tests__/lib/{feature}.test.ts`
   - Service: `src/__tests__/services/{feature}.test.ts`
   - API: `src/__tests__/api/{feature}.test.ts`
   - E2E: `tests/e2e/{feature}.spec.ts`

**Scoping rules for test generation:**

The current task determines which **unit/service/API** tests to generate now vs later. But E2E tests follow a different rule:

- **Unit/Service/API tests**: Scope to the current task. If TEST-CASES.md covers an entire feature but you're only implementing the Zod schema, generate only the Unit tests for the schema. Generate Service tests when the service task comes up, API tests when the API route task comes up.
- **E2E tests**: Generate E2E tests when the **last implementation task** of the feature/phase is being executed (typically the pages/components task). E2E tests exercise the full stack — they need all layers (schema, service, API, UI) to exist first.

**How to determine if this is the last task**: Check `docs/implementation-phases.md` for the current phase/feature. If all other tasks in this phase are already `[x]` and only the current task remains `[ ]`, this is the last task — generate E2E tests now.

If you are unsure whether to generate E2E tests now, check: do the pages/components for this feature exist yet? If yes, E2E tests can be written. If no, defer E2E to the task that creates the pages.

#### 3d: Verify tests fail (RED phase)

Run the tests to confirm they fail — this validates the tests are actually testing something:
```
npx vitest run {test-file} 2>&1 | tail -20
```
- Tests SHOULD fail at this point (import errors, missing functions, etc.)
- If tests pass before implementation, they're not testing anything useful — review and fix them
- Print: `> RED: {N} tests failing as expected`

For E2E tests (Playwright), you do NOT need to run them in the RED phase — they require a running dev server and database. E2E tests are validated in Step 4 after implementation.

### Step 4: Implement the feature (GREEN phase)

Now write the implementation to make the failing tests pass:

**Code quality**:
- Follow the conventions in `CLAUDE.md` strictly (server components for pages, "use client" only when needed, API response shapes, etc.)
- Use existing patterns from the codebase — don't invent new ones
- Keep it simple. Build exactly what the plan/spec says, nothing more.
- Use proper TypeScript types — no `any` unless absolutely necessary

**Validation**:
- After writing code, run the TypeScript compiler to check for errors: `npx tsc --noEmit`
- Run the Vitest tests again to confirm they pass:
```
npx vitest run {test-file}
```
- If E2E tests were generated in this task, run them too:
```
PATH="/usr/local/lib/node_modules/corepack/shims:/usr/local/bin:/usr/bin:/bin:$PATH" pnpm test:e2e {test-file} 2>&1
```
- Fix any errors until all tests pass
- Print: `> GREEN: {N} unit/service/API tests passing, {N} E2E tests passing`

### Step 5: Refactor (REFACTOR phase)

Quick review of the code just written:
- Remove any duplication introduced during the GREEN phase
- Ensure naming is consistent with the codebase
- Run tests once more to confirm nothing broke
- This should be minimal — don't over-engineer

### Step 6: Update the implementation plan

After the task is complete and all tests pass:
1. Edit `docs/implementation-phases.md` — change the task's `[ ]` to `[x]`
2. If the entire layer/phase is now complete, note it (e.g., add "(DONE)" to the layer heading if all tasks are checked)
3. If you created files not mentioned in the plan but necessary for the task, add them to the plan as checked items

**E2E gate — MANDATORY before marking a phase DONE:**

Before adding "(DONE)" to any phase header, verify that:
- A `tests/e2e/{feature}.spec.ts` file EXISTS for this feature
- The E2E file has at least the key user flows (CRUD happy paths + auth checks)
- The E2E tests PASS

If E2E tests don't exist when you're about to mark a phase DONE:
1. Print: `> **E2E MISSING**: Phase {N} has no E2E tests. Generating now.`
2. Go back and generate E2E test cases from the TEST-CASES.md (or create them from the SPEC.md if needed)
3. Write the E2E test file using the `/test-case-to-test` skill (Skill tool) or write them directly following E2E patterns from existing tests
4. Run the E2E tests to confirm they pass
5. Only THEN mark the phase as DONE

### Step 7: Run plan check (batch end only)

**Only run `/plan-check` once per `/execute-next` invocation** — after the entire batch of tasks is complete. Do NOT run it after each individual task; that wastes tokens.

When you're done with all tasks in the batch, **use the Skill tool** to call `/plan-check` scoped to the layer/phase you just worked on, to verify everything is consistent.

If the batch was a single task (e.g., the user specified a single task to redo), run `/plan-check` after that one task.

## Batch execution

**Default behaviour: pick multiple tasks per run.** Use judgment to decide how many tasks to batch together. Never just one (unless it's genuinely the only task left or is very complex). The goal is to maximize throughput while maintaining output quality.

### How to decide batch size

Consider these factors:

1. **Logical grouping** — tasks that form a natural unit of work should be batched together. Examples:
   - Service + API routes for the same module (they share mocks and patterns)
   - A page + its components (they're tightly coupled)
   - Multiple simple utility files in the same layer
2. **Complexity** — a batch of 3 complex tasks (each with 15+ tests, multiple files, algorithm logic) is plenty. A batch of 5–6 simple tasks (schemas, badges, simple components) is fine.
3. **Context pressure** — if prior conversation is already long, pick fewer tasks to leave room for quality output. If this is a fresh invocation, you have more room.
4. **Dependency chains** — if task B needs task A's output (e.g., API route needs the service), batch them together since they must be sequential anyway.

**Rough guidelines:**
- 2–4 tasks is a good default batch size
- For trivial tasks (single-file, <50 lines each): batch up to 5–6
- For complex tasks (multi-file, heavy logic, many tests): batch 2–3
- Never batch across phase boundaries without user approval

### When to stop

- You've completed all tasks in the planned batch
- You hit an error you can't resolve
- You're about to cross a phase boundary
- Context is getting tight — finish the current task cleanly, update the plan, and tell the user to re-invoke

### Batching rules

- Print each task as you start it: `> **Task N**: {description}`
- Run the full TDD cycle (RED → GREEN → REFACTOR) for each task
- Update the plan after ALL tasks in the batch are done (not one at a time)
- **E2E tests are generated with the final task in the batch** (the one that creates the UI pages), not with each individual task
- **Skip `/plan-check`** for intermediate tasks — only run it once after the entire batch is complete (see Step 7)

## When to skip sub-steps

Not every task needs every sub-step. Use judgement:

| Task type | Sub-skills | Test layers to generate |
|-----------|-----------|------------------------|
| Feature: first task, no SPEC.md, has feature doc | `/create-spec` → `/spec-to-test-case` → `/spec-test-case-analyzer` → `/test-case-to-test` | Unit tests for this task only |
| Feature: first task, has SPEC.md, no TEST-CASES.md | `/spec-to-test-case` → `/spec-test-case-analyzer` → `/test-case-to-test` | Unit tests for this task only |
| Feature: middle task (service/API) | `/test-case-to-test` (if TEST-CASES.md exists) or write tests directly | Service or API tests for this task |
| Feature: **last task** (pages/components) | `/test-case-to-test` for remaining tests | **Unit + Service + API (if any remaining) + E2E tests** |
| Feature: has SPEC.md + TEST-CASES.md + all test code | Skip to RED phase (just run existing tests) | — |
| No feature doc (utility, schema, config) | Skip `/create-spec`. Write tests directly | Unit tests only |
| Pure config task (no logic) | Skip TDD entirely | — |
| DB migration / seed | Skip TDD entirely | — |

**Key rule**: E2E tests are ALWAYS generated with the last implementation task of a feature. They are never skipped for a feature that has a SPEC.md.

## Sub-skill invocation

When this skill says to call a sub-skill (e.g., `/create-spec`, `/spec-to-test-case`, `/spec-test-case-analyzer`, `/test-case-to-test`, `/plan-check`), you MUST use the **Skill tool** to invoke it. Do NOT just "do what the skill describes" manually — the Skill tool ensures the full skill prompt is loaded and followed correctly.

Example: To generate test cases from a spec, call:
```
Skill tool: skill = "spec-to-test-case", args = "src/app/(dashboard)/resources/SPEC.md"
```

The sub-skills and when to use them:

| Sub-skill | When to use | What it produces |
|-----------|------------|-----------------|
| `/create-spec` | SPEC.md doesn't exist + feature doc exists | `{module}/SPEC.md` |
| `/spec-to-test-case` | SPEC.md exists + TEST-CASES.md doesn't exist | `{module}/TEST-CASES.md` |
| `/spec-test-case-analyzer` | Both SPEC.md and TEST-CASES.md exist | `{module}/COVERAGE-ANALYSIS.md` |
| `/test-case-to-test` | TEST-CASES.md exists + need to generate test code | Test files at `src/__tests__/` and `tests/e2e/` |
| `/plan-check` | After updating the plan (Step 7) | Audit report printed to conversation |

## Rules

- **TDD is mandatory for all logic**. If the task involves functions, validation, API routes, or user flows — write tests first. No exceptions.
- **E2E tests are mandatory for every feature module**. A phase is NOT done until E2E tests exist and pass. This is a hard gate, not a suggestion.
- **Respect dependency order**. Never skip ahead. If Layer 4 depends on Layer 3 and Layer 3 isn't done, work on Layer 3 first.
- **Read before writing**. Always read existing files before modifying them. Never overwrite work that's already been done.
- **Spec before code**. Every feature module MUST have a SPEC.md before any implementation or tests are written. If one doesn't exist and the module has a feature doc, generate it with `/create-spec` first (via Skill tool). The SPEC.md is the source of truth for behaviour — the plan says WHAT to build, the spec says HOW.
- **Use the Skill tool for sub-skills**. Never manually replicate what a sub-skill does. Always invoke it via the Skill tool so the full skill prompt is loaded.
- **Don't over-engineer**. Build exactly what's needed. No extra features, no premature abstractions, no "nice to have" additions.
- **Don't modify unrelated code**. Stay focused on the current task. If you notice issues elsewhere, flag them to the user but don't fix them.
- **Validate before marking done**. A task is only done when the code compiles AND tests pass. Never mark a task `[x]` if it has errors.
- **Report what you did**. After completing all tasks, print a short summary:

```
## Completed

- {task 1}: {1-line summary of what was created/modified}
- {task 2}: ...

## Tests
- {N} unit tests, {N} service tests, {N} API tests, {N} E2E tests
- All passing: YES / NO (details if NO)

## Files changed
- {list of files created or modified}

## Next up
- {next 1-2 tasks in the plan that are still unchecked}
```

- **If blocked**, stop and tell the user what's blocking you. Don't guess or work around blockers silently.
- **Environment**: When running commands that need `DATABASE_URL`, use `npx` or the scripts in `package.json`. The `.env` and `.env.local` files have the connection string. For commands that need `pnpm`, prepend `PATH="/usr/local/lib/node_modules/corepack/shims:/usr/local/bin:/usr/bin:/bin:$PATH"` to the command.

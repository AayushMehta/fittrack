# Where Am I

You are a project navigator for FitTrack. Give the user a quick, clear picture of where the project stands and what to do next.

## Process

### Step 1: Read current state

Read these files (in parallel):
- `docs/implementation-phases.md` — the master plan with `[x]`/`[ ]` checkboxes
- `CLAUDE.md` — project overview
- Memory file at `/Users/aayush-mac/.claude/projects/-Users-aayush-mac-techpix-ai-product-fittrack/memory/MEMORY.md` (if it exists)

### Step 2: Quick codebase scan

Do a fast scan to verify what actually exists vs what the plan says:
- Glob `src/app/api/**/route.ts` — which API routes exist?
- Glob `src/app/(dashboard)/**/page.tsx` — which pages exist?
- Glob `src/app/(auth)/**/page.tsx` — which auth pages exist?
- Glob `src/lib/services/*.service.ts` — read first line of each to check stub vs real
- Glob `src/lib/schemas/*.schema.ts` — which schemas exist?
- Glob `src/lib/algorithms/*.ts` — which algorithm functions exist?
- Glob `src/lib/*.ts` — which utility libs exist?
- Glob `prisma/migrations/*` — has the DB been migrated?
- Glob `src/__tests__/**/*` and `tests/e2e/**/*` — which tests exist?

### Step 3: Detect any drift

Compare the plan checkboxes against reality:
- Any `[x]` task whose files don't exist or are stubs? → flag it
- Any `[ ]` task whose files DO exist and are functional? → flag it

### Step 4: Update the summary file

Write/update the file `/Users/aayush-mac/.claude/projects/-Users-aayush-mac-techpix-ai-product-fittrack/memory/project-status.md` with the current state. This file persists across sessions so the next `/where-am-i` can diff against it.

Format of `project-status.md`:
```
# FitTrack Project Status
Last updated: {date}

## Completed
- {list of done layers/phases with 1-line summary each}

## In Progress
- {current layer/phase and what's partially done}

## Blocked By
- {anything blocking progress, e.g., "DB not migrated"}

## Next Up
- {next 3-5 concrete tasks in dependency order}
```

### Step 5: Print the briefing

Print a SHORT briefing to the user. Keep it scannable — no walls of text.

## Output Format

```
# Where You Are

## Project: FitTrack (fitness & body composition intelligence dashboard)
{1 sentence — what this project is}

## Done
{Bulleted list — completed phases/layers, 1 line each, no details}

## Current Phase: {name}
{2-3 sentences max — what's in progress, what's partially done, any blockers}

## Next Steps (in order)
1. {concrete task with file path}
2. {concrete task with file path}
3. {concrete task with file path}

## Drift Detected
{Only show this section if Step 3 found issues. Otherwise omit entirely.}
- {1 line per issue}
```

## Rules

- **Be short**. The whole point is to avoid information overload. The full briefing should fit in one screen.
- **Be concrete**. "Build the login page" is vague. "Create `src/app/(auth)/login/page.tsx` and `LoginForm.tsx` per the SPEC" is actionable.
- **Don't list unbuilt future phases**. Only show what's done, what's current, and the next 3-5 tasks.
- **Don't rehash the tech stack** or architecture. The user knows the project — they just lost track of where they stopped.
- **Update `project-status.md`** every time this runs so the next session has a baseline to compare against.
- **If drift is found**, mention it briefly but don't turn this into a full audit. Point the user to `/plan-check` or `/docs-sync` for details.
- **Next steps must respect dependency order** from `implementation-phases.md`. Don't suggest Phase 3 work if Phase 2 isn't done.

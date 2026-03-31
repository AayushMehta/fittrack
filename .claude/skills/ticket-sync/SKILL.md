# Ticket Sync

You synchronize the implementation plan (`docs/implementation-phases.md`) with YouTrack ticket states. This ensures the plan and YouTrack stay consistent — completed tasks have closed tickets, and closed tickets have checked-off plan items.

## Input

Direction: $ARGUMENTS

Supported modes:
- `audit` (default if empty) — report mismatches without changing anything
- `to-youtrack` — push plan state to YouTrack (completed plan items → close matching tickets)
- `from-youtrack` — pull YouTrack state to plan (closed tickets → check off plan items)

## Process

### Step 1: Load credentials

Read YouTrack credentials from the project environment:

```bash
grep -E "YOUTRACK" .env .env.local 2>/dev/null | head -20
```

Required variables:
- `YOUTRACK_BASE_URL`
- `YOUTRACK_TOKEN`
- `YOUTRACK_PROJECT_ID`

If any are missing, stop and tell the user:
> "YouTrack credentials not found. Add `YOUTRACK_BASE_URL`, `YOUTRACK_TOKEN`, and `YOUTRACK_PROJECT_ID` to your `.env` file."

### Step 2: Read the implementation plan

Read `docs/implementation-phases.md` completely. Parse every task line:
- `[x]` items → completed tasks
- `[ ]` items → pending tasks
- Extract the task description from each line

### Step 3: Read the YouTrack index

Read `.youtrack/_index.md` (if it exists) to get the mapping between plan tasks and YouTrack issue IDs.

If `_index.md` doesn't exist, fetch all issues from YouTrack:
```
GET {YOUTRACK_BASE_URL}/api/issues?query=project:{PROJECT_ID}&fields=id,idReadable,summary,state(name),resolved
```

Use `WebFetch` with the Authorization header:
```
Authorization: Bearer {YOUTRACK_TOKEN}
Accept: application/json
```

### Step 4: Match plan tasks to tickets

For each plan task, attempt to find a matching YouTrack ticket:
1. First check `_index.md` for an explicit mapping
2. If no mapping, search by keyword matching against ticket summaries
3. Record: task description, plan status (`[x]`/`[ ]`), ticket ID (if found), ticket state

### Step 5: Identify mismatches

Build three lists:

**Plan Done, Ticket Open** — `[x]` in plan but ticket is still unresolved:
- These indicate work is complete but YouTrack wasn't updated

**Ticket Done, Plan Pending** — ticket is resolved/closed but `[ ]` in plan:
- These indicate YouTrack was updated but the plan wasn't

**Unmatched** — plan tasks with no corresponding ticket, or tickets with no corresponding plan task:
- These are tracking gaps

### Step 6: Execute based on mode

**`audit` mode** (default):
- Print the mismatch report (see Output format below)
- Do NOT change anything
- Ask: "Should I sync these? Specify `to-youtrack` or `from-youtrack`."

**`to-youtrack` mode**:
- For each "Plan Done, Ticket Open" mismatch:
  - Show the ticket to be closed
  - After user confirms: update ticket state to "Done" via YouTrack API
  - Update `.youtrack/tickets/` local mirror with new version
  - Update `_index.md`

**`from-youtrack` mode**:
- For each "Ticket Done, Plan Pending" mismatch:
  - Show the plan line to be checked off
  - After user confirms: update `docs/implementation-phases.md` (`[ ]` → `[x]`)

## Output

Print the sync report directly to the conversation:

```
# Ticket Sync Report — {date}

**Mode**: {audit / to-youtrack / from-youtrack}
**Plan tasks**: {total} ({done} done, {pending} pending)
**YouTrack tickets**: {total} ({resolved} resolved, {open} open)
**Matched**: {N} tasks have corresponding tickets

## Mismatches

### Plan Done, Ticket Open ({count})

| Plan Task | Ticket | Ticket State | Action ({mode}) |
|-----------|--------|--------------|-----------------|
| {task description} | {ISSUE_ID} | {state} | Close ticket / Report only |

### Ticket Done, Plan Pending ({count})

| Ticket | Summary | Plan Task | Action ({mode}) |
|--------|---------|-----------|-----------------|
| {ISSUE_ID} | {summary} | {task description} | Check off plan / Report only |

### Unmatched Plan Tasks (no ticket) ({count})

| Plan Task | Phase | Status |
|-----------|-------|--------|
| {task description} | {phase} | {[x]/[ ]} |

### Orphan Tickets (no plan task) ({count})

| Ticket | Summary | State |
|--------|---------|-------|
| {ISSUE_ID} | {summary} | {state} |

## Summary

{2-3 sentences: overall sync health, recommended actions}
```

## Rules

- In `audit` mode: NEVER modify anything — report only
- In `to-youtrack` / `from-youtrack` mode: show a preview of all changes and get explicit user confirmation before executing
- Never create new tickets — this skill only syncs existing state
- Never delete tickets or remove plan tasks
- If a ticket maps to multiple plan tasks (or vice versa), flag it as ambiguous and skip — let the user resolve manually
- If YouTrack API fails, surface the full error and stop
- Always update `.youtrack/_index.md` after any YouTrack write operation

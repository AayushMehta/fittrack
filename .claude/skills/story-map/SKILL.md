# Story Map

You extract user stories from a PRD, group them into epics, and generate individual epic documents with full story details and acceptance criteria.

## Input

Path to PRD file: $ARGUMENTS

Example: `docs/PRD-fittrack.md`

If no arguments are provided, search for PRD files:
- Glob `docs/PRD-*.md`
- If one found, use it
- If multiple found, list them and ask the user which to use
- If none found, stop: "No PRD files found in `docs/`. Run `generate-prd` first."

## Process

### Step 1: Read the PRD

Read the PRD file completely. Extract:
- All user stories from the "User Stories" section
- All functional requirements from the "Functional Requirements" section
- Business rules and constraints
- Data model entities
- Edge cases

### Step 2: Read project context

Read these files if they exist (skip silently if missing):
- `CLAUDE.md` — project conventions
- `docs/implementation-phases.md` — existing build plan for dependency awareness

### Step 3: Identify epics

Group user stories into logical epics based on:
1. **Module/Feature area** — stories that affect the same module belong together
2. **User persona** — stories for the same persona type may form a coherent epic
3. **Data flow** — stories that share data model entities or API endpoints

Each epic should contain 3-8 user stories. If an epic has more than 8, split it.

Name each epic with a clear, descriptive title and generate a kebab-case slug.

### Step 4: Expand stories

For each user story in each epic:
1. Write the story in standard format: "As a {user type}, I want to {action}, so that {outcome}"
2. Add acceptance criteria in Given/When/Then format (2-5 criteria per story)
3. Note dependencies on other stories (within or across epics)
4. Assign priority: P0 (must-have MVP), P1 (important), P2 (nice-to-have)
5. Map to functional requirements from the PRD

### Step 5: Build dependency graph

Identify inter-epic and inter-story dependencies:
- Which epics must be completed before others can start?
- Which stories within an epic are prerequisites for others?

### Step 6: Write epic documents

Create the `docs/user-stories/` directory if it doesn't exist.

For each epic, write `docs/user-stories/{epic-slug}.md`:

```markdown
# Epic: {Epic Title}

**PRD Source**: {path to PRD}
**Module(s)**: {affected modules}
**Priority**: P0 / P1 / P2
**Dependencies**: {list of prerequisite epics, or "None"}
**Stories**: {count}

---

## Overview

{2-3 sentences describing what this epic delivers and why it matters}

---

## User Stories

### US-{ID}: {Story Title}

**As a** {user type}
**I want to** {action}
**So that** {outcome}

**Priority**: P0 / P1 / P2
**Depends on**: {US-ID(s) or "None"}
**Requirements**: {FR-ID(s) from PRD}

#### Acceptance Criteria

- **Given** {precondition}
  **When** {action}
  **Then** {expected result}

- **Given** {precondition}
  **When** {action}
  **Then** {expected result}

---

### US-{ID}: {Story Title}

...

---

## Dependency Graph

{Text description or ASCII diagram of story dependencies within this epic}

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] API endpoints implemented and tested
- [ ] UI components render correctly
- [ ] Edge cases handled per PRD
- [ ] Documentation updated
```

### Step 7: Write summary

After writing all epic documents, print a summary to the conversation:

```
# Story Map Summary

**PRD**: {path}
**Epics**: {count}
**Total Stories**: {count}
**P0 (MVP)**: {count}
**P1 (Important)**: {count}
**P2 (Nice-to-have)**: {count}

## Epic Overview

| # | Epic | Stories | Priority | Dependencies | File |
|---|------|---------|----------|-------------|------|
| 1 | {title} | {count} | P0 | None | docs/user-stories/{slug}.md |
| 2 | {title} | {count} | P0 | Epic 1 | docs/user-stories/{slug}.md |

## Suggested Implementation Order

1. {Epic title} — {reason: no dependencies, MVP critical}
2. {Epic title} — {reason: depends on #1}
3. ...

## Next Steps

- Review epic documents and adjust priorities
- Use `generate-spec` to create SPEC.md files for each module
- Use `youtrack-agent` to create tickets from these stories
```

## Rules

- Never invent stories that aren't supported by the PRD — if the PRD is thin, flag it and suggest expanding
- Every story must trace back to at least one PRD requirement or user story
- Stories must be independent enough to be implemented and tested separately
- Acceptance criteria must be testable — no vague criteria like "system should be fast"
- Epic slugs must be unique and descriptive
- If the PRD has no user stories section, derive stories from the functional requirements
- Do not create implementation specs — stories describe WHAT, not HOW

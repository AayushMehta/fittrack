# Generate PRD

You generate a complete Product Requirements Document from structured context gathered during user interrogation. This skill produces a PRD that is detailed enough for spec generation and ticket creation.

## Input

Project context as free text: $ARGUMENTS

The input should contain structured answers from user interrogation covering: vision, personas, value proposition, constraints, success metrics, scope boundaries, tech preferences, MVP features, data model, integrations, and critical user journeys.

If no arguments are provided, ask the user:
> "Provide the project context: vision, target users, core features, constraints, and success metrics."

## Process

### Step 1: Load project context

Read these files if they exist (skip silently if missing):
- `CLAUDE.md` — project conventions and stack
- `docs/product-context-snapshot.md` — current project state
- `docs/implementation-phases.md` — existing build plan

This gives awareness of what already exists so the PRD doesn't duplicate or conflict.

### Step 2: Parse the input

Extract from the user-provided context:
1. **Problem Statement** — the pain point being solved
2. **Target Personas** — who the users are
3. **Core Value Proposition** — why this vs alternatives
4. **Success Metrics** — what "working" looks like
5. **MVP Features** — the minimum feature set
6. **Constraints** — tech, timeline, budget, compliance
7. **Scope Boundaries** — what's explicitly OUT
8. **Data Model Intuition** — entities the user expects
9. **Integration Requirements** — external services
10. **Critical User Journey** — the one end-to-end flow that must work

### Step 3: Structure the PRD

Derive a project slug from the project name (lowercase, hyphens). Write the PRD to `docs/PRD-{project-slug}.md`.

### Step 4: Apply prioritization

Score each feature/requirement against 4 axes (1-5 each):
- **User Impact** — how significantly does this improve the core user job?
- **Implementation Complexity** — how many layers does this touch? (1=simple, 5=complex)
- **Strategic Fit** — does this advance the core differentiation?
- **Domain Integrity** — does this respect or strengthen the accuracy of the system?

## Output

Write the PRD file to `docs/PRD-{project-slug}.md` using this format:

```markdown
# PRD: {Project/Feature Name}

**Status**: Draft
**Author**: pilot-orc / generate-prd
**Created**: {date}
**Last Updated**: {date}

---

## Problem Statement

{2-4 sentences. What user pain does this address? What happens today without this?}

## Goals

- {Outcome 1}
- {Outcome 2}
- {Outcome 3}

## Non-Goals

- {What this explicitly does NOT do}

## Target Personas

### {Persona 1 Name}
- **Who**: {description}
- **Pain**: {what frustrates them}
- **Need**: {what they need from this product}

### {Persona 2 Name}
- ...

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-01 | {persona} | {action} | {outcome} |
| US-02 | ... | ... | ... |

## Functional Requirements

1. {Requirement — testable and unambiguous}
2. {Requirement}
3. ...

## Business Rules

{Key rules, algorithms, data constraints, immutability rules, or "None" if not applicable}

## Data Model (High Level)

{Entity names, key fields, relationships — enough for spec writers to design the schema}

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| {entity} | {fields} | {relationships} |

## API Contract (High Level)

{New or modified endpoints. Full contracts belong in SPEC.md.}

| Method | Path | Purpose |
|--------|------|---------|
| {GET/POST/...} | {/api/...} | {description} |

## Acceptance Criteria

- [ ] {Criteria 1 — testable}
- [ ] {Criteria 2}
- [ ] {Criteria 3}

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| {edge case} | {what should happen} |

## Constraints & Dependencies

- **Tech**: {stack constraints}
- **Timeline**: {deadlines if any}
- **Dependencies**: {external services, prerequisite work}
- **Compliance**: {regulatory requirements if any}

## Prioritization Score

| Feature/Requirement | User Impact | Complexity | Strategic Fit | Domain Integrity | Recommendation |
|---------------------|------------|------------|---------------|------------------|----------------|
| {feature} | {1-5} | {1-5} | {1-5} | {1-5} | defer / fast-track / phase-in |

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| {metric} | {target value} | {measurement method} |

## Open Questions

- [ ] {Question 1}
- [ ] {Question 2}
```

After writing the file, print:
> "PRD written to `docs/PRD-{slug}.md`. Review and approve before proceeding to user story mapping."

## Rules

- Never invent requirements the user didn't mention — flag gaps as Open Questions instead
- If critical information is missing (no personas, no features, no constraints), ask for it rather than guessing
- The PRD is a living document — it can be revised. Mark status as "Draft" initially
- Keep the PRD focused on WHAT and WHY, not HOW — implementation details belong in SPEC.md
- Use the user's own language for personas and features — don't over-formalize their input
- If the project has an existing CLAUDE.md, ensure the PRD doesn't conflict with established conventions

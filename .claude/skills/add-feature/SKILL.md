# Add Feature

You are a senior product engineer and technical architect for the FitTrack project. Your job is to take a feature request, analyze whether it modifies an existing module or introduces a new one, update all relevant documentation, and produce a ready-to-execute implementation plan as a new Phase in `docs/implementation-phases.md`.

## Input

Arguments: $ARGUMENTS

Format: Free-text feature description.

Examples:
- `/add-feature Add sleep quality score to daily log and factor it into confidence`
- `/add-feature Add body measurement tracking (chest, hips, thighs) to weekly metrics`
- `/add-feature Add calorie target adjustment recommendations based on fat loss rate`
- `/add-feature Add Apple Health integration for automatic step and weight import`

---

## Process

### Step 1: Understand the request

1. Parse the feature description from `$ARGUMENTS`
2. If the description is empty or too vague to act on, ask the user:
   > What feature would you like to add? Please describe what it should do and who it's for.
3. Read project context in parallel:
   - `CLAUDE.md` — tech stack, conventions, existing modules
   - `docs/implementation-phases.md` — current phases and what's built
   - `docs/database-schema.md` — current data model
   - `docs/business-rules.md` — existing business rules
   - `docs/api-routes.md` — existing API endpoints
   - `docs/features/*.md` — list of existing feature docs (Glob, don't read all yet)

Print:
> **Feature request**: {concise 1-line summary}

### Step 2: Classify the feature

Determine the feature type by checking how it relates to existing modules:

#### Check 1: Does it extend an existing module?

Search for overlap with existing modules:
- Does it add new fields/pages/workflows to an existing module (log, dashboard, progress, insights, goals, settings)?
- Does it add a sub-feature to an existing route group (e.g., `/progress/strength` under progress)?
- Does it modify existing business rules or algorithms (EMA, confidence score, hydration correction, plateau detection)?

If yes → **Enhancement** to module `{name}`.

#### Check 2: Is it a new module entirely?

- Does it introduce a new domain concept not covered by any existing module?
- Does it need its own route group, data model, and service layer?
- Would it be a new nav item in the sidebar?

If yes → **New module** `{name}`.

#### Check 3: Is it a cross-cutting concern?

- Does it affect multiple modules equally (e.g., audit logging, notifications, permissions)?
- Is it infrastructure rather than a user-facing feature?

If yes → **Cross-cutting** feature.

Print the classification:
> **Type**: Enhancement to {module} / New module: {name} / Cross-cutting: {name}

### Step 3: Ask clarifying questions

Before designing anything, identify gaps in the feature description. Think about:

1. **Users & access**: Who uses this? Which roles? Any new roles needed?
2. **Data model**: What new entities/fields are needed? Relationships to existing models?
3. **Business rules**: Any calculations, validations, status workflows, or Indian compliance (GST, TDS, FY)?
4. **UI scope**: List page? Detail page? Form? Dashboard widget? Export?
5. **Integrations**: S3 uploads? Email notifications? PDF generation? External APIs?
6. **Edge cases**: What happens on delete? Concurrent edits? Empty states?
7. **Phase scoping**: Is this small enough for a single phase, or should it be broken into multiple phases? Consider scope, dependencies, and risk.

Formulate 3-7 targeted questions that will materially change the design. Skip questions where the answer is obvious from context or conventions.

**Additionally, assess phase scoping** and present a recommendation:
```
### Phase Scoping

I recommend implementing this as:
- **Single phase** — because {reasoning: scope is contained, no complex dependencies, etc.}
OR
- **Multiple phases** — because {reasoning: too large for one phase, natural breakpoints exist, etc.}
  - Phase N: {name} — {scope}
  - Phase N+1: {name} — {scope}
```

**Format questions as a numbered list:**
```
I have a few questions to clarify the scope before designing:

1. {question} (e.g., "Should leave balances reset each financial year or calendar year?")
2. {question}
3. {question}
...

These will help me design the right data model and plan. Let me know your answers, or say "use your judgment" for any you'd like me to decide.
```

**STOP here and wait for the user's answers.** Do not proceed until the user responds.

If the user says "use your judgment" for any question, make a reasonable choice aligned with:
- Fitness domain conventions (physiological accuracy over simplicity, null = absent not zero)
- Existing project patterns (immutable raw data, derived metrics in ComputedMetric)
- Simplicity over complexity

Document your choices:
> **Decided**: {question summary} → {your choice and reasoning}

### Step 4: Design the data model

Based on the feature description + user answers:

1. **New models**: Draft Prisma model definitions (fields, types, defaults, relations, enums)
2. **Model changes**: List exact field additions/changes to existing models
3. **Indexes**: Identify fields that need indexes (foreign keys, filter columns, sort columns)
4. **Enums**: Any new enums needed

Follow existing conventions:
- `id` as `String @id @default(cuid())`
- `createdAt` / `updatedAt` timestamps (omit `updatedAt` for immutable models like `DailyLog`)
- No soft delete for log entries — they are immutable; corrections are new rows
- `Float` for body measurements, `Int` for steps/calories
- Relations with explicit `onDelete: Cascade` behavior

Print the model design:
```
### Data Model

#### New models:
{Prisma model blocks}

#### Changes to existing models:
{field additions/changes}

#### New enums:
{enum definitions}
```

### Step 5: Design the feature

Design all layers of the feature following project conventions:

#### 5a: Routes & pages

List every route with its purpose and access control:
```
| Route | Page Type | Access | Description |
|-------|-----------|--------|-------------|
| /{module} | Server → Client | ADMIN, MANAGER | List page with filters |
| /{module}/new | Server → Client | ADMIN, MANAGER | Create form |
| /{module}/[id] | Server → Client | ADMIN, MANAGER, VIEWER | Detail page |
| /{module}/[id]/edit | Server → Client | ADMIN, MANAGER | Edit form |
```

#### 5b: API endpoints

List every endpoint with method, auth, and purpose:
```
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | /api/{module} | MANAGER+ | List with pagination, filters |
| POST | /api/{module} | MANAGER+ | Create |
| GET | /api/{module}/[id] | MANAGER+ | Get by ID |
| PUT | /api/{module}/[id] | MANAGER+ | Update |
| DELETE | /api/{module}/[id] | ADMIN | Soft delete |
```

#### 5c: Zod schemas

List schemas to create with key validation rules:
- `create{Module}Schema` — required fields, refinements
- `update{Module}Schema` — partial of create, with ID
- Any specialized schemas (filters, exports, etc.)

#### 5d: Service functions

List service functions with brief descriptions:
- `list{Module}s(filters, pagination)` — with search, filter, sort
- `create{Module}(data)` — with any business logic
- `get{Module}(id)` — with relations
- `update{Module}(id, data)` — with status checks
- `delete{Module}(id)` — soft delete

#### 5e: Components

List client components to create:
- `{Module}Table` — data table with filters, pagination, action menu
- `{Module}Form` — create/edit form with React Hook Form + Zod
- `{Module}StatusBadge` — if status workflow exists
- Any specialized components (charts, widgets, etc.)

#### 5f: Business rules

Document any new business rules, calculations, or workflows:
- Status transitions (e.g., `PENDING → APPROVED → REJECTED`)
- Calculations (formulas, rounding rules)
- FY-scoped logic if applicable
- Validation rules beyond basic Zod (cross-field, async)

#### 5g: Dependencies on existing modules

List what this feature needs from existing code:
- Shared components to reuse (e.g., `FinancialYearPicker`, `CurrencyDisplay`)
- Existing services to call
- Existing schemas to reference
- Dashboard widgets to add (if any)

### Step 6: Update documentation

Update all affected docs. Apply changes using the Edit tool — don't rewrite entire files.

#### 6a: Feature doc (`docs/features/{NN}-{name}.md`)

Feature docs are **product briefs** — they describe *what* and *why*, not *how*. Required sections: Overview, Data Model, Pages, Form Fields, Business Rules, Components, API Endpoints. Optional: UI/UX Details.

**Do NOT include** User Stories, Edge Cases, Acceptance Criteria, Happy Flows, Zod Schemas, Test Scenarios, or Service Functions in feature docs — those belong in SPEC.md only.

- **Enhancement**: Update the existing feature doc with the new sub-feature section
- **New module**: Create a new feature doc following the pattern of existing ones (read `docs/features/01-daily-logging.md` as template). Number it as `{next_number}-{feature-name}.md`
- **Cross-cutting**: Create a new feature doc or add a section to the most relevant existing doc

#### 6b: Database schema doc (`docs/database-schema.md`)

- Add new model definitions
- Add field changes to existing models
- Add new enums

#### 6c: API routes doc (`docs/api-routes.md`)

- Add all new API endpoints with request/response shapes following existing format

#### 6d: Business rules doc (`docs/business-rules.md`)

- Add new business rules if any (calculations, workflows, compliance rules)

#### 6e: Folder structure doc (`docs/folder-structure.md`)

- Add new directories and files to the tree

#### 6f: CLAUDE.md

- **New module**: Add to the Modules table and Database Models list
- **Enhancement**: Update the Database Models list if new models were added
- **Both**: No changes needed to tech stack unless a new dependency is introduced

#### 6g: SPEC.md

- **Enhancement**: Update the existing SPEC.md in `src/app/(dashboard)/{module}/SPEC.md` with new sections. If no SPEC.md exists, note that `/create-spec` should be run before implementation.
- **New module**: Do NOT create a SPEC.md yet — that happens during implementation via `/create-spec`. The feature doc is sufficient at this stage.

#### 6h: Prisma schema (`prisma/schema.prisma`)

- Add new models, enums, fields, and indexes to the actual schema file
- This ensures the schema is ready for migration when implementation begins

Print what was updated:
> **Docs updated**: {list of files changed}

### Step 7: Create the implementation plan

Add a new Phase to `docs/implementation-phases.md`.

#### Determine the phase number

- Read the current phases. Find the last phase number (e.g., Phase 12).
- The new phase is `Phase {last + 1}`.
- If the feature is an enhancement to a module built in an earlier phase, the new phase still goes at the end — never modify completed phases.

#### Structure the phase

Follow the exact format of existing phases. Use the task organization that fits:

- **Flat list** (`### Tasks`) — default for most phases
- **Layers** (`### Layer N: Name`) — when tasks have strict sequential dependencies within a phase (e.g., DB before auth before UI). Include a `Depends on:` line per layer
- **Groups** (`### Group X: Name`) — when tasks are logically related but independent (e.g., dropdown fixes vs detail page actions). Each group can be implemented in any order

```markdown
## Phase {N} — {Feature Name}
**Goal**: {1-line goal}

### Tasks
- [ ] Prisma schema changes — new models/fields/enums + migration
- [ ] `src/lib/schemas/{module}.schema.ts` — Zod validation schemas
- [ ] `src/lib/services/{module}.service.ts` — service layer ({list key functions})
- [ ] API: `/api/{module}` ({list methods}) + `/api/{module}/[id]` ({list methods})
- [ ] `/{module}` list page + `{Module}Table` component
- [ ] `/{module}/new` create page + `{Module}Form` component
- [ ] `/{module}/[id]` detail page + `/{module}/[id]/edit` edit page
- [ ] {Any specialized features: exports, PDF, email, S3 upload, etc.}
- [ ] {Dashboard widget if applicable}
- [ ] Tests: schema (N unit), service (N service), API (N API), E2E (N E2E)

**Done when**: {acceptance summary — what the user can do when this phase is complete}
```

**Phase rules:**
- **Status**: `(DONE)` or omit for incomplete — no variants like `(Optional v1)`
- **Task granularity**: One line per deliverable — not one line per file or function
- **Test counts**: Always inline at the end of the relevant task line, e.g. `(12 unit, 8 service, 6 E2E)` — not as separate checkbox items
- **No implementation detail**: Do not include file line numbers, exact UI text, or step-by-step coding instructions — that belongs in SPEC.md

**Task ordering rules:**
1. Schema/migration first (everything depends on the data model)
2. Zod schemas second (services and API need them)
3. Service layer third (API routes call services)
4. API routes fourth (UI calls API)
5. Pages and components fifth (the user-facing layer)
6. Specialized features sixth (PDF, email, S3 — these are add-ons)
7. Tests last (but they'll be written TDD-style during execution, interleaved with implementation)

**For enhancements**: If the feature modifies an existing module, the tasks should reference existing files (e.g., "Update `src/lib/services/invoice.service.ts` — add `generateRecurringInvoices()`") rather than creating new ones.

#### Update the Critical Path

If the new phase has dependencies on existing phases or if future phases might depend on it, update the Critical Path diagram at the bottom of `implementation-phases.md`.

### Step 8: Summary

Print the final summary:

```
## Feature Plan Ready

### Classification
{Enhancement to {module} / New module: {name} / Cross-cutting: {name}}

### Data Model
- New models: {list or "none"}
- Modified models: {list or "none"}
- New enums: {list or "none"}

### Scope
- {N} routes / pages
- {N} API endpoints
- {N} service functions
- {N} components

### Implementation Plan
Added as **Phase {N}** in `docs/implementation-phases.md`
- {total task count} tasks
- Dependencies: {list or "none beyond existing phases"}

### Docs Updated
- {list of every file modified/created}

### Next Step
Use the `engineering-agent` to start building, or review the plan first.
```

---

## Rules

- **Ask before designing**. Never skip Step 3 (clarifying questions). A 2-minute Q&A saves hours of rework. The only exception is if the feature description is comprehensive enough that all questions have obvious answers.
- **Don't implement anything**. This skill produces documentation and a plan ONLY. No code changes except to `prisma/schema.prisma` (schema updates) and docs. Implementation happens separately via the `engineering-agent`.
- **Respect what's built**. Never modify completed phase checkboxes or rewrite existing docs sections. Add to them. The exception is fixing clear factual errors discovered during analysis.
- **Follow existing patterns**. New modules should follow the exact same structure as existing ones. Look at how clients, invoices, or expenses are structured and mirror it.
- **Keep the plan executable**. Each task in the phase should be a well-scoped unit of work. If a task is too broad (e.g., "build the entire UI"), split it into specific page/component tasks.
- **Think about the Indian business context**. This is an Indian software services company tool. Consider: financial year (April-March), GST implications, TDS, INR as base currency, Indian compliance requirements.
- **Don't add unnecessary dependencies**. If the feature can be built with the existing tech stack, don't introduce new libraries. If a new library is truly needed, call it out explicitly and add it to the tech stack docs.
- **Cross-cutting features need special care**. If the feature touches multiple modules, list every module affected and what changes in each. The implementation plan should be ordered so that the core infrastructure is built first, then module-by-module integration.
- **Schema changes are real**. Unlike other docs, changes to `prisma/schema.prisma` are actual code. Ensure they compile (`npx prisma validate`) and are consistent with the existing schema style. The migration will be run during implementation, not now.
- **Don't gold-plate**. Design the minimum viable version of the feature. If the user asked for leave management, don't add comp-off, half-day, and carry-forward unless they asked for it. Those can be future enhancements.
- **Enhancement vs. new module decision matters**. If in doubt, prefer enhancement over new module. A new module adds navigation, routing, and mental overhead. Only create a new module if the feature truly represents a distinct domain concept with its own CRUD lifecycle.

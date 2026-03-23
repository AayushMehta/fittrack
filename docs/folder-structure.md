# Folder Structure

```
fittrack/
├── .claude/
│   ├── agents/
│   │   ├── engineering-agent.md   — TDD implementation agent
│   │   ├── pm-agent.md            — Documentation & planning agent
│   │   └── test-runner-agent.md   — Test execution agent
│   └── skills/
│       ├── add-feature/SKILL.md
│       ├── create-spec/SKILL.md
│       ├── docs-sync/SKILL.md
│       ├── execute-next/SKILL.md
│       ├── fix-bug/SKILL.md
│       ├── plan-check/SKILL.md
│       ├── spec-test-case-analyzer/SKILL.md
│       ├── spec-to-test-case/SKILL.md
│       ├── test-case-to-test/SKILL.md
│       ├── test-report/SKILL.md
│       └── where-am-i/SKILL.md
├── docs/
│   ├── README.md                  — Module overview and design decisions
│   ├── tech-stack.md              — Dependencies, testing approach, setup
│   ├── folder-structure.md        — This file
│   ├── database-schema.md         — All Prisma models documented
│   ├── business-rules.md          — Algorithm specifications
│   ├── api-routes.md              — All endpoint contracts
│   ├── implementation-phases.md   — Master build plan
│   └── features/
│       ├── 01-daily-logging.md
│       ├── 02-dashboard.md
│       ├── 03-progress-intelligence.md
│       ├── 04-behavior-insights.md
│       ├── 05-goals.md
│       └── 06-settings.md
├── prisma/
│   ├── schema.prisma              — Database schema (5 models)
│   ├── migrations/                — Auto-generated migration files
│   └── seed.ts                    — Demo user seed
├── src/
│   ├── app/
│   │   ├── layout.tsx             — Root layout (font, providers)
│   │   ├── page.tsx               — Redirect to /dashboard or /login
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   ├── page.tsx       — Login page (server)
│   │   │   │   ├── SPEC.md
│   │   │   │   └── _components/
│   │   │   │       └── LoginForm.tsx
│   │   │   └── register/
│   │   │       ├── page.tsx
│   │   │       └── _components/
│   │   │           └── RegisterForm.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         — Dashboard shell (sidebar, header)
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── SPEC.md
│   │   │   │   └── _components/
│   │   │   │       ├── OverviewPanel.tsx
│   │   │   │       └── WeeklyTrendWidget.tsx
│   │   │   ├── log/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── SPEC.md
│   │   │   │   └── _components/
│   │   │   │       ├── DailyLogForm.tsx
│   │   │   │       └── LogHistory.tsx
│   │   │   ├── progress/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── SPEC.md
│   │   │   │   └── _components/
│   │   │   │       ├── WeightTrendChart.tsx
│   │   │   │       ├── BodyCompositionChart.tsx
│   │   │   │       └── WeeklyMetricForm.tsx
│   │   │   ├── insights/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── SPEC.md
│   │   │   │   └── _components/
│   │   │   │       ├── AdherenceSummary.tsx
│   │   │   │       └── AlertsList.tsx
│   │   │   ├── goals/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── SPEC.md
│   │   │   │   └── _components/
│   │   │   │       └── GoalForm.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       ├── SPEC.md
│   │   │       └── _components/
│   │   │           ├── ProfileForm.tsx
│   │   │           └── PasswordForm.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts
│   │       │   └── register/route.ts
│   │       ├── logs/
│   │       │   ├── route.ts            — GET list, POST create
│   │       │   └── [date]/route.ts     — GET by date, PUT correction
│   │       ├── weekly/
│   │       │   ├── route.ts
│   │       │   └── [weekStart]/route.ts
│   │       ├── computed/
│   │       │   ├── route.ts
│   │       │   └── [date]/route.ts
│   │       ├── goals/route.ts
│   │       ├── dashboard/
│   │       │   └── summary/route.ts
│   │       ├── progress/
│   │       │   ├── weight-trend/route.ts
│   │       │   └── body-composition/route.ts
│   │       ├── insights/route.ts
│   │       ├── settings/
│   │       │   ├── profile/route.ts
│   │       │   ├── password/route.ts
│   │       │   └── account/route.ts
│   │       └── upload/
│   │           └── progress-photo/route.ts
│   ├── components/
│   │   ├── ui/                    — shadcn/ui auto-generated components
│   │   ├── providers/
│   │   │   └── QueryProvider.tsx  — TanStack Query client (singleton)
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── MobileNav.tsx
│   ├── hooks/
│   │   ├── use-logs.ts            — useQuery/useMutation for daily logs
│   │   ├── use-computed.ts        — useQuery for computed metrics
│   │   ├── use-goals.ts
│   │   ├── use-progress.ts
│   │   ├── use-insights.ts
│   │   └── use-dialog.ts          — Dialog open/close state
│   ├── lib/
│   │   ├── env.ts                 — Zod-validated env vars
│   │   ├── prisma.ts              — Prisma client singleton
│   │   ├── auth.ts                — NextAuth full config
│   │   ├── auth.config.ts         — Edge-compatible NextAuth config
│   │   ├── api.ts                 — api() fetch helper + ApiError
│   │   ├── s3.ts                  — S3 client + presigned URL helpers
│   │   ├── algorithms/
│   │   │   ├── ema.ts             — computeEMA(entries)
│   │   │   ├── rolling-avg.ts     — computeRollingAvg(entries, window)
│   │   │   ├── confidence.ts      — computeConfidenceScore(log, goals)
│   │   │   ├── fat-loss.ts        — estimateFatLoss(logs, goals)
│   │   │   ├── hydration.ts       — correctBiaFatPct(rawFat, waterPct)
│   │   │   ├── plateau.ts         — detectPlateau(computedMetrics)
│   │   │   └── alerts.ts          — generateAlerts(metrics, goals)
│   │   ├── schemas/
│   │   │   ├── log.schema.ts
│   │   │   ├── weekly.schema.ts
│   │   │   ├── goals.schema.ts
│   │   │   └── auth.schema.ts
│   │   └── services/
│   │       ├── log.service.ts     — createLog, getLog, listLogs
│   │       ├── weekly.service.ts  — createOrUpdateWeekly, listWeekly
│   │       ├── computed.service.ts— recomputeForDate, getComputed
│   │       ├── goals.service.ts   — getGoals, upsertGoals
│   │       ├── dashboard.service.ts
│   │       ├── progress.service.ts
│   │       ├── insights.service.ts
│   │       └── user.service.ts    — createUser, getUser, deleteUser
│   ├── middleware.ts              — NextAuth route protection
│   └── test/
│       └── setup.ts              — Vitest global setup (jest-dom)
├── tests/
│   └── e2e/
│       ├── global-setup.ts       — DB reset for E2E tests
│       ├── auth.spec.ts
│       ├── log.spec.ts
│       ├── dashboard.spec.ts
│       ├── progress.spec.ts
│       ├── insights.spec.ts
│       └── goals.spec.ts
├── src/__tests__/
│   ├── lib/
│   │   ├── algorithms/
│   │   │   ├── ema.test.ts
│   │   │   ├── confidence.test.ts
│   │   │   ├── fat-loss.test.ts
│   │   │   ├── hydration.test.ts
│   │   │   └── plateau.test.ts
│   │   └── schemas/
│   │       ├── log.schema.test.ts
│   │       └── goals.schema.test.ts
│   ├── services/
│   │   ├── log.service.test.ts
│   │   ├── computed.service.test.ts
│   │   └── goals.service.test.ts
│   └── api/
│       ├── logs.test.ts
│       ├── computed.test.ts
│       └── goals.test.ts
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
└── .gitignore
```

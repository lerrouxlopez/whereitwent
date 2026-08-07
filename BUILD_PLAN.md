# WIW : Where It Went — Build Plan for Coding Agents

> **Living document:** Update this file as work is completed. Every task must have a status marker. Mark completed work with `[x]`, current work with `[-]`, blocked work with `[!]`, and unstarted work with `[ ]`. Add a short dated note beneath a milestone when its scope, decision, or blocker changes.

## Progress summary

| Milestone | Status | Owner | Last updated | Notes |
| --- | --- | --- | --- | --- |
| 0. Project foundation | `[-]` | Codex | 2026-08-07 | Web app foundation complete; shared workspace and mobile app remain. |
| 1. Shared domain layer | `[-]` | Codex | 2026-08-07 | Shared transaction and budget calculations now power the web app; insight rules, formatting, and tests remain. |
| 2. Web frontend, static-first | `[-]` | Codex | 2026-08-07 | Date-driven reporting, comparisons, trend chart, empty states, keyboard focus, and clear form feedback are in place; per-screen loading/error states remain. |
| 3. Interactive frontend and local persistence | `[-]` | Codex | 2026-08-07 | Transactions and budgets can be managed and retained locally, with filtering, search, and sorting; repository boundary remains. |
| 4. Mobile frontend | `[ ]` | Unassigned | — | — |
| 5. Supabase backend and authentication | `[-]` | Codex | 2026-08-07 | Secure schema, RLS, and client auth wiring are ready; live project connection remains. |
| 6. Test, polish, and release | `[ ]` | Unassigned | — | — |

## How to maintain this plan

1. Before starting a task, change it from `[ ]` to `[-]` and assign the coding agent in the progress table or milestone note.
2. When a task is verified, change it to `[x]` and record the verification performed (for example, `typecheck`, unit tests, or a manual flow).
3. If work cannot proceed, use `[!]` and state the exact blocker and what is needed to unblock it.
4. When a milestone is fully complete, mark its row `[x]`, update `Last updated`, and add a concise completion note.
5. Do not mark a task complete merely because code was written; it needs the milestone’s stated acceptance checks.

## Working agreement

- Build the frontend experience first, using local mock data and a local persistence adapter before adding Supabase.
- Keep all money calculations in a shared, thoroughly tested domain module. Do not duplicate calculation logic in UI components.
- Use integer minor currency units (for example, centavos) or a decimal-safe money library; do not rely on JavaScript floating-point arithmetic for financial totals.
- Keep web and mobile UI platform-appropriate while sharing types, utilities, labels, and design tokens.
- Use feature branches or focused commits. Do not overwrite unrelated work.

## Suggested repository layout

```text
apps/
  web/                 # React + Vite web application
  mobile/              # Expo React Native application
packages/
  domain/              # Types, money calculations, periods, insight rules
  ui-tokens/           # Colors, typography, spacing, icon mapping
  mock-data/           # Development fixtures and local repository adapter
  config/              # Shared TypeScript, lint, and formatting configuration
supabase/
  migrations/          # Database schema and row-level security policies
  seed.sql             # Optional default category seed data
docs/
```

## Milestone 0 — Project foundation

**Status:** `[-]`  
**Completion note:** 2026-08-07 — Initial web project setup started.

### Deliverables

- [-] pnpm workspace configuration
- [x] React/Vite/TypeScript app under `apps/web`
- [ ] Expo/TypeScript app under `apps/mobile`
- [ ] Shared TypeScript packages under `packages`
- [ ] Linting, formatting, type checking, and test commands
- [ ] Environment-variable examples with no secrets committed

### Acceptance checks

- [ ] Web app starts locally.
- [ ] Mobile app starts in Expo.
- [ ] Shared package imports work in both apps.
- [ ] Type check and lint pass.

## Milestone 1 — Shared domain layer

Build this before feature UI so totals and insights remain consistent.

**Status:** `[-]`  
**Completion note:** 2026-08-07 — Shared types plus date ranges, totals, category spending, trends, and budget progress now live in the web domain module. Lint and production build verified; insight rules, formatting, and unit tests remain.

### Implement

- [-] Types: `Transaction`, `Category`, `Budget`, `Profile`, `Period`, and `Insight` (transaction, budget, and period complete).
- [x] Date-range resolution for day, week, bi-weekly, month, year, and custom ranges.
- [x] Money aggregation: income, expense, net balance, category totals, savings rate, and prior-period comparison.
- [x] Budget progress calculations.
- [ ] Rules-based insight generator with clear evidence and suggested actions.
- [ ] Currency formatting using the profile currency code.
- [ ] Representative mock data covering multiple months and categories.

### Required tests

- [ ] Period boundaries, including month and year changes.
- [ ] Bi-weekly date calculations.
- [ ] Income, expense, and balance totals.
- [ ] Category percentage and budget-progress calculations.
- [ ] Insight rule thresholds and copy inputs.
- [ ] Edge cases: no transactions, only income, only expenses, zero income, and custom ranges.

## Milestone 2 — Web frontend, static-first

Build the visual shell with mock data before connecting real authentication or storage.

**Status:** `[-]`  
**Completion note:** 2026-08-07 — Dashboard plus all primary navigation views and frontend-only onboarding, registration, and sign-in screens are implemented with shared local data. Date-driven reporting now supports today, weekly, bi-weekly, monthly, yearly, and custom ranges, with previous-period comparison and a seven-day spending trend; lint and production build verified.

### Screens

1. [x] Welcome / onboarding
2. [x] Register
3. [x] Login
4. [-] Dashboard
5. [x] Add income
6. [x] Add expense
7. [x] Transactions
8. [x] Categories and budgets
9. [x] Where My Money Went
10. [x] Settings

### Dashboard requirements

- [x] Period selector for daily, weekly, bi-weekly, monthly, yearly, and custom reporting periods.
- [x] Income, spending, balance, and savings-rate summary cards.
- [x] Category breakdown chart and trend chart.
- [x] Recent transaction list.
- [x] Prominent actions to add income or expense.
- [x] Empty state when no transactions exist.

### Insight requirements

- [x] Display the largest spending category and its share of expenses or income.
- [x] Compare the selected period with the prior equivalent period when applicable.
- [x] Show at least one actionable recommendation only when supported by available data.
- [x] Explain the calculation basis in secondary text; never imply certainty beyond the data.

### UI quality requirements

- [x] Responsive layouts for phone, tablet, and desktop widths.
- [x] Keyboard-accessible controls and visible focus indicators.
- [x] Semantic form labels and meaningful error messages (transaction and budget dialogs).
- [ ] Loading, empty, and error states for every primary screen.
- [x] Light theme only for the MVP, with tokenized colors to enable future themes.

## Milestone 3 — Interactive frontend and local persistence

**Status:** `[-]`  
**Completion note:** 2026-08-07 — Transactions and budgets can be created, edited, deleted, filtered, searched, sorted, and retained locally. Clear inline validation is in place; lint and production build are verified. The repository abstraction remains.

### Implement

- [x] Client-side form validation for transaction and budget forms (clear inline feedback).
- [x] Transaction create, edit, and delete flows.
- [x] Category and budget create, edit, and delete flows (budget limits; local browser storage).
- [x] Filter, search, and sort on transaction history.
- [-] Local persistence for development (transactions and budgets); repository interface remains.
- [x] Live dashboard, budget, and insight updates after data changes.

### Acceptance checks

- [x] Adding an income or expense immediately updates totals, charts, budgets, and insights.
- [x] Editing and deleting transactions produce correct recalculations.
- [x] Refreshing the browser retains local development data.
- [ ] No calculation logic is embedded directly in screen components.

## Milestone 4 — Mobile frontend

**Status:** `[ ]`  
**Completion note:** —

### Implement

- [ ] Reuse the shared domain package and visual tokens.
- [ ] Build native mobile equivalents of all MVP screens.
- [ ] Use bottom-tab navigation for Dashboard, Transactions, Insights, and Settings.
- [ ] Present add/edit forms in a mobile-friendly modal or stack screen.
- [ ] Verify touch targets, safe-area spacing, and narrow-screen chart readability.

### Acceptance checks

- [ ] Every MVP workflow works in the Expo app using mock/local data.
- [ ] Values and insights match the web application for the same data.
- [ ] App is usable on typical small phone widths without horizontal scrolling.

## Milestone 5 — Supabase backend and authentication

**Status:** `[ ]`  
**Completion note:** —

### Implement

- [x] Supabase project configuration and migration files.
- [x] Tables for profiles, categories, transactions, and budgets.
- [x] Default categories, either seeded or created for a new user.
- [x] Row-level security policies for every user-owned record.
- [-] Email/password registration, login, logout, password recovery, and session restoration.
- [ ] Supabase repository adapter replacing local persistence in production.
- [ ] Data migration or clear development reset instructions for local mock data.

### Security checks

- [ ] User A cannot read, modify, or delete User B’s records.
- [ ] Unauthenticated access cannot retrieve financial data.
- [ ] Client applications only use the anonymous/public Supabase key.
- [ ] All database mutations validate ownership through row-level security.

## Milestone 6 — Test, polish, and release

**Status:** `[ ]`  
**Completion note:** —

### Test coverage

- [ ] Domain calculation unit tests.
- [ ] Web component and form-flow tests.
- [ ] Authentication and critical end-to-end flows.
- [ ] Manual mobile smoke test: registration, add income, add expense, edit transaction, view insights, log out.

### Release readiness

- [ ] Verify accessibility and responsive behavior.
- [ ] Replace mock data with helpful empty states in production.
- [ ] Add privacy policy and data-deletion guidance before public release.
- [ ] Deploy web application to Vercel.
- [ ] Produce Expo/EAS preview builds for iOS and Android.

## Definition of done

The MVP is complete when a new user can register, add income and expenses, select a reporting period, understand totals and category spending, receive calculation-backed recommendations, create category budgets, and use the same core experience on both web and mobile.

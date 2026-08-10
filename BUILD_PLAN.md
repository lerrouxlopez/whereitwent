# WIW : Where It Went — Build Plan for Coding Agents

> **Living document:** Update this file as work is completed. Every task must have a status marker. Mark completed work with `[x]`, current work with `[-]`, blocked work with `[!]`, and unstarted work with `[ ]`. Add a short dated note beneath a milestone when its scope, decision, or blocker changes.

## Progress summary

| Milestone | Status | Owner | Last updated | Notes |
| --- | --- | --- | --- | --- |
| 0. Project foundation | `[-]` | Codex | 2026-08-07 | Web app foundation complete; shared workspace and mobile app remain. |
| 1. Shared domain layer | `[x]` | Codex | 2026-08-07 | Shared domain logic, currency formatting, mock data, and five focused edge-case tests are complete and verified. |
| 2. Web frontend, static-first | `[x]` | Codex | 2026-08-07 | All static web screens, responsive layouts, loading, empty, recovery-error, and form-feedback states are complete; remaining interactivity belongs to Milestone 3. |
| 3. Interactive frontend and local persistence | `[x]` | Codex | 2026-08-07 | Local flows, persistence, live reporting, and domain separation are complete and verified by build, lint, domain, repository, and rendered-shell checks. |
| 3.5 Balance reconciliation | `[x]` | Codex | 2026-08-09 | Expected-versus-actual balance checks, persisted records, guided adjustments, and transfer-safe calculations are complete. |
| 3.6 Insight intelligence | `[x]` | Codex | 2026-08-09 | Explainable, prioritized live insight feeds and threshold coverage are complete and verified. |
| 3.7 Planned expenses and cash forecast | `[-]` | Codex | 2026-08-10 | Built and wired locally. Apply the planned-transactions migration and verify one signed-in refresh before marking complete. |
| 3.8 Accounts and transfers | `[-]` | Codex | 2026-08-10 | Built and wired locally, including cloud save/load. Apply the accounts-and-transfers migration and verify one signed-in refresh before marking complete. |
| 4. Supabase backend, live web app, and deployment | `[-]` | Codex | 2026-08-10 | WIW is live at `https://wiw.kineticapp.online` behind the shared Nginx proxy. The remaining milestone work is RLS mutation verification, complete auth recovery verification, and local-data reset guidance. |
| 5. Mobile frontend | `[ ]` | Unassigned | — | Starts after the live web app is operating successfully. |
| 6. Test, polish, and release | `[ ]` | Unassigned | — | — |

## How to maintain this plan

## Audit correction — 2026-08-07

This audit replaces earlier optimistic completion markers. A checked item means complete user-facing behavior exists and was verified, not just that part of a screen was built.

- **Categories:** custom categories can now be created, renamed, and deleted locally; they appear in expense and budget forms. Deletion is prevented while a category has transactions.
- **Settings:** name, currency, and preferred period are saved and restored locally. Currency display was user-verified after a refresh.
- **Insights/goals:** generated cards replace the legacy static cards. Savings goals show available-balance progress and restore locally; insight calculations follow the selected dashboard period.
- **Dashboard:** shortcuts navigate and the budget check-in uses live budget progress.
- **Supabase:** schema, RLS SQL, client boundary, and auth UI are scaffolds only; no project is connected, no migration has run, and no RLS check was performed.
- **Tests:** seven focused domain and repository tests cover period boundaries, bi-weekly ranges, totals, insight thresholds, and local persistence. Two rendered-shell/UI-wiring checks protect the current web shell; dedicated browser interaction tests remain Milestone 6 coverage work.

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
- [-] Linting, build, and test commands — `npm run lint` and `npm test` pass; formatting and a separate type-check command remain.
- [ ] Environment-variable examples with no secrets committed

### Acceptance checks

- [ ] Web app starts locally.
- [ ] Mobile app starts in Expo.
- [ ] Shared package imports work in both apps.
- [ ] Type check and lint pass.

## Milestone 1 — Shared domain layer

Build this before feature UI so totals and insights remain consistent.

**Status:** `[x]`  
**Completion note:** 2026-08-07 — Shared types, date ranges, totals, trends, budget progress, currency formatting, insights, and multi-month mock data are complete. Currency refresh was user-verified; five domain tests plus lint and production build pass.

### Implement

- [x] Types: `Transaction`, `Category`, `Budget`, `Profile`, `Period`, and `Insight` — defined in the web domain module; extraction to `packages/domain` remains Milestone 0 work.
- [x] Date-range resolution for day, week, bi-weekly, month, year, and custom ranges.
- [x] Money aggregation: income, expense, net balance, category totals, savings rate, and prior-period comparison.
- [x] Budget progress calculations.
- [x] Rules-based insight generator with clear evidence and suggested actions — generated cards render; legacy static cards must be removed or reconciled.
- [x] Currency formatting using the profile currency code — user verified saved currency remains applied after refresh.
- [x] Representative mock data covering multiple months and categories.

### Required tests

- [x] Period boundaries, including month and year changes.
- [x] Bi-weekly date calculations.
- [x] Income, expense, and balance totals.
- [x] Category percentage and budget-progress calculations.
- [x] Insight rule thresholds and copy inputs.
- [x] Edge cases: no transactions, only income, only expenses, zero income, and custom ranges.

## Milestone 2 — Web frontend, static-first

Build the visual shell with mock data before connecting real authentication or storage.

**Status:** `[x]`  
**Completion note:** 2026-08-07 — All static web screens are complete with responsive layouts, accessible focus indicators, loading, empty, inline form-error, and local-data recovery-error states. Lint and production build verified. Interactive category management, goal progress, and restored preferences remain Milestone 3 work.

### Screens

1. [x] Welcome / onboarding
2. [x] Register
3. [x] Login
4. [x] Dashboard — static dashboard, flexible period reporting, summaries, charts, shortcuts, loading, and empty state are complete; live budget check-in and goal progress remain Milestone 3 work.
5. [x] Add income
6. [x] Add expense
7. [x] Transactions
8. [x] Categories and budgets — static screen and budget UI are complete; category CRUD remains Milestone 3 work.
9. [x] Where My Money Went — calculation-backed insight screen is complete; goal persistence/progress remains Milestone 3 work.
10. [x] Settings — static preferences screen is complete; restore and saved-period behavior remain Milestone 3 work.

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
- [x] Loading, empty, and error states for every primary screen — global restore loader, data-view empty states, inline form errors, auth notices, and local-data recovery notice.
- [x] Light theme only for the MVP, with tokenized colors to enable future themes.

## Milestone 3 — Interactive frontend and local persistence

**Status:** `[x]`  
**Completion note:** 2026-08-07 — Transactions, budgets, categories, preferences, and savings goals are retained locally through a validated repository boundary. Categories and savings goals use accessible in-app forms with inline validation. Dashboard budgets and insights update from the selected period; financial aggregation is kept in the domain module. `npm test` runs seven domain/repository tests and two rendered-shell/UI-wiring checks, and `npm run lint` passes.

### Implement

- [x] Client-side form validation for transaction and budget forms (clear inline feedback).
- [x] Transaction create, edit, and delete flows.
- [x] Category and budget create, edit, and delete flows — budget limits and local category create, rename, and delete flows work. Categories and savings goals use in-app forms with inline feedback. Verified 2026-08-07 with build, lint, and test checks.
- [x] Filter, search, and sort on transaction history.
- [x] Local persistence for development (transactions, budgets, categories, profile, and savings goal) through a validated local repository boundary. Verified 2026-08-07 with lint, domain tests, and production build.
- [x] Live dashboard, budget, and insight updates after data changes — dashboard budget progress and generated insights use the selected period and current local data. Verified 2026-08-07 with domain and rendered-shell checks.

### Acceptance checks

- [x] Adding an income or expense immediately updates totals, charts, budget-screen progress, and period-scoped generated insights through shared state and domain calculations. Verified 2026-08-07 with build, lint, and calculation tests.
- [x] Editing and deleting transactions produce correct recalculations.
- [x] Refreshing the browser retains transactions, budgets, categories, settings, and savings goals through the local repository. Verified 2026-08-07 with repository persistence and malformed-data recovery tests.
- [x] No financial calculation logic is embedded directly in screen components; totals, percentages, budget summaries, and comparisons are produced by the shared domain module. Verified 2026-08-07 with domain tests and code review.

## Milestone 3.5 — Balance reconciliation

**Status:** `[x]`  
**Completion note:** 2026-08-09 — Added starting balance, period-scoped expected-versus-actual balance checks, persisted reconciliation records, and a guided untracked-spending adjustment. Transfer records are excluded from income, spending, and reconciliation math. Eight domain/repository tests and lint pass.

### Implement

- [x] Shared reconciliation calculations: expected balance, actual balance, difference, and period-bound checks.
- [x] Dashboard balance-check card for daily, weekly, bi-weekly, monthly, yearly, and custom periods.
- [x] Actual-balance form with clear expected, actual, and unaccounted-difference feedback.
- [x] Guided resolution: add a missed income, add a missed expense, or explicitly record an `Untracked spending` adjustment.
- [x] Transfers between the user’s own accounts that do not affect spending totals.
- [x] Local persistence for balance checks and temporary reconciliation state.

### Acceptance checks

- [x] A balance check accurately identifies the difference between recorded and actual money for every supported period.
- [x] Adding a missed transaction or an untracked-spending adjustment updates the difference and relevant reports.
- [x] An untracked-spending adjustment is visible and distinguishable from normal categorized spending.
- [x] Transfers do not change income, spending, or the reconciliation difference.
- [x] Reconciliation records survive a browser refresh.

## Milestone 3.6 — Insight intelligence

**Status:** `[x]`  
**Completion note:** 2026-08-09 — Added ranked, explainable live insights for reconciliation gaps, budget pace, category changes, repeated expenses, category concentration, and savings-goal pace. Dashboard surfaces the top three; the insight feed carries its calculation basis. `npm test` (10 domain/repository tests plus 2 rendered-shell tests), production build, and lint pass.

### Implement

- [x] Extend shared insight types with priority, evidence, period, calculation basis, and estimated effect.
- [x] Rank current insights as `needs attention`, `watch`, or `on track`, returning the three highest-priority items for the dashboard.
- [x] Detect balance-check discrepancies and make unaccounted money the top insight when relevant.
- [x] Forecast budget-overrun risk from current spending pace and time remaining in the selected period.
- [x] Detect meaningful category changes against the equivalent previous period.
- [x] Identify likely recurring spending using repeated transactions and summarize subscription totals without claiming certainty.
- [x] Forecast whether the current pace reaches the savings goal, and surface positive progress when supported by the data.
- [x] Replace generic dashboard insight copy with the prioritized live insight feed; keep the full, period-scoped feed in Where My Money Went.

### Acceptance checks

- [x] Every insight includes a plain-language conclusion, its evidence, a relevant reporting period, and an action when one is warranted.
- [x] The dashboard shows at most three current, prioritized insights and changes when the selected period or transactions change.
- [x] Insights do not make recommendations when there is insufficient evidence.
- [x] Tests cover each insight threshold, priority ordering, no-data behavior, recurring-spend detection, and budget/savings forecasts.

## Milestone 3.7 — Planned expenses and cash forecast

**Status:** `[-]`

### Implement

- [x] Create planned expenses with description, amount, category, and expected date.
- [x] Keep planned expenses out of actual totals, budgets, and balance reconciliation while showing a forecast balance after plans.
- [x] List planned entries distinctly and allow a user to mark one paid, converting it to a posted expense.
- [-] Persist planned status through local storage and Supabase with a migration; the migration must be applied and verified on the live project.

### Acceptance checks

- [ ] A planned expense does not change current spending, actual balance, category totals, or budget progress.
- [ ] Forecast totals include planned expenses and update after creation, editing, deletion, or marking paid.
- [ ] Marking a planned expense paid converts it to a normal expense and updates actual reports.
- [ ] Planned entries persist after refresh and across signed-in sessions.

## Milestone 3.8 — Accounts and transfers

**Status:** `[-]`

### Implement

- [x] Create cash, bank, and credit-card accounts with opening balance; credit cards also carry a credit limit.
- [x] Let income and expenses be assigned to an account.
- [x] Create transfers with a source and destination account; transfer amounts do not count as income or expense.
- [x] Calculate cash balances, card amount owed, and available credit from assigned transactions and transfers.
- [x] Provide a dedicated Accounts screen and a credit-card payment shortcut.
- [-] Persist accounts and transaction account references locally and in Supabase with row-level security; the migration must be applied and verified on the live project.

### Acceptance checks

- [ ] A card purchase increases the card amount owed and is counted once as spending.
- [ ] A credit-card payment reduces cash and card debt, restores available credit, and does not change income/spending totals.
- [ ] Transfers preserve net worth and remain distinct from planned entries.
- [ ] Accounts and transfers persist across refresh and signed-in sessions.

## Milestone 4 — Supabase backend, live web app, and VPS deployment

**Status:** `[-]`  
**Completion note:** 2026-08-10 — GitHub Actions passes tests and lint, publishes `ghcr.io/lerrouxlopez/wiw:c3632fbf88e9fbf02abdc580e1ccea318edc7ff6`, and deploys it to the VPS. WIW is live at `https://wiw.kineticapp.online` with a successful HTTPS HTTP 200 smoke check. It uses the existing host-level Nginx service as a dedicated Certbot-managed proxy to the WIW container on `127.0.0.1:8014`; existing sites and containers remain untouched. The prior-range calculation was also corrected and verified with `npm test` in both local and UTC timezones plus lint.

### Implement

- [x] Supabase project configuration and migration files — a live project is configured locally with public client settings; all checked-in migrations have been applied and table endpoints were verified on 2026-08-09.
- [x] Tables for profiles, categories, transactions, budgets, and balance checks — all five live table endpoints were verified on 2026-08-09; transfer, balance-check, and savings-goal schema support is included.
- [x] Default categories, either seeded or created for a new user.
- [-] Row-level security policies for every user-owned record — existing policies cover the current tables; add balance-check policies with its migration.
- [-] Email/password registration, login, logout, password recovery, and session restoration.
- [x] Supabase repository adapter replacing local persistence in production — signed-in user verified transactions, categories, budgets, balance checks, settings, savings goal, and refresh persistence on 2026-08-09.
- [ ] Data migration or clear development reset instructions for local mock data.
- [x] Production web container with public, non-secret Supabase build configuration — image built locally and served HTTP 200 on 2026-08-09.
- [x] GitHub Actions workflow to build, test, publish to GHCR, and deploy the chosen image tag to the VPS — verified 2026-08-10: tests, lint, and GHCR publishing succeeded; deployment reached the VPS.
- [x] VPS deployment configuration and rollback/runbook documentation — deployed successfully on 2026-08-10 through the existing Nginx service; WIW binds only to `127.0.0.1:8014` and is live over HTTPS without changing unrelated services.

### Security checks

- [ ] User A cannot read, modify, or delete User B’s records.
- [x] Unauthenticated access cannot retrieve financial data — anonymous API requests returned no user rows during live schema verification on 2026-08-09.
- [ ] Client applications only use the anonymous/public Supabase key.
- [ ] All database mutations validate ownership through row-level security.

### Deployment acceptance checks

- [x] A production image builds locally and starts with the required public configuration — verified on 2026-08-09 with a temporary Docker container returning HTTP 200.
- [x] GitHub Actions publishes the image to GHCR only after tests and lint pass — verified 2026-08-10 with image tag `ghcr.io/lerrouxlopez/wiw:c3632fbf88e9fbf02abdc580e1ccea318edc7ff6`.
- [x] The VPS runs the published web image behind HTTPS and persists configuration outside the image — verified 2026-08-10 with an HTTPS HTTP 200 response from `https://wiw.kineticapp.online`.
- [x] A documented rollback can return the VPS to the prior image version — documented in `docs/VPS_DEPLOYMENT.md` with versioned GHCR image tags.

## Milestone 5 — Mobile frontend

**Status:** `[ ]`  
**Completion note:** —

### Implement

- [ ] Reuse the shared domain package and visual tokens.
- [ ] Build native mobile equivalents of all MVP screens.
- [ ] Use bottom-tab navigation for Dashboard, Transactions, Insights, and Settings.
- [ ] Present add/edit forms in a mobile-friendly modal or stack screen.
- [ ] Verify touch targets, safe-area spacing, and narrow-screen chart readability.

### Acceptance checks

- [ ] Every MVP workflow works in the Expo app using the same live backend.
- [ ] Values and insights match the web application for the same data.
- [ ] App is usable on typical small phone widths without horizontal scrolling.

## Milestone 6 — Test, polish, and release

**Status:** `[ ]`  
**Completion note:** —

### Test coverage

- [x] Domain calculation unit tests — five focused tests pass through the standard test command as of 2026-08-07.
- [ ] Web component and form-flow tests.
- [ ] Authentication and critical end-to-end flows.
- [ ] Manual mobile smoke test: registration, add income, add expense, edit transaction, view insights, log out.

### Release readiness

- [ ] Verify accessibility and responsive behavior.
- [ ] Replace mock data with helpful empty states in production.
- [ ] Add privacy policy and data-deletion guidance before public release.
- [ ] Complete post-deployment smoke testing for the VPS-hosted web app.
- [ ] Produce Expo/EAS preview builds for iOS and Android.

## Definition of done

The MVP is complete when a new user can register, add income and expenses, select a reporting period, understand totals and category spending, receive calculation-backed recommendations, create category budgets, and use the same core experience on both web and mobile.

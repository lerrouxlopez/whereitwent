# WIW : Where It Went — Product Plan

## Purpose

Build a light, approachable personal budgeting app for web and mobile. Users record income and expenses, review their financial position over flexible time ranges, and receive clear explanations of where their money went and practical ways to save more.

## Product principles

- Make recording money movements fast and low-friction.
- Show useful conclusions, not only raw totals.
- Support daily, weekly, bi-weekly, monthly, yearly, and custom reporting periods.
- Keep financial data private and isolated per account.
- Use a calm, light visual design that is easy to scan.

## Primary users

Individuals who want a simple, detailed understanding of their spending without using a complex accounting tool.

## Core user journey

1. A user creates an account or logs in.
2. They choose a currency, preferred reporting period, and optionally a starting balance.
3. They record income and expense transactions.
4. They compare the expected balance with the money they actually have and resolve any difference.
5. They review totals, category breakdowns, and recent transaction activity.
6. They open **Where My Money Went** to see spending explanations, period comparisons, and saving opportunities.
7. They set category budgets and use feedback to adjust their spending.

## MVP features

### Authentication and preferences

- Email/password registration and login
- Password reset
- Persistent session
- Currency and preferred reporting-period settings

### Money tracking

- Create, edit, and delete income entries
- Create, edit, and delete expense entries
- Amount, date, category, notes, and payment method fields
- Default categories and custom user categories
- Transaction history with filtering and search
- Balance checks for daily, weekly, bi-weekly, monthly, yearly, and custom periods
- Clear reconciliation of expected versus actual balance, with a guided way to add a missed income or expense
- An explicit, clearly labelled untracked-spending adjustment when the difference cannot yet be identified
- Transfers tracked separately so moving money between a user’s own accounts does not count as spending

### Budget reporting

- Total income, total expenses, remaining balance, and savings rate
- Daily, weekly, bi-weekly, monthly, yearly, and custom date ranges
- Spending by category
- Income-versus-expense trends
- Current period versus previous equivalent period

### Where My Money Went

Explainable, rules-based insights written in plain language. Each insight must state what happened, the supporting amount and period, a practical next step, and an estimated effect where possible. Insights should be prioritized as **needs attention**, **watch**, or **on track** rather than presented as an undifferentiated list.

The insight engine should detect unaccounted money from a balance check, budget forecast risk based on current pace and days remaining, meaningful category changes against an equivalent previous period, recurring spending and subscription totals, category concentration, savings-goal forecast, and positive progress.

Examples:

- "Dining represented 18% of your income this month."
- "Transport spending is 22% higher than last month."
- "Reducing delivery purchases by two per week could save approximately ₱X each month."

The dashboard shows the three highest-priority current insights, while **Where My Money Went** provides the full, period-scoped feed and calculation basis.

### Budgets

- Category-level budget limits
- Budget progress display
- Warnings when spending approaches or exceeds a limit

## Future features

- Recurring transactions
- CSV bank-statement import
- Savings goals and sinking funds
- Notifications and budget alerts
- Data export
- Shared household budgets

## Design direction

- Light, calm interface with an off-white page background and white cards
- Teal or blue as the main accent color
- Green for income and red for spending or overspending states
- Large, readable balances and simple charts
- Mobile bottom navigation and a desktop sidebar or top navigation
- Accessible contrast, typography, focus states, and form labels

## Technical architecture

| Area | Technology | Notes |
| --- | --- | --- |
| Web | React, Vite, TypeScript | Responsive browser application |
| Mobile | React Native, Expo, TypeScript | iOS and Android application |
| Workspace | pnpm monorepo | Shared code and coordinated tooling |
| Shared code | TypeScript packages | Domain types, calculations, formatting, insight rules, and design tokens |
| Web styling | Tailwind CSS | Light, consistent responsive styling |
| Mobile styling | NativeWind | Shared visual language for React Native |
| Web charts | Recharts | Category and trend visualizations |
| Mobile charts | SVG-based chart package | Native category and trend visualizations |
| Backend | Supabase | Auth, PostgreSQL database, and API |
| Authentication | Supabase Auth | Email/password and password recovery |
| Web deployment | Docker, GitHub Container Registry, GitHub Actions, VPS | Build and publish a container image, then deploy the web app to the VPS |
| Mobile delivery | Expo/EAS | Preview and release builds after the live web app is established |

## Data model

### profiles

- `id` — matches authenticated user ID
- `currency_code`
- `preferred_period`
- `starting_balance`
- `created_at`, `updated_at`

### categories

- `id`
- `user_id` — nullable for system default categories
- `name`
- `icon`
- `color`
- `kind` — `income` or `expense`

### transactions

- `id`
- `user_id`
- `category_id`
- `type` — `income`, `expense`, or `transfer`
- `amount`
- `transaction_date`
- `payment_method`
- `notes`
- `created_at`, `updated_at`

### budgets

- `id`
- `user_id`
- `category_id`
- `amount_limit`
- `period` — weekly, bi-weekly, monthly, or yearly
- `created_at`, `updated_at`

### balance_checks

- `id`
- `user_id`
- `period_start`, `period_end`
- `expected_balance` — calculated from starting balance, income, expenses, and transfers
- `actual_balance` — amount the user says they currently have
- `difference` — amount still unaccounted for
- `created_at`, `updated_at`

## Security requirements

- Store financial data in the authenticated user’s scope only.
- Apply Supabase row-level security to every user-owned table.
- Never expose database service credentials in web or mobile clients.
- Validate amounts, dates, transaction types, and ownership on the server-backed data layer.

## Success criteria for the MVP

- A user can register, sign in, and only access their own data.
- A user can record income and expenses and see correct totals for every supported period.
- A user can identify their highest spending categories at a glance.
- The insight screen provides clear, calculation-backed spending guidance.
- The interface works well on desktop browsers and iOS/Android screen sizes.

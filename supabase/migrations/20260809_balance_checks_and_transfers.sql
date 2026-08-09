-- Bring the live schema in line with WIW balance reconciliation and transfers.
-- Run after 20260807_initial_schema.sql. This migration is safe for the first live project.

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check check (type in ('income', 'expense', 'transfer'));

alter table public.profiles
  add column if not exists savings_goal_minor bigint check (savings_goal_minor is null or savings_goal_minor > 0);

create table if not exists public.balance_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  expected_balance_minor bigint not null,
  actual_balance_minor bigint not null,
  difference_minor bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (user_id, period_start, period_end)
);

create index if not exists balance_checks_user_period_idx
  on public.balance_checks(user_id, period_start desc, period_end desc);

drop trigger if exists balance_checks_set_updated_at on public.balance_checks;
create trigger balance_checks_set_updated_at
  before update on public.balance_checks
  for each row execute function public.set_updated_at();

alter table public.balance_checks enable row level security;

drop policy if exists "Users can manage their balance checks" on public.balance_checks;
create policy "Users can manage their balance checks"
  on public.balance_checks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

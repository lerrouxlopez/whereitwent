-- Allow balance reconciliation per account as well as the existing overall check.
-- Run after 20260810_accounts_and_transfers.sql.

alter table public.balance_checks
  add column if not exists account_id uuid references public.accounts(id) on delete cascade;

alter table public.balance_checks
  drop constraint if exists balance_checks_user_id_period_start_period_end_key;

create unique index if not exists balance_checks_user_period_global_idx
  on public.balance_checks(user_id, period_start, period_end)
  where account_id is null;

create unique index if not exists balance_checks_user_period_account_idx
  on public.balance_checks(user_id, account_id, period_start, period_end)
  where account_id is not null;

create index if not exists balance_checks_user_account_idx
  on public.balance_checks(user_id, account_id, created_at desc);

-- An account balance check must reference an account owned by the same user.
create or replace function public.validate_balance_check_account_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_id is not null and not exists (
    select 1 from public.accounts
    where id = new.account_id and user_id = new.user_id
  ) then
    raise exception 'Balance-check account must belong to the balance-check owner'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists balance_checks_validate_account_ownership on public.balance_checks;
create trigger balance_checks_validate_account_ownership
  before insert or update on public.balance_checks
  for each row execute function public.validate_balance_check_account_ownership();

comment on column public.balance_checks.account_id is
  'Optional account reconciled by this check; null means an overall cash-flow balance check.';

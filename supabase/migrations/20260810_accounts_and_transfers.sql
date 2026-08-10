-- Accounts and transfers for WIW.
--
-- Run after the existing initial, balance-check, and planned-transaction
-- migrations. This keeps money moving between accounts out of income and
-- expense totals, while retaining a clear account-level balance.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kind text not null check (kind in ('cash', 'bank', 'credit_card')),
  opening_balance_minor bigint not null default 0 check (opening_balance_minor >= 0),
  credit_limit_minor bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (credit_limit_minor is null or credit_limit_minor >= 0),
  check (
    (kind = 'credit_card' and credit_limit_minor is not null)
    or (kind in ('cash', 'bank') and credit_limit_minor is null)
  ),
  unique (user_id, name)
);

create index if not exists accounts_user_id_idx
  on public.accounts(user_id);

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- An income or expense can be assigned to one account. A transfer moves
-- between two accounts and must not be counted as income or spending.
alter table public.transactions
  add column if not exists account_id uuid references public.accounts(id) on delete set null,
  add column if not exists from_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists to_account_id uuid references public.accounts(id) on delete set null;

create index if not exists transactions_user_account_date_idx
  on public.transactions(user_id, account_id, transaction_date desc);

create index if not exists transactions_user_from_account_date_idx
  on public.transactions(user_id, from_account_id, transaction_date desc);

create index if not exists transactions_user_to_account_date_idx
  on public.transactions(user_id, to_account_id, transaction_date desc);

-- Keep the three account references scoped to the transaction owner. The
-- function is security definer so it can validate ownership reliably under RLS.
create or replace function public.validate_transaction_account_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referenced_account_user_id uuid;
begin
  foreach referenced_account_user_id in array array[
    new.account_id,
    new.from_account_id,
    new.to_account_id
  ]
  loop
    if referenced_account_user_id is not null and not exists (
      select 1
      from public.accounts
      where id = referenced_account_user_id
        and user_id = new.user_id
    ) then
      raise exception 'Transaction accounts must belong to the transaction owner'
        using errcode = '23514';
    end if;
  end loop;

  -- Older WIW transfers may predate account support and therefore have no
  -- account references. Keep those historical rows valid. Once either side
  -- is supplied, require a complete, two-account transfer.
  if new.type = 'transfer'
    and (new.from_account_id is not null or new.to_account_id is not null) then
    if new.from_account_id is null or new.to_account_id is null then
      raise exception 'Transfers require a source and destination account'
        using errcode = '23514';
    end if;

    if new.from_account_id = new.to_account_id then
      raise exception 'A transfer must use two different accounts'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_validate_account_ownership on public.transactions;
create trigger transactions_validate_account_ownership
  before insert or update on public.transactions
  for each row execute function public.validate_transaction_account_ownership();

alter table public.accounts enable row level security;

drop policy if exists "Users can manage their accounts" on public.accounts;
create policy "Users can manage their accounts"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.accounts is
  'User-owned cash, bank, and credit-card accounts used for account balances and transfers.';
comment on column public.transactions.account_id is
  'Account used for an income or expense transaction.';
comment on column public.transactions.from_account_id is
  'Source account for a transfer.';
comment on column public.transactions.to_account_id is
  'Destination account for a transfer.';

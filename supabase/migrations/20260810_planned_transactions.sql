alter table public.transactions
  add column if not exists status text not null default 'posted'
  check (status in ('posted', 'planned'));

comment on column public.transactions.status is 'Posted transactions affect actual spending; planned transactions are forecast-only until marked paid.';

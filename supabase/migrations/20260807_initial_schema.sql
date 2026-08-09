create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency_code text not null default 'PHP' check (char_length(currency_code) = 3),
  preferred_period text not null default 'monthly' check (preferred_period in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  starting_balance_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  icon text not null default '•',
  color text not null default '#7895e6',
  kind text not null check (kind in ('income', 'expense')),
  created_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount_minor bigint not null check (amount_minor > 0),
  transaction_date date not null default current_date,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index categories_user_kind_idx on public.categories(user_id, kind);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount_limit_minor bigint not null check (amount_limit_minor > 0),
  period text not null check (period in ('weekly', 'biweekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  insert into public.categories (user_id, name, icon, color, kind)
  values
    (new.id, 'Salary', '✦', '#7895e6', 'income'),
    (new.id, 'Food & groceries', '🛒', '#9f8be0', 'expense'),
    (new.id, 'Dining out', '☕', '#ff8a7b', 'expense'),
    (new.id, 'Transport', '◈', '#436fce', 'expense'),
    (new.id, 'Bills & utilities', '⚡', '#7895e6', 'expense'),
    (new.id, 'Shopping', '●', '#9f8be0', 'expense'),
    (new.id, 'Other', '•', '#728096', 'expense');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy "Users can view their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage their categories" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their transactions" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their budgets" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

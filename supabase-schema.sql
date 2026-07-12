-- Subman! — run once in Supabase SQL Editor (§5.2)

-- CATEGORIES
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '📦',
  color text not null default 'magenta',   -- purple | orange | teal | green | blue | magenta
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- EXPENSES
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'THB' check (currency in ('THB','USD')),
  type text not null check (type in ('fixed','subscription')),
  category_id uuid references categories(id) on delete set null,
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly','quarterly','yearly')),
  next_renewal_date date not null,
  is_trial boolean not null default false,
  trial_end_date date,
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TRANSACTIONS: auto-logged payment history. Powers the Reports 12-month trend
-- and all "actuals" numbers. Rows are inserted by the app (§6.5), never by hand.
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_id uuid references expenses(id) on delete cascade,
  name text not null,                 -- snapshot of expense name at time of charge
  category_id uuid,
  paid_date date not null,
  amount numeric(12,2) not null,
  currency text not null,
  amount_thb numeric(12,2) not null,  -- converted with the rate current at logging time
  created_at timestamptz not null default now()
);

-- SETTINGS: exactly one row per user
create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_currency text not null default 'THB' check (primary_currency in ('THB','USD')),
  usd_to_thb_rate numeric(8,2) not null default 36.50,
  remind_renewal_enabled boolean not null default true,
  remind_before_days int not null default 7,
  remind_trial_enabled boolean not null default false,
  trial_remind_days int not null default 3,
  line_notify_enabled boolean not null default false
);

-- Migration for existing projects (run once if the settings table predates the
-- line_notify_enabled column above):
--   alter table settings
--     add column if not exists line_notify_enabled boolean not null default false;

-- RLS
alter table categories   enable row level security;
alter table expenses     enable row level security;
alter table transactions enable row level security;
alter table settings     enable row level security;

create policy "own categories"   on categories   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own expenses"     on expenses     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings"     on settings     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

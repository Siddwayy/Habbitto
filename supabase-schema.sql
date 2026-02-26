-- Run this in your Supabase SQL Editor to create the tables.

-- Habits table (per user)
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text not null default 'book',
  default_focus_minutes int,
  created_at timestamptz default now()
);

-- Sessions table: one row per saved focus session (for galaxy map)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  date text not null,
  focus_minutes int not null default 0,
  created_at timestamptz default now()
);

alter table sessions enable row level security;
create policy "Users can manage own sessions"
  on sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Completions table (per user, per habit)
create table if not exists completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  date text not null,
  focus_minutes int default 0
);

-- Row Level Security (RLS)
alter table habits enable row level security;
alter table completions enable row level security;

-- Policies: users can only access their own data
create policy "Users can manage own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own completions"
  on completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

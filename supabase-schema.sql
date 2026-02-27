-- Run this in your Supabase SQL Editor to create the tables.

-- Note: User profile fields (full_name, nickname) are stored in auth.users
-- via user_metadata (raw_user_meta_data), updated via supabase.auth.updateUser().
-- No extra table needed.

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

-- Completions table (per user, per habit, per day – one row per habit per date)
create table if not exists completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  date text not null,
  focus_minutes int default 0
);

-- Prevent duplicate rows: one completion per (user, habit, date)
create unique index if not exists completions_user_habit_date_unique
  on completions(user_id, habit_id, date);

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

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

-- Sessions table: one row per saved focus session
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  date text not null,
  focus_minutes int not null default 0,
  mode text default 'focus' check (mode in ('focus', 'stopwatch')),
  created_at timestamptz default now()
);

-- Migration for existing DBs: add mode column
alter table sessions add column if not exists mode text default 'focus';

alter table sessions enable row level security;
drop policy if exists "Users can manage own sessions" on sessions;
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

-- Policies: users can only access their own data (drop first so script is re-runnable)
drop policy if exists "Users can manage own habits" on habits;
create policy "Users can manage own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own completions" on completions;
create policy "Users can manage own completions"
  on completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Leaderboard: returns ranked users with total focus time (for logged-in users)
create or replace function public.get_leaderboard(limit_count int default 50)
returns table (user_id uuid, display_name text, total_minutes bigint, rank int)
language sql
security definer
set search_path = public, auth
as $$
  with totals as (
    select c.user_id, sum(c.focus_minutes) as total
    from public.completions c
    group by c.user_id
  ),
  ranked as (
    select t.user_id, t.total,
      coalesce(
        nullif(trim(u.raw_user_meta_data->>'nickname'), ''),
        nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
        nullif(trim(u.raw_user_meta_data->>'name'), ''),
        split_part(u.email, '@', 1),
        'Anonymous'
      ) as display_name
    from totals t
    left join auth.users u on u.id = t.user_id
    order by t.total desc
    limit limit_count
  )
  select r.user_id, r.display_name, r.total::bigint, row_number() over (order by r.total desc)::int as rank
  from ranked r;
$$;

-- Allow authenticated users to call the leaderboard
grant execute on function public.get_leaderboard(int) to authenticated;

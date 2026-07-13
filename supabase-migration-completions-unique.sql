-- Run this in Supabase SQL Editor if your completions table already exists.
-- Adds unique constraint to prevent duplicate (user_id, habit_id, date) rows.

-- Optional: dedupe existing duplicates first (keeps row with highest focus_minutes)
-- DELETE FROM completions a
-- USING completions b
-- WHERE a.id < b.id
--   AND a.user_id = b.user_id
--   AND a.habit_id = b.habit_id
--   AND a.date = b.date;

create unique index if not exists completions_user_habit_date_unique
  on completions(user_id, habit_id, date);

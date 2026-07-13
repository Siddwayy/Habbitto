# Habbitto

Habit tracker with a built-in focus timer and stopwatch.

Live demo: https://habbitto.vercel.app

<img width="1200" alt="Habbitto" src="https://github.com/user-attachments/assets/a0e92371-20bb-4a6c-ada0-5c4635be19b5" />

## What it does

Habbitto helps you build habits by tying them to focused work blocks. Instead of only checking “done,” you track **how long** you spent on each habit. A focus timer (30–90 min or custom) and a stopwatch both log time to the habit you choose.

| Feature | Description |
| --- | --- |
| Auth | Email/password sign-up and login via Supabase |
| Habit tracker | Custom habits, icon picker, edit/delete |
| Focus timer | Preset durations (30, 45, 60, 75, 90 min), custom duration, break phase |
| Stopwatch | Free-form timing with save to habit |
| Time & streaks | Time spent per habit, daily completions, streak counter |
| Leaderboard | Rankings by total focus minutes |
| Local mode | Works without Supabase using localStorage |

## Tech stack

Vanilla JS + Vite on the frontend, Supabase (Auth + Postgres with RLS) on the backend. CSS only, no UI framework.

## Run locally

```bash
npm install
npm run dev
```

Optional — add a `.env` file for Supabase (copy from `.env.example`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Run `supabase-schema.sql` in your Supabase SQL editor to set up the database.

## Deploy

Hosted on Vercel. Set the same `VITE_*` env vars in the project settings, then redeploy.

## Screenshots

Auth

<img width="443" alt="Auth" src="https://github.com/user-attachments/assets/53925c69-cccb-4e83-8849-5b1494a89754" />

Habits

<img width="775" alt="Habits" src="https://github.com/user-attachments/assets/bb02cac3-0ce0-4901-bdc1-b474c2a7d623" />

Focus timer

<img width="770" alt="Timer" src="https://github.com/user-attachments/assets/c4b2e1fc-a45f-4c1d-ae92-224bce184c3c" />

Stopwatch

<img width="786" alt="Stopwatch" src="https://github.com/user-attachments/assets/6462663e-6072-48ca-8371-1ca997a164cd" />

Streaks

<img width="780" alt="Streaks" src="https://github.com/user-attachments/assets/51b2bf1d-2178-40e1-bbb5-23914158df55" />

## Notes

- Supabase RLS keeps each user's habits/sessions private
- Timer state persists if you close the tab mid-session
- Space to start/pause, 1–5 for duration presets when idle

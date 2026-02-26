# Habbitto

A habit tracker with an integrated focus (Pomodoro-style) timer and stopwatch. Add habits, track time spent, and use the focus timer or stopwatch linked to any habit.

## Features

- **Login & Sign up**: Email/password auth via Supabase
- **Habit tracker**: Custom habits with icon picker, Time spent per habit
- **Focus timer**: Preset durations (30, 45, 60, 75, 90 min), circular progress, Save with confirmation
- **Stopwatch**: Free-flow timing with Save
- **Per-user data**: All habits and completions stored in Supabase per user

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, run the contents of `supabase-schema.sql` to create tables and RLS policies
3. In **Project Settings → API**, copy the Project URL and anon public key

### 2. Environment

Copy `.env.example` to `.env` and add your keys:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Email auth

In Supabase **Authentication → Providers → Email**, enable Email and configure:
- Turn off "Confirm email" if you want sign up without verification (dev only)

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173).

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host. Ensure the hosting URL is added to Supabase **Authentication → URL Configuration** (Site URL and Redirect URLs).

## Without Supabase

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set, the app runs in local-only mode using localStorage (no login, data stays on device).

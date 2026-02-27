
# Habbitto

**Habit tracker with a built-in focus timer and stopwatch. Build habits one session at a time.**-https://habbitto.netlify.app/

---
<img width="1044" height="1243" alt="image" src="https://github.com/user-attachments/assets/bbf48555-4844-4218-8455-464bf0673385" />


## Overview

Habbitto helps you build habits by tying them to focused work blocks. Instead of only checking “done,” you track **how long** you spent on each habit. A focus timer (30–90 min or custom) and a stopwatch both log time to the habit you choose. Habits can be marked done for the day, and the app shows streaks and total time spent so progress is visible and motivating.

---

## Features

- **Auth** — Email/password sign up and login via Supabase
- **Habit tracker** — Custom habits, icon picker, edit/delete, mark done for the day
- **Focus timer** — Preset durations (30, 45, 60, 75, 90 min), custom duration, circular progress, optional break phase
- **Stopwatch** — Free-form timing with save to habit
- **Time & streaks** — Time spent per habit, daily completions, consecutive-day streak counter
- **Session-end flow** — Congratulatory dialog and optional sound when the focus timer finishes
- **Guide** — In-app “How it works” with simple steps and icons
- **Shortcuts** — Space to start/pause/resume; keys 1–5 for duration presets when idle
- **Offline / local mode** — Works without Supabase using localStorage

---

## Tech stack

| Layer      | Tech |
|-----------|------|
| Frontend  | Vanilla JavaScript (ES modules), Vite |
| Backend   | Supabase (Auth, Postgres with RLS) |
| Storage   | Supabase when signed in; localStorage when not |
| Styling   | CSS (custom properties, no framework) |

---

## Design & UX

- Dark-themed UI with clear typography and accent color
- Circular progress ring for the timer with a subtle pulse when running
- Full-width Start button, habit picker with streak badges, empty state (“Create your first habit”)
- Modals for account, guide, and session-end; tab title shows remaining time when the timer is running

---

## Links

- **Live site:** [https://dancing-churros-0d7f45.netlify.app/]
- **Source code:** This repository

---

## Challenges & learnings

- **Supabase RLS** — Policies so users only see and edit their own habits, completions, and sessions
- **Timer state** — Keeping phase (idle / work / break / stopwatch), intervals, and UI in sync; handling tab visibility for re-renders
- **Sound and dialog** — Looping completion sound until the user dismisses the session-end dialog, then cleaning up audio and state

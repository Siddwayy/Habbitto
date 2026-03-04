
# Habbitto

Habit tracker with a built-in focus timer and stopwatch. 


Use in Browser-https://habbitto.netlify.app/


---
<img width="2171" height="1249" alt="image" src="https://github.com/user-attachments/assets/a0e92371-20bb-4a6c-ada0-5c4635be19b5" />





## Overview

Habbitto helps you build habits by tying them to focused work blocks. Instead of only checking “done,” you track **how long** you spent on each habit. A focus timer (30–90 min or custom) and a stopwatch both log time to the habit you choose. Habits can be marked done for the day, and the app shows streaks and total time spent so progress is visible and motivating.

---

| Feature              | Description                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Auth                 | Email/password sign-up and login via Supabase                                                       |
| Habit Tracker        | Custom habits, icon picker, edit/delete                                                             |
| Focus Timer          | Preset durations (30, 45, 60, 75, 90 min), custom duration, circular progress, optional break phase |
| Stopwatch            | Free-form timing with save to habit                                                                 |
| Time & Streaks       | Time spent per habit, daily completions, consecutive-day streak counter                             |
| Session-End Flow     | Congratulatory dialog and optional sound when the focus timer finishes                              |
| Guide                | In-app “How it works” section with simple steps and icons                                           |
| Shortcuts            | Space to start/pause/resume; keys 1–5 for duration presets when idle                                |
| Offline / Local Mode | Works without Supabase using localStorage                                                           |

- **Auth** — Email/password sign up and login via Supabase
<img width="443" height="505" alt="image" src="https://github.com/user-attachments/assets/53925c69-cccb-4e83-8849-5b1494a89754" />


- **Habits** — Custom habits, icon picker, edit/delete,
<img width="775" height="583" alt="image" src="https://github.com/user-attachments/assets/bb02cac3-0ce0-4901-bdc1-b474c2a7d623" />


- **Focus timer** — Preset durations (30, 45, 60, 75, 90 min), custom duration, circular progress, optional break phase
<img width="770" height="732" alt="image" src="https://github.com/user-attachments/assets/c4b2e1fc-a45f-4c1d-ae92-224bce184c3c" />


- **Stopwatch** — Free-form timing with save to habit
<img width="786" height="743" alt="image" src="https://github.com/user-attachments/assets/6462663e-6072-48ca-8371-1ca997a164cd" />


- **Time & streaks** — Time spent per habit, daily completions, consecutive-day streak counter
<img width="780" height="243" alt="image" src="https://github.com/user-attachments/assets/51b2bf1d-2178-40e1-bbb5-23914158df55" />

<img width="773" height="302" alt="image" src="https://github.com/user-attachments/assets/6d554eef-eeff-4649-9a1d-87fbbc78012d" />
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

<div align="center">

# Habbitto

A habit tracker with a built-in focus timer and stopwatch.

![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Build-646cff?style=flat-square&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=flat-square&logo=vercel&logoColor=white)

[Live Demo](https://habbitto.vercel.app/)

</div>

---

<p align="center">
  <img width="1200" alt="Habbitto — focus timer and habit tracker overview" src="https://github.com/user-attachments/assets/a0e92371-20bb-4a6c-ada0-5c4635be19b5" />
</p>

## Overview

**Habbitto** is a habit tracker built around focused work sessions. Instead of only marking habits as complete, it lets users track the actual time they spend on each habit using a built-in focus timer and stopwatch.

The app supports both **cloud mode** with Supabase and **local mode** with `localStorage`, so it can still function fully even without backend setup.

## Features

| Feature | Description |
|---|---|
| **Authentication** | Email/password sign-up and login with Supabase Auth |
| **Habit management** | Create, edit, delete, and personalize habits with icons |
| **Focus timer** | Preset durations, custom lengths, circular progress, and optional breaks |
| **Stopwatch mode** | Free-form timing for flexible habit sessions |
| **Time tracking** | Log total focus minutes per habit |
| **Daily completions** | Track whether habits were completed each day |
| **Streak system** | Measure consistency across consecutive days |
| **Session recovery** | Restore progress after browser or tab close |
| **Leaderboard** | Compare total focus minutes with other users |
| **Keyboard shortcuts** | Quick controls for timer actions and preset durations |
| **Theme support** | Light and dark mode |
| **Offline support** | Full local functionality without Supabase |

## Screenshots

### Authentication
<p>
  <img width="523" height="630" alt="image" src="https://github.com/user-attachments/assets/804fae13-65ad-41ec-a69b-5544819c61e1" />

</p>

### Habits
<p>
  <img width="983" height="647" alt="image" src="https://github.com/user-attachments/assets/1f391100-7a17-4a66-ba81-79bbd75a6879" />

</p>

### Focus Timer
<p>
  <img width="778" height="833" alt="image" src="https://github.com/user-attachments/assets/b6a6557f-6a91-44a1-9bc2-383ca8ce6b00" />

</p>

### Stopwatch
<p>
  <img width="775" height="748" alt="image" src="https://github.com/user-attachments/assets/bbf02ce9-f85f-41b4-b5e5-e21fd0196507" />

</p>

### Stats and Streaks
<p>
  <img width="777" height="296" alt="Streaks" src="https://github.com/user-attachments/assets/9dfa1f73-7d7d-4628-bfab-77f8e49045aa" />

</p>

## Why This Project Stands Out

- Tracks **time invested**, not just completion.
- Works in both **online** and **offline** modes.
- Combines habit tracking, focus timing, stopwatch sessions, and streak tracking in one product.
- Built with **vanilla JavaScript**, making the app easier to understand without framework abstraction.
- Demonstrates practical full-stack features like authentication, persistence, recovery, and secure data access.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES modules), Vite |
| **Backend** | Supabase |
| **Database** | PostgreSQL via Supabase |
| **Authentication** | Supabase Auth |
| **Security** | Row Level Security (RLS) |
| **Storage** | Supabase or `localStorage` |
| **Styling** | Custom CSS with CSS variables |
| **Deployment** | Vercel |

## Architecture

```text
index.html
  └── src/index.js          # boot + error UI
        └── src/app.js      # auth gate, app shell, keyboard shortcuts
              ├── habits.js / sessions.js      # habit and session logic
              ├── timer.js                     # timer state machine
              ├── storage.js                   # localStorage data layer
              ├── storage-supabase.js          # Supabase data layer
              ├── auth.js                      # auth helpers
              ├── session-persistence.js       # recovery after close/crash
              └── *-ui.js                      # UI rendering modules
```

### Key Design Decisions

- **Dual storage architecture** — the same product logic works with Supabase or local storage.
- **Timer state machine** — clearly separates `idle`, `work`, `break`, and `stopwatch` phases.
- **Session persistence** — helps prevent lost progress after accidental browser close.
- **RLS security model** — protects each user's habits, sessions, and completions.
- **Leaderboard RPC** — uses a Postgres function for ranked community stats.

## Project Structure

```text
habbitto/
├── public/                 # Static assets
├── src/
│   ├── index.js            # Entry point
│   ├── app.js              # App bootstrap
│   ├── habits.js           # Habit CRUD, streaks, completions
│   ├── sessions.js         # Session history
│   ├── timer.js            # Focus timer and stopwatch logic
│   ├── session-persistence.js
│   ├── session-end-sound.js
│   ├── auth.js / auth-ui.js
│   ├── storage.js          # localStorage layer
│   ├── storage-supabase.js # Supabase queries and leaderboard
│   ├── supabase.js         # Supabase client setup
│   ├── ui.js               # Main focus UI
│   ├── settings-ui.js
│   ├── guide-ui.js
│   ├── leaderboard-ui.js
│   ├── theme.js
│   └── icons.js
├── styles/main.css
├── supabase-schema.sql
├── supabase-migration-completions-unique.sql
├── vercel.json
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Optional: a Supabase project for authentication and cloud sync

### Installation

```bash
git clone https://github.com/Siddwayy/Habbitto.git
cd Habbitto
npm install
npm run dev
```

The app runs locally at `http://localhost:5173`.

## Environment Setup

If Supabase environment variables are not added, Habbitto runs in **local-only mode**.

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL Editor.
3. Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```

4. Restart the dev server after saving the `.env` file.

> Never expose the `service_role` key in frontend code.

## Build and Preview

```bash
npm run build
npm run preview
```

## Deployment

### Vercel

1. Import the repository into [Vercel](https://vercel.com/new).
2. Add these environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy the project.
4. In Supabase, open **Authentication → URL Configuration** and set your Vercel domain as the Site URL and redirect URL.

`vercel.json` includes SPA rewrites for client-side navigation.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Start, pause, or resume the timer |
| `1`–`5` | Set preset durations: 30 / 45 / 60 / 75 / 90 minutes |

## What I Learned

Building Habbitto helped strengthen practical skills in:

- Designing secure multi-user applications with Supabase RLS
- Managing timer state and keeping the UI synchronized
- Supporting offline-first behavior with local storage fallback
- Persisting in-progress sessions across interruptions
- Structuring a complete app with vanilla JavaScript modules

## Future Improvements

- Habit history charts and richer analytics
- Weekly and monthly summaries
- Reminder notifications
- More mobile UX improvements
- Expanded leaderboard and social features

## License

Private / personal portfolio project unless otherwise noted.

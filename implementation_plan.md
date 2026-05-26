# Schedule Crusher — Full-Stack Implementation Plan

A smart academic planner (ISM) that creates adaptive study schedules using weighted scheduling, fatigue prediction, and a premium animated UI.

## User Review Required

> [!IMPORTANT]
> **MySQL Required**: This project uses MySQL only. You must have a running MySQL server before starting the backend.

> [!IMPORTANT]
> **React Bits Installation**: React Bits components are **copy-paste** components (not a single npm package). I'll use the `jsrepo` CLI to pull them: `npx jsrepo add github/DavidHDev/react-bits/src/ts-tailwind/...`. Each component may have its own dependencies (e.g., `framer-motion`, `ogl`, `gsap`). I'll install all required deps automatically.

> [!WARNING]
> **Tailwind CSS Version**: React Bits' TypeScript+Tailwind variants target **Tailwind CSS v3**. I'll use Tailwind v3 for maximum compatibility.

## Open Questions

> [!IMPORTANT]
> **MySQL Connection**: What are your MySQL credentials / database name? Default plan assumes:
> - Host: `localhost`, Port: `3306`
> - Database: `schedule_crusher`
> - User: `root`, Password: (empty or via `.env`)

> [!IMPORTANT]
> **Python Environment**: Should I use a `venv` virtual environment, or install globally? I'll default to creating a `venv`.

---

## Project Structure

```
c:\Users\akyas\Desktop\Desktop\project\python\
├── README.md
├── LICENSE
├── .gitignore
│
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── run.py                      # Flask entry point
│   ├── config.py                   # Configuration (DB URI, JWT secret, etc.)
│   └── app/
│       ├── __init__.py             # Flask app factory
│       ├── extensions.py           # SQLAlchemy, JWT, CORS init
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py             # User model
│       │   ├── schedule.py         # Schedule model
│       │   ├── unit.py             # Unit model
│       │   └── task.py             # Task model
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── auth.py             # /api/auth (login, signup, me)
│       │   ├── schedules.py        # /api/schedules (CRUD)
│       │   ├── tasks.py            # /api/tasks/:id/complete
│       │   ├── generator.py        # /api/generate-schedule
│       │   └── settings.py         # /api/settings
│       ├── services/
│       │   ├── __init__.py
│       │   ├── scheduler.py        # Core weighted scheduling algorithm
│       │   └── fatigue.py          # ML fatigue prediction (scikit-learn)
│       └── utils/
│           ├── __init__.py
│           └── decorators.py       # Auth helpers
│
├── frontend/
│   ├── .env
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                 # Router + layout
│       ├── index.css               # Global styles + dark mode
│       ├── vite-env.d.ts
│       ├── api/
│       │   └── client.ts           # Axios instance + interceptors
│       ├── context/
│       │   ├── AuthContext.tsx      # JWT auth state
│       │   └── ThemeContext.tsx     # Dark/light mode
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useSchedules.ts
│       ├── components/
│       │   ├── reactbits/          # Copied React Bits components
│       │   │   ├── Aurora/
│       │   │   ├── BlurText/
│       │   │   ├── DecryptedText/
│       │   │   ├── ShinyText/
│       │   │   ├── SplitText/
│       │   │   ├── TiltedCard/
│       │   │   ├── SpotlightCard/
│       │   │   ├── AnimatedList/
│       │   │   ├── Dock/
│       │   │   ├── SplashCursor/
│       │   │   └── ... (others)
│       │   ├── layout/
│       │   │   ├── Navbar.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── DockNav.tsx     # Bottom navigation (Dock)
│       │   ├── schedule/
│       │   │   ├── ScheduleCard.tsx
│       │   │   ├── TaskRow.tsx
│       │   │   ├── UnitForm.tsx
│       │   │   └── DailyView.tsx
│       │   ├── dashboard/
│       │   │   ├── BentoGrid.tsx
│       │   │   └── StatsCard.tsx
│       │   └── common/
│       │       ├── LoadingSpinner.tsx
│       │       ├── ProtectedRoute.tsx
│       │       └── Toast.tsx
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── SignupPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── PlannerPage.tsx
│       │   ├── ScheduleViewPage.tsx
│       │   └── SettingsPage.tsx
│       ├── data/
│       │   └── annaUniversity.ts   # AU subject presets
│       └── utils/
│           ├── pdfExport.ts        # jsPDF schedule export
│           └── formatters.ts       # Date/time helpers
```

---

## Proposed Changes

### Phase 1: Project Setup, Database, Backend Auth, Frontend Routing

---

#### Backend Setup

##### [NEW] [requirements.txt](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/requirements.txt)
Flask, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-CORS, PyMySQL, python-dotenv, bcrypt, scikit-learn, numpy

##### [NEW] [.env](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/.env)
Database URI, JWT secret key, Flask config

##### [NEW] [config.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/config.py)
Config class loading from `.env` — `SQLALCHEMY_DATABASE_URI`, `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRES`

##### [NEW] [run.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/run.py)
Flask entry point calling `create_app()`, runs on port 5000

##### [NEW] [app/__init__.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/__init__.py)
Flask app factory: register extensions (SQLAlchemy, JWT, CORS), register blueprints, create DB tables

##### [NEW] [app/extensions.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/extensions.py)
Singleton instances of `SQLAlchemy`, `JWTManager`, `CORS`

##### [NEW] [app/models/user.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/models/user.py)
User model: `id`, `username`, `email`, `password_hash`, `created_at`. Methods: `set_password()`, `check_password()` using bcrypt

##### [NEW] [app/models/schedule.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/models/schedule.py)
Schedule model: `id`, `user_id` (FK), `title`, `start_date`, `end_date`, `status` (active/archived), relationships to units

##### [NEW] [app/models/unit.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/models/unit.py)
Unit model: `id`, `schedule_id` (FK), `name`, `importance` (1-10), `total_points` (1-70), `order_index`

##### [NEW] [app/models/task.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/models/task.py)
Task model: `id`, `unit_id` (FK), `point_index`, `description`, `scheduled_time` (datetime), `planned_duration` (minutes), `actual_completion_time` (datetime, nullable), `status` (pending/completed)

##### [NEW] [app/routes/auth.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/routes/auth.py)
Blueprint `/api/auth`:
- `POST /signup` — validate, hash password, create user, return JWT
- `POST /login` — verify credentials, return JWT
- `GET /me` — return current user (JWT required)

---

#### Frontend Setup

##### [NEW] Vite + React + TypeScript project
Created via `npx create-vite@latest ./ --template react-ts`

##### [NEW] Tailwind CSS v3
Installed via `npm install -D tailwindcss@3 postcss autoprefixer` + `npx tailwindcss init -p`

##### [NEW] React Bits Components
Installed via `npx jsrepo add github/DavidHDev/react-bits/src/ts-tailwind/Backgrounds/Aurora` (and similar for each component). Key dependencies: `framer-motion`, `ogl`, `gsap`

##### [NEW] [src/index.css](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/index.css)
- Tailwind directives
- CSS custom properties for dark/light theme
- Global dark mode styles (dark by default)
- Premium typography (Inter / Outfit from Google Fonts)
- Custom scrollbar styling
- Glassmorphism utility classes

##### [NEW] [src/App.tsx](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/App.tsx)
- React Router v6 with routes: `/login`, `/signup`, `/dashboard`, `/planner`, `/schedule/:id`, `/settings`
- `ProtectedRoute` wrapper for authenticated routes
- `AuthProvider` context wrapping the app
- SplashCursor wrapping entire app for premium feel

##### [NEW] [src/api/client.ts](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/api/client.ts)
Axios instance pointing to `http://localhost:5000/api`, with JWT token interceptor from localStorage

##### [NEW] [src/context/AuthContext.tsx](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/context/AuthContext.tsx)
Auth context with `login()`, `signup()`, `logout()`, `user` state, JWT storage in localStorage

##### [NEW] [src/pages/LoginPage.tsx](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/pages/LoginPage.tsx)
- Aurora background component
- Centered glassmorphism login card
- BlurText for "Schedule Crusher" title
- DecryptedText for subtitle
- Form with email/password
- Animated transitions

##### [NEW] [src/pages/SignupPage.tsx](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/pages/SignupPage.tsx)
- Same premium styling as Login
- Additional username field
- Password confirmation
- Link to login

---

### Phase 2: Core Schedule Generation Algorithm + API

---

#### Backend Algorithm

##### [NEW] [app/services/scheduler.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/services/scheduler.py)
**Core ISM Scheduling Algorithm**:
1. Calculate `TotalAvailableMinutes` from date range × work hours per day
2. Calculate `WeightedTotal = Σ(Importance_i × BreakPoints_i)` for all units
3. Calculate `TimePerPoint = TotalAvailableMinutes / WeightedTotal`
4. For each unit: `AllocatedMinutes = Importance × BreakPoints × TimePerPoint`
5. **Slot Assignment**:
   - Sort units by importance (descending)
   - Assign high-importance units to morning slots (8AM-12PM)
   - Medium-importance to afternoon (1PM-5PM)
   - Lower importance to evening (6PM-9PM)
6. **Break Logic**: Insert 15-min break after every 90 min of work, 30-min lunch break
7. Generate individual Task records with `scheduled_time` and `planned_duration`

##### [NEW] [app/services/fatigue.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/services/fatigue.py)
**ML Fatigue Prediction** (scikit-learn LinearRegression):
- Features: `hour_of_day`, `tasks_completed_today`, `avg_overrun_ratio`, `day_of_week`
- Target: `fatigue_factor` (ratio of actual_time / planned_time)
- Trains on completed tasks for each user
- Used to adjust future `planned_duration` values

##### [NEW] [app/routes/generator.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/routes/generator.py)
- `POST /api/generate-schedule` — accepts title, date range, units array; runs scheduler; returns created schedule with all tasks
- `POST /api/schedules/:id/regenerate` — re-generates with fatigue adjustments

##### [NEW] [app/routes/schedules.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/routes/schedules.py)
- `GET /api/schedules` — list user's schedules
- `GET /api/schedules/:id` — get schedule with units and tasks
- `DELETE /api/schedules/:id` — delete schedule
- `PATCH /api/schedules/:id` — update status (archive)

##### [NEW] [app/routes/tasks.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/routes/tasks.py)
- `POST /api/tasks/:id/complete` — mark task complete with actual timestamp, record actual duration for ML training

##### [NEW] [app/routes/settings.py](file:///c:/Users/akyas/Desktop/Desktop/project/python/backend/app/routes/settings.py)
- `GET/PUT /api/settings` — work hours (start/end), break frequency, AI aggressiveness level

---

### Phase 3: Dashboard + Interactive Task Table

---

#### Frontend Pages

##### [NEW] [src/pages/DashboardPage.tsx](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/pages/DashboardPage.tsx)
- **Bento Grid layout** (CSS Grid) for schedule cards
- Active schedules shown as TiltedCard/SpotlightCard components
- Each card shows: title, date range, completion %, unit count
- Stats row: total tasks, completion rate, streak
- Quick-create button with glowing border
- Archived schedules section (collapsible)

##### [NEW] [src/pages/PlannerPage.tsx](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/pages/PlannerPage.tsx)
- **Step 1**: Title + Date range picker (start/end exam dates)
- **Step 2**: 5 Unit cards, each with:
  - Name input
  - Importance slider (1-10) with color gradient
  - Break Points input (1-70) 
  - Anna University preset dropdown (auto-fills 5 units)
- **Step 3**: Preview weighted distribution (bar chart)
- **Generate Schedule** button → calls API → redirects to ScheduleView
- SplitText animations on section headers
- ShinyText on CTA buttons

##### [NEW] [src/pages/ScheduleViewPage.tsx](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/pages/ScheduleViewPage.tsx)
- Daily view with date navigation (prev/next day)
- Task list using AnimatedList component
- Each task row: unit color badge, description, scheduled time, duration, checkbox
- Check-off triggers API call → records actual completion time
- Progress bar per unit (completed/total break points)
- Overall schedule completion ring
- PDF Export button (jsPDF)

##### [NEW] [src/pages/SettingsPage.tsx](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/pages/SettingsPage.tsx)
- Work hours: start/end time pickers
- Break rules: frequency slider (every X minutes), duration
- AI aggressiveness: Low/Medium/High toggle
- Dark mode toggle (though dark by default)
- Account section: change password, logout

##### [NEW] [src/data/annaUniversity.ts](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/data/annaUniversity.ts)
Anna University subject presets:
```typescript
{
  "CS3451": { name: "Introduction to Operating Systems", units: ["Introduction", "Process Management", "Memory Management", "Storage Management", "Virtual Machines & Mobile OS"] },
  "CS3452": { name: "Theory of Computation", units: ["Automata & RE", "Regular Expressions", "CFG & PDA", "Normal Forms & TM", "Undecidability"] },
  // ... 15+ subjects
}
```

---

### Phase 4: Polish, Animations, PDF Export, Final UI

---

#### React Bits Integration (Across All Pages)

| Component | Where Used |
|-----------|-----------|
| **Aurora** | Login/Signup backgrounds |
| **BlurText** | Page titles, "Schedule Crusher" brand |
| **DecryptedText** | Subtitles, loading states |
| **ShinyText** | CTA buttons, important labels |
| **SplitText** | Section headers with scroll animation |
| **TiltedCard** | Schedule cards on dashboard |
| **SpotlightCard** | Stats cards, unit cards |
| **AnimatedList** | Task lists in schedule view |
| **Dock** | Bottom navigation bar (mobile + desktop) |
| **SplashCursor** | App-wide cursor effect |

#### PDF Export

##### [NEW] [src/utils/pdfExport.ts](file:///c:/Users/akyas/Desktop/Desktop/project/python/frontend/src/utils/pdfExport.ts)
Uses jsPDF to generate a professional schedule PDF:
- Header with "Schedule Crusher" branding
- Schedule title, date range
- Daily task tables with unit colors
- Completion statistics
- Formatted for A4 printing

#### Final Polish
- Smooth page transitions (framer-motion AnimatePresence)
- Loading skeletons with shimmer effects
- Error boundaries with DecryptedText error messages
- Toast notifications for task completion
- Responsive design: mobile-first with Dock navigation on small screens
- Hover micro-animations on all interactive elements

---

## Verification Plan

### Automated Tests
```bash
# Backend
cd backend
python -m pytest tests/ -v

# Frontend
cd frontend
npm run build   # Verify no TypeScript/build errors
```

### Manual Verification
1. **Start MySQL** → Create `schedule_crusher` database
2. **Start Backend**: `cd backend && python run.py` (port 5000)
3. **Start Frontend**: `cd frontend && npm run dev` (port 5173)
4. **Test Auth Flow**: Signup → Login → JWT persisted → Protected routes redirect
5. **Test Schedule Creation**: Create schedule with 5 units → Verify weighted time distribution
6. **Test Task Completion**: Mark tasks complete → Verify actual time recorded
7. **Test PDF Export**: Download generated PDF → Verify formatting
8. **Test Responsive**: Resize browser → Dock nav appears on mobile
9. **Test Dark Mode**: Verify all pages render correctly in dark theme

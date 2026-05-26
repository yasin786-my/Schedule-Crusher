# Schedule Crusher

**ISM (Importance-based Schedule Management)** — A smart academic planner that creates adaptive study schedules by giving more time and priority to high-importance units based on actual user performance.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10+-green.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5-blue.svg)

---

## Features

- **Weighted Scheduling** — Allocates more time and better slots to high-importance units
- **Granular Tracking** — Break each unit into 1–70 sub-tasks (Break Points) for fine-grained progress
- **Fatigue Prediction** — ML-powered (scikit-learn) fatigue adjustment based on your study patterns
- **Anna University Presets** — Quick-select subject codes (e.g., CS3451) to auto-populate 5 units
- **Premium UI** — Dark-mode interface with animated React Bits components
- **PDF Export** — Download your schedule as a printable PDF
- **Adaptive Learning** — Regenerate schedules with fatigue-adjusted durations from completed tasks

## How the Algorithm Works

```
TimePerPoint = TotalAvailableMinutes / Σ(Importance × BreakPoints)
```

1. High-importance units get **morning time slots** (peak focus hours)
2. Each unit's total time = `Importance × BreakPoints × TimePerPoint`
3. Automatic **break insertion** (15 min after every 90 min of work)
4. **Fatigue factor** adjusts future durations based on historical completion data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v3 |
| UI Components | [React Bits](https://reactbits.dev) (Aurora, TiltedCard, BlurText, etc.) |
| Backend | Flask + Flask-JWT-Extended + SQLAlchemy |
| Database | MySQL |
| ML | scikit-learn (Linear Regression for fatigue prediction) |
| PDF | jsPDF |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+
- **MySQL 8+** (running locally or on a remote server)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/schedule-crusher.git
cd schedule-crusher
```

### 2. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python run.py
```

Backend runs at `http://localhost:5000`

### 3. Configure MySQL

**Step 1 — Create the database** (run in MySQL Workbench or `mysql` CLI):

```sql
CREATE DATABASE schedule_crusher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE schedule_crusher_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

If you use a dedicated user instead of `root`:

```sql
CREATE USER 'schedule_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON schedule_crusher.* TO 'schedule_user'@'localhost';
GRANT ALL PRIVILEGES ON schedule_crusher_test.* TO 'schedule_user'@'localhost';
FLUSH PRIVILEGES;
```

**Step 2 — Create your `.env` file:**

```bash
# from the backend/ directory
copy .env.example .env        # Windows
cp .env.example .env          # macOS/Linux
```

**Step 3 — Edit `backend/.env`** with your MySQL credentials:

```env
FLASK_ENV=development
SECRET_KEY=your-flask-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=schedule_crusher
MYSQL_TEST_DATABASE=schedule_crusher_test
```

**Step 4 — Start the backend** (tables are created automatically on first run):

```bash
python run.py
```

If the connection fails, check that:
- MySQL service is running
- The database `schedule_crusher` exists
- Username and password in `.env` are correct

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

## Project Structure

```
schedule-crusher/
├── backend/
│   ├── app/
│   │   ├── models/       # SQLAlchemy models
│   │   ├── routes/       # REST API endpoints
│   │   ├── services/     # Scheduling algorithm + ML
│   │   └── utils/        # Helpers
│   ├── tests/            # pytest test suite
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components + React Bits
│   │   ├── pages/        # Route pages
│   │   ├── context/      # Auth provider
│   │   ├── api/          # Axios client
│   │   ├── data/         # Anna University presets
│   │   └── utils/        # PDF export, formatters
│   └── package.json
│
├── README.md
├── LICENSE
└── .gitignore
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/schedules` | List schedules |
| GET | `/api/schedules/:id` | Get schedule with units & tasks |
| DELETE | `/api/schedules/:id` | Delete schedule |
| PATCH | `/api/schedules/:id` | Update schedule status |
| POST | `/api/generate-schedule` | Generate new schedule |
| POST | `/api/schedules/:id/regenerate` | Regenerate with fatigue adjustments |
| POST | `/api/tasks/:id/complete` | Mark task complete |
| POST | `/api/tasks/:id/uncomplete` | Revert task to pending |
| GET/PUT | `/api/settings` | User settings |

## Testing

Create the test database in MySQL (once):

```sql
CREATE DATABASE schedule_crusher_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
# Backend (uses MYSQL_TEST_DATABASE from .env)
cd backend
pytest tests/ -v

# Frontend build check
cd frontend
npm run build
```

> **Note:** This project uses **MySQL only**. SQLite is not supported.

## Environment Variables

All backend config is loaded from `backend/.env` via `config.py`. If `.env` is missing, sensible defaults are used for local development.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MYSQL_USER` | No | `root` | MySQL username |
| `MYSQL_PASSWORD` | No | (empty) | MySQL password |
| `MYSQL_HOST` | No | `localhost` | MySQL host |
| `MYSQL_PORT` | No | `3306` | MySQL port |
| `MYSQL_DATABASE` | No | `schedule_crusher` | Application database name |
| `MYSQL_TEST_DATABASE` | No | `schedule_crusher_test` | Test database for pytest |
| `DATABASE_URL` | No | built from above | Full SQLAlchemy URI (overrides `MYSQL_*`) |
| `JWT_SECRET_KEY` | No | dev default | Secret used to sign JWT tokens |
| `SECRET_KEY` | No | dev default | Flask session secret |
| `FLASK_ENV` | No | `development` | Set to `production` in prod |

**Example `.env`:**

```env
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=schedule_crusher
MYSQL_TEST_DATABASE=schedule_crusher_test
```

**Or use a single connection string:**

```env
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/schedule_crusher
```

Tables (`users`, `schedules`, `units`, `tasks`) are created automatically when the Flask app starts — no manual migrations needed for initial setup.

## Target Users

Engineering students, especially those at **Anna University, Chennai**, preparing for semester exams.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

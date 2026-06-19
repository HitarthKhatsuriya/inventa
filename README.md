# 🏥 MEDIQ — Healthcare Appointment Management System

> Smart clinic queue management with real-time wait tracking, multi-role dashboards, and intelligent scheduling.

## 🏗️ Architecture

| Layer | Technology | Hosting |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite + React Router v6 | **Netlify** |
| **Backend** | Laravel 12 + Sanctum | Render / Railway |
| **Database** | SQLite (dev) / PostgreSQL (prod) | Supabase / Render |

## 📁 Project Structure

```
MEDIQ/
├── netlify.toml              ← Netlify build config (points to frontend/)
├── README.md
├── start_app.bat             ← Local dev launcher (Windows)
│
├── frontend/                 ← React + Vite SPA
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── _redirects        ← SPA fallback for Netlify
│   ├── src/
│   │   ├── main.jsx          ← Entry point
│   │   ├── App.jsx           ← Router + protected routes
│   │   ├── api.js            ← Axios API client
│   │   ├── index.css         ← Design system + all styles
│   │   ├── assets/
│   │   │   └── hero.png
│   │   ├── components/
│   │   │   ├── AppLayout.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── PatientStatus.jsx   ← Public (no auth) UUID-based status
│   │       ├── admin/
│   │       │   ├── AdminDashboard.jsx
│   │       │   ├── AdminQueue.jsx
│   │       │   ├── AdminBooking.jsx
│   │       │   ├── AdminDoctors.jsx
│   │       │   ├── AdminAnalytics.jsx
│   │       │   └── AdminSettings.jsx
│   │       ├── doctor/
│   │       │   ├── DoctorView.jsx
│   │       │   ├── DoctorSchedule.jsx
│   │       │   └── DoctorHistory.jsx
│   │       └── patient/
│   │           ├── PatientDashboard.jsx
│   │           └── PatientBooking.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── .env                  ← Local dev (VITE_API_URL=http://127.0.0.1:8000)
│   └── .env.production       ← Production (replace with your backend URL)
│
└── backend/                  ← Laravel 12 API
    ├── app/
    ├── routes/
    │   └── api.php           ← All REST API endpoints
    ├── database/
    ├── config/
    ├── .env
    ├── .env.example
    ├── composer.json
    └── artisan
```

## 🚀 Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Add Netlify deployment config"
   git push origin main
   ```

2. **Go to [app.netlify.com](https://app.netlify.com)**
   - Click **"Add new site"** → **"Import an existing project"**
   - Connect your Git repository

3. **Netlify will auto-detect `netlify.toml`** — the settings will be:
   - **Base directory:** `frontend`
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `frontend/dist`

4. **Set Environment Variables** in Netlify Dashboard:
   - Go to **Site Settings** → **Environment variables**
   - Add: `VITE_API_URL` = `https://your-deployed-backend-url.com`

5. **Deploy!** 🎉

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# From the MEDIQ root directory:
netlify init
# → Select "Create & configure a new site"
# → Settings will be auto-detected from netlify.toml

# Deploy a preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

## 🖥️ Local Development

### Prerequisites
- Node.js 18+
- PHP 8.2+ with Composer
- SQLite (bundled with PHP)

### Start Everything
```bash
# Windows — double-click or run:
start_app.bat

# Manual — Terminal 1 (Backend):
cd backend
php artisan serve

# Manual — Terminal 2 (Frontend):
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://127.0.0.1:8000`.

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mediq.com | password123 |
| Doctor | priya@mediq.com | password123 |
| Patient | amit@example.com | password123 |

## ⚠️ Important Notes

### Backend Must Be Deployed Separately
Netlify is a **static site host** — it only serves the React frontend. Your Laravel backend needs a separate server:

| Platform | Free Tier | Notes |
|----------|-----------|-------|
| **Render** | ✅ | Best for Laravel — supports PHP, PostgreSQL |
| **Railway** | ✅ (trial) | Easy Docker deploys |
| **Fly.io** | ✅ | Good performance, needs Dockerfile |

### CORS Configuration
After deploying the backend, update `config/cors.php` to allow your Netlify domain:

```php
'allowed_origins' => [
    'https://your-site.netlify.app',
    'https://your-custom-domain.com',
],
```

### Environment Variables
| Variable | Where | Value |
|----------|-------|-------|
| `VITE_API_URL` | Netlify Dashboard | Your backend URL (no trailing slash) |
| `APP_URL` | Backend `.env` | Your Netlify frontend URL |
| `SANCTUM_STATEFUL_DOMAINS` | Backend `.env` | Your Netlify domain |
| `SESSION_DOMAIN` | Backend `.env` | Your domain |

## 📄 License

Private project — all rights reserved.

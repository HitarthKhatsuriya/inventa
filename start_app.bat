@echo off
echo ============================================
echo    MEDIQ Healthcare System - Starting...
echo ============================================
echo.

echo [1/2] Starting Laravel Backend on port 8000...
start "MEDIQ Backend" cmd /c "cd /d E:\MEDIQ\backend && php artisan serve --host=127.0.0.1 --port=8000"

timeout /t 3 /nobreak > nul

echo [2/2] Starting React Frontend on port 5173...
start "MEDIQ Frontend" cmd /c "cd /d E:\MEDIQ\frontend && npm run dev"

timeout /t 5 /nobreak > nul

echo.
echo ============================================
echo    MEDIQ is running!
echo ============================================
echo    Frontend:  http://localhost:5173
echo    Backend:   http://127.0.0.1:8000
echo.
echo    Login Credentials:
echo    Admin:   admin@mediq.com / password123
echo    Doctor:  priya@mediq.com / password123
echo    Patient: amit@example.com / password123
echo ============================================
echo.
pause

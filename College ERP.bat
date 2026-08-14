@echo off
echo ==========================================
echo   College ERP System - Auto Setup
echo ==========================================

echo [1/3] Installing Backend Dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Backend installation failed.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Installing Frontend Dependencies...
cd ../frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Frontend installation failed.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/3] Starting Project...
echo Launching Backend in new window...
start cmd /k "cd ../backend && npm start"

echo Launching Frontend...
npm run dev

pause

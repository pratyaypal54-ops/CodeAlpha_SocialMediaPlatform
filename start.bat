@echo off
title greenit Social App
echo ============================================================
echo   Starting greenit - Simple Full-Stack Social Platform
echo ============================================================
echo.
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo Launching Server...
start "" "http://localhost:5050"
npm start
pause

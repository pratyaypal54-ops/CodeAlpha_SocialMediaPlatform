@echo off
title PulseSphere Social Media App
echo ============================================================
echo   Starting PulseSphere - Modern Full-Stack Social Platform
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

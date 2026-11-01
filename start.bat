@echo off
title TeddyPups U.A.E. Local Server
echo =============================================================
echo   Starting TeddyPups U.A.E. Local Web Server...
echo =============================================================
echo.
echo Starting server on http://localhost:3001 ...
timeout /t 2 /nobreak > nul
start "" "http://localhost:3001"
node server.js
pause

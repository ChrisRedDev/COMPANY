@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Zainstaluj Node.js 24 LTS, a potem uruchom skrypt ponownie.
 pause
 exit /b 1
)
call npm ci
if errorlevel 1 exit /b 1
call npm run dev:localdb
pause

@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto missing_node
where npm >nul 2>&1
if errorlevel 1 goto missing_node
node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 20 || (major === 20 && minor < 9)) { console.error('Wymagany Node.js >= 20.9. Zalecany Node.js 24 LTS.'); process.exit(1); }"
if errorlevel 1 goto failed
call npm ci
if errorlevel 1 goto failed
echo Po uruchomieniu serwera otworz http://localhost:3000 na tym komputerze.
call npm run dev -- --hostname 127.0.0.1 --port 3000
if errorlevel 1 goto failed
exit /b 0
:missing_node
echo Zainstaluj Node.js 24 LTS z https://nodejs.org i uruchom skrypt ponownie.
:failed
pause
exit /b 1

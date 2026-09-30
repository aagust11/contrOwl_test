@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Cal instal.lar Node.js 22 o superior des de https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install
  if errorlevel 1 goto error
)
set PAGES_BASE_PATH=/
call npm run build
if errorlevel 1 goto error
if exist certs\server.pem if exist certs\server-key.pem (
  set CONTROWL_TLS_CERT=certs\server.pem
  set CONTROWL_TLS_KEY=certs\server-key.pem
)
call npm start
pause
exit /b
:error
echo No s'ha pogut preparar ContrOwl. Revisa el missatge anterior.
pause
exit /b 1

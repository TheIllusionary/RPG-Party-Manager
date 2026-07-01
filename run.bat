@echo off
echo Starting Party Manager (API + Electron)...
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Installing root dependencies...
  call npm install
)

npm run dev
pause

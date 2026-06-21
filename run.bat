@echo off
echo Starting Party Manager Development Server...
cd webapp
start http://localhost:5173/
cmd /c "npm run dev"
pause

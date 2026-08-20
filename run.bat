@echo off
TITLE NexusDeploy Platform Launcher
COLOR 0A
CLS

echo ========================================================
echo               NEXUS DEPLOY DEVOPS PLATFORM              
echo ========================================================
echo Starting NexusDeploy Backend (FastAPI) and Frontend (Vite)...
echo.

:: Ensure working directory is the script root
CD /D "%~dp0"

:: 1. Verify Node.js presence
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js ^(v18+ or v20+^) to run the frontend.
    pause
    exit /b 1
)

:: 2. Install frontend dependencies if needed
IF NOT EXIST "frontend\node_modules\" (
    echo [INFO] Installing frontend dependencies...
    CD frontend
    call npm install
    CD ..
    echo [SUCCESS] Frontend dependencies installed.
    echo.
)

:: 3. Optional Docker Database startup
where docker >nul 2>nul
IF %ERRORLEVEL% EQU 0 (
    echo [INFO] Attempting to start PostgreSQL database via Docker Compose...
    docker compose -f backend/docker-compose.yml up -d >nul 2>nul
    IF %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] PostgreSQL container is running.
    ) ELSE (
        echo [NOTICE] Could not start Docker container. Backend will run with fallback mock storage.
    )
) ELSE (
    echo [NOTICE] Docker is not installed or running. Backend will run with fallback mock storage.
)
echo.

:: 4. Start FastAPI Backend in a new terminal
echo [INFO] Launching FastAPI Backend on http://localhost:8000 ...
start "NexusDeploy Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && (if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) else (echo [NOTICE] Running with system python...)) && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: 5. Start Nexus Host Agent in a new terminal
echo [INFO] Launching Nexus Host Agent on http://localhost:3030 ...
start "Nexus Host Agent (Port 3030)" cmd /k "cd /d "%~dp0agent" && node index.js"

:: 6. Start React/Vite Frontend in a new terminal
echo [INFO] Launching React Frontend on http://localhost:3000 ...
start "NexusDeploy Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: 7. Display confirmation and launch browser
echo.
echo ========================================================
echo [SUCCESS] Services launched successfully!
echo   - Frontend App:   http://localhost:3000
echo   - Host Agent:     http://localhost:3030
echo   - Backend Docs:   http://localhost:8000/docs
echo ========================================================
echo.
echo Opening default web browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo You can safely close this launcher window.
echo (The Backend and Frontend windows will keep running).
echo.
pause

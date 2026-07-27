@echo off
title Nexus Platform Launcher
echo ===================================================
echo             Nexus DevOps Platform Launcher
echo ===================================================
echo.

:: Check if Docker is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in system PATH.
    echo Please install Docker Desktop from https://www.docker.com/ before running Nexus.
    pause
    exit /b 1
)

:: Check if Docker is running
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running. Attempting to start Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting for Docker daemon to start...
    :wait_docker
    timeout /t 5 >nul
    docker info >nul 2>nul
    if %errorlevel% neq 0 (
        echo Still waiting for Docker...
        goto wait_docker
    )
    echo [SUCCESS] Docker daemon is ready.
)

:: Start Docker Compose services
echo.
echo [1/3] Bringing up containerized infrastructure (Docker Compose)...
docker compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Docker containers.
    pause
    exit /b 1
)

:: Build Host Agent if executable doesn't exist, then start it
echo.
echo [2/3] Starting Nexus Host Agent...
if not exist "agent\nexus-agent.exe" (
    echo [INFO] nexus-agent.exe not found. Running native host Agent via Node.js...
    start "Nexus Host Agent" cmd /c "cd agent && npm install && npm start"
) else (
    echo [INFO] Starting pre-compiled Host Agent...
    start "Nexus Host Agent" cmd /c "cd agent && nexus-agent.exe"
)

:: Open the Dashboard in the browser
echo.
echo [3/3] Launching Web Console...
timeout /t 3 >nul
start http://localhost:3000

echo.
echo [SUCCESS] Nexus Platform is running!
echo You can close this launcher window now.
echo.
pause

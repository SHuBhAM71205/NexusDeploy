@echo off
title Nexus Agent Packager
echo ===================================================
echo             Nexus Host Agent Packager
echo ===================================================
echo.

cd agent
echo [1/3] Installing packager dependencies (esbuild and pkg)...
call npm install --save-dev esbuild pkg

echo.
echo [2/3] Bundling Agent into single-file CommonJS distribution...
call npx esbuild index.js --bundle --platform=node --format=cjs --outfile=dist/agent.cjs

echo.
echo [3/3] Compiling bundle into standalone Windows executable...
call npx pkg -t node18-win-x64 dist/agent.cjs --output nexus-agent.exe

echo.
echo [SUCCESS] Compilation completed! Output: agent\nexus-agent.exe
echo.
pause

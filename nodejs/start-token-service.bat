@echo off
REM Startup script for Bank Token Service (Windows)

echo ========================================
echo Starting Bank Token Service
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Check if private key exists
if not exist "bank-private-key.pem" (
    echo WARNING: bank-private-key.pem not found!
    echo Please ensure the private key file is in the nodejs directory
    pause
    exit /b 1
)

echo Starting token service...
echo.

REM Start the service (server mode is now default)
node index.js

pause


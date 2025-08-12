@echo off
REM Windows batch file to run the deployment script
REM Lake St. Clair Musky App - Production Deployment

echo 🚀 Lake St. Clair Musky App - Windows Deployment Wrapper
echo ===========================================================

REM Check if WSL is available
wsl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ WSL is not installed. Please install WSL2 to run the deployment script.
    echo 📖 Follow: https://docs.microsoft.com/en-us/windows/wsl/install
    pause
    exit /b 1
)

REM Check if script exists
if not exist "deploy-production.sh" (
    echo ❌ deploy-production.sh not found in current directory
    pause
    exit /b 1
)

echo ✅ Running deployment script via WSL...
echo.

REM Run the bash script in WSL
wsl bash ./deploy-production.sh %*

echo.
echo 📱 Deployment completed! Check the output above for details.
pause
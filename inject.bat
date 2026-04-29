@echo off
cd /d "%~dp0"

set "DISCORD_PATH=%LOCALAPPDATA%\Discord"

if not exist "%DISCORD_PATH%" (
    echo Discord folder not found at "%DISCORD_PATH%"
    pause
    exit /b 1
)

node scripts/runInstaller.mjs -- --install -location "%DISCORD_PATH%"
pause

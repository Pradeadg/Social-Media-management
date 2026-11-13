@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-services.ps1"
set "setupResult=%errorlevel%"
echo.
if not "%setupResult%"=="0" echo Setup belum selesai. Biarkan Docker Desktop terbuka dan kirim status ini ke chat.
pause
exit /b %setupResult%

@echo off
cd /d "%~dp0"
call pnpm-local.cmd dev:frontend
pause

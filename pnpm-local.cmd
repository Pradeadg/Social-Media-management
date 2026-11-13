@echo off
setlocal
set "npm_config_cache=%~dp0.local-tools\cache"
set "PATH=%~dp0.local-tools\node;%~dp0.local-tools\bin;%PATH%"
"%~dp0.local-tools\node\node.exe" "%~dp0.local-tools\pnpm\bin\pnpm.cjs" %*
exit /b %errorlevel%

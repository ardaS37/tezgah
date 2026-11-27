@echo off
title Konsey
cd /d "%~dp0"
if not exist "node_modules\electron\package.json" (
  echo Run npm ci in this folder to install Konsey's development dependencies.
  pause
  exit /b 1
)
call npm.cmd start
if errorlevel 1 pause

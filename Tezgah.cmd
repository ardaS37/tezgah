@echo off
title Tezgah
cd /d "%~dp0"
node desktop.mjs
if errorlevel 1 pause

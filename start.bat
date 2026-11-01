@echo off
title ClipSync - Presse-Papier Partagé Local
echo ========================================================
echo   Lancement de ClipSync sur le port 6060...
echo ========================================================
cd /d "%~dp0"
node server.js 6060
pause

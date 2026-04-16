@echo off
cd /d %~dp0

echo ==========================
echo INICIANDO SISTEMA SICOS...
echo ==========================

start http://localhost:4000

node app.js
@echo off
rem ============================================================
rem  Mise a jour du site en une commande (Windows)
rem  1. regenere assets\data\data.js depuis archives\
rem  2. commit + push  -> la CI deploie automatiquement
rem
rem  Usage :  tools\update.bat
rem           tools\update.bat "Classement du 29/10/2026"
rem ============================================================
setlocal
cd /d "%~dp0\.."

echo === 1/4  Generation des donnees ===
python tools\build_data.py
if errorlevel 1 (echo [ERREUR] generation des donnees - mise a jour annulee. & exit /b 1)

echo === 2/4  Verification des changements ===
git add .
git diff --cached --quiet
if not errorlevel 1 (echo Rien a commiter : deja a jour. & goto :eof)

echo === 3/4  Commit ===
set "MSG=%~1"
if not defined MSG set "MSG=Mise a jour du classement"
git commit -m "%MSG%"
if errorlevel 1 exit /b 1

echo === 4/4  Push ===
git push
echo.
echo Termine ! La CI GitHub Actions deploie le site automatiquement.

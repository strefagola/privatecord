@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "PORT=5564"
set "PYTHON_EXE="

where python.exe >nul 2>&1
if not errorlevel 1 set "PYTHON_EXE=python.exe"
if not defined PYTHON_EXE (
  where py.exe >nul 2>&1
  if not errorlevel 1 set "PYTHON_EXE=py.exe"
)

if not defined PYTHON_EXE (
  echo.
  echo [PrivateCord] Nie znaleziono Python 3.
  echo Zainstaluj Python 3 i uruchom START_PrivateCord.bat ponownie.
  pause
  exit /b 1
)

echo [PrivateCord] Uruchamiam serwer HTTP na porcie %PORT%...
if /i "%PYTHON_EXE%"=="py.exe" (
  start "PrivateCord HTTP Server" /min py.exe -3 "%~dp0serve.py"
) else (
  start "PrivateCord HTTP Server" /min python.exe "%~dp0serve.py"
)

for /l %%N in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%PORT%/' -TimeoutSec 1; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>nul
  if !errorlevel! equ 0 goto ready
  timeout /t 1 /nobreak >nul
)

echo.
echo [PrivateCord] Nie udalo sie uruchomic serwera po 30 sekundach.
echo Sprobuj recznie uruchomic: %PYTHON_EXE% serve.py
echo Jezeli masz stare okno PrivateCord, zamknij je i uruchom ten plik ponownie.
pause
exit /b 1

:ready
echo [PrivateCord] Serwer dziala poprawnie.
echo [PrivateCord] Otwieram http://127.0.0.1:%PORT%/
start "" "http://127.0.0.1:%PORT%/"
endlocal

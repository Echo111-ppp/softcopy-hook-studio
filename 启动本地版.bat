@echo off
cd /d "%~dp0"

set "PYTHON_CMD="
where py >nul 2>nul
if %errorlevel% equ 0 set "PYTHON_CMD=py -3"

if not defined PYTHON_CMD (
  where python >nul 2>nul
  if %errorlevel% equ 0 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
  if exist "C:\Users\21837\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
    set "PYTHON_CMD=C:\Users\21837\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
  )
)

if not defined PYTHON_CMD (
  echo 没有找到 Python，无法启动本地网页。
  echo 可以直接部署到 GitHub Pages，或安装 Python 后再运行。
  pause
  exit /b 1
)

start "" "http://127.0.0.1:8080"
%PYTHON_CMD% -m http.server 8080 --bind 127.0.0.1
pause


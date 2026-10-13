@echo off
chcp 65001 >nul
if exist "D:\Python312\python.exe" (
  "D:\Python312\python.exe" "%~dp0scripts\convert_video.py" "%~1"
) else (
  python "%~dp0scripts\convert_video.py" "%~1"
)
pause

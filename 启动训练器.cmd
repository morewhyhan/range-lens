@echo off
setlocal
cd /d "%~dp0"
set "APP=%~dp0release\postflop-solver-v7\win-unpacked\扑克练习器.exe"
if exist "%APP%" (
  start "扑克练习器" "%APP%"
  exit /b 0
)
echo 找不到当前目录版扑克练习器：
echo %APP%
echo 请先运行 npm run package:win:dir:current
pause
exit /b 1

@echo off
cls
echo bot will restart when it crashes
title Jimmy Bot

:: 检查是否以管理员权限运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Administrator permissions required. Please run as administrator.
    pause
    exit /b
)

:: 检查是否安装了 Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js is not installed. Installing Node.js...
    powershell -Command Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.12.0/node-v20.12.0-x64.msi" -OutFile "$env:TEMP\node-v20.12.0-x64.msi"
    start /wait "%TEMP%\node-v20.12.0-x64.msi" /qn
    del "%TEMP%\node-v20.12.0-x64.msi"
) else (
    echo installed Node.js successfully
)

:: 检查特定文件是否存在，如果不存在，则从 GitHub 下载
if not exist "update.txt" (
    echo file does not exist
    powershell -Command Invoke-WebRequest -Uri "https://github.com/jimmy20180130/mcf-bet-public/archive/refs/heads/main.zip" -OutFile "$env:TEMP\bot.zip"
    move "%TEMP%\bot.zip" "bot.zip"
) else (
    echo file exists
)

:: 解压文件
echo Decompressing zip file...
powershell Expand-Archive -Path "bot.zip" -DestinationPath .

echo Installation completed

:StartServer
echo (%time%) starting the bot
start node start.js
echo (%time%) restarting the bot
goto StartServer

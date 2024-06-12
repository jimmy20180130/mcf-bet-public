@echo off
chcp 65001
cls
echo bot will restart when it crashes
title Jimmy Bot

echo checking environment
title Jimmy Bot - checking Environment

:: 檢查 Node.js 是否已安裝
where /q node
if %errorlevel% neq 0 (
    echo Node.js 未安裝!
    pause
    exit
)

:: 安裝套件
call npm install .

title Jimmy Bot - Running

:StartServer
echo (%time%) starting the bot
node start.js
echo (%time%) restarting the bot
title Jimmy Bot - Restarting
timeout /t 20
goto StartServer
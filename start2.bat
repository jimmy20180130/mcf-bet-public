@echo off
cls
echo bot will restart when it crashes
title Jimmy Bot

echo checking environment
:: 安裝套件
call npm install .

:StartServer
echo (%time%) starting the bot
start /wait node start.js
echo (%time%) restarting the bot
goto StartServer

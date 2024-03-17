@echo off
cls
echo bot will restart when it crashes
title Jimmy Bot
:StartServer
start /wait node start.js
echo (%time%) restarting the bot
goto StartServer
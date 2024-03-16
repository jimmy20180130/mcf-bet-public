@echo off
cls
echo 機器人會在出錯 / 關閉時自動重啟!!
title Jimmy Bot 自動重啟程式
:StartServer
start /wait node start.js
echo (%time%) 機器人下線了...  正在重啟中...
goto StartServer
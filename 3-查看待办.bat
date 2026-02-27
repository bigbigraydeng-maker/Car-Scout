@echo off
chcp 65001 >nul
title 📋 Car Scout 今日待办
color 0E

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║         📋 Car Scout 今日待办清单              ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

node src/dashboard.js todos

echo.
echo 按任意键退出...
pause >nul

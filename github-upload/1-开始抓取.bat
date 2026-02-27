@echo off
chcp 65001 >nul
title 🚗 Car Scout 车辆抓取工具
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║         🚗 Car Scout 车辆抓取工具              ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 正在启动...请稍等
echo.

node src/facebook-scraper-v4.js

echo.
echo 按任意键退出...
pause >nul

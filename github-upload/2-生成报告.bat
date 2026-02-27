@echo off
chcp 65001 >nul
title 📊 Car Scout 生成报告
color 0B

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║         📊 Car Scout 生成今日报告              ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

node src/dashboard.js report

echo.
echo ✅ 报告已生成！
echo.
echo 📁 报告位置：
echo    - 可视化看板：reports/visual/ 文件夹
echo    - 今日待办：workflow/ 文件夹
echo    - 飞书导入：exports/ 文件夹
echo.
echo 按任意键打开报告文件夹...
pause >nul

start reports\visual

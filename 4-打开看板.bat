@echo off
chcp 65001 >nul
title 🌐 Car Scout 可视化看板
color 0D

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║         🌐 Car Scout 可视化看板                ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 正在打开可视化看板...
echo.

if exist "reports\visual" (
    start reports\visual
    echo ✅ 已打开报告文件夹
    echo.
    echo 请双击最新的 HTML 文件查看看板
) else (
    echo ❌ 还没有生成报告
    echo.
    echo 请先运行 "2-生成报告.bat"
)

echo.
echo 按任意键退出...
pause >nul

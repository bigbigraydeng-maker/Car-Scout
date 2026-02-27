@echo off
chcp 65001 >nul
title 🚗 打开 Car Scout 车辆管理看板
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║         🚗 Car Scout 车辆管理看板              ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 正在打开车辆管理看板...
echo.

if exist "车辆管理看板.html" (
    start "" "车辆管理看板.html"
    echo ✅ 已打开！请使用浏览器查看
    echo.
    echo 💡 提示：
    echo    - 点击"刷新数据"获取最新车辆
    echo    - 点击筛选标签查看不同阶段车辆
    echo    - 点击"推进"按钮更新车辆状态
    echo    - 点击"查看"打开Facebook链接
) else (
    echo ❌ 找不到文件：车辆管理看板.html
    echo.
    echo 请确保文件在当前文件夹中
)

echo.
echo 按任意键退出...
pause >nul

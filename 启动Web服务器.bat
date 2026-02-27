@echo off
chcp 65001 >nul
title 🌐 Car Scout Web服务器
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║      🌐 Car Scout Web服务器启动器              ║
echo ║                                                ║
echo ║   让合伙人可以在任何地方查看车辆信息！          ║
echo ╚════════════════════════════════════════════════╝
echo.

REM 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Node.js，请先安装
    echo.
    echo 下载地址：https://nodejs.org/
    pause
    exit
)

echo ✅ Node.js已安装
echo.

REM 设置端口
set /p PORT=请输入服务器端口（默认3000）：
if "%PORT%"=="" set PORT=3000

echo.
echo 🚀 正在启动Web服务器...
echo.
echo 📱 启动后，可以通过以下方式访问：
echo    本机：http://localhost:%PORT%
echo    局域网：http://[本机IP]:%PORT%
echo.
echo 💡 提示：
echo    - 保持此窗口运行，服务器才能工作
echo    - 页面每30秒自动刷新
echo    - 合伙人只需在浏览器输入地址即可查看
echo.
echo 🛑 按 Ctrl+C 可以停止服务器
echo.

node src/web-server.js %PORT%

echo.
echo 服务器已停止
echo.
pause

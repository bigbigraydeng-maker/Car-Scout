@echo off
chcp 65001 >nul
title 🔧 Car Scout 安装依赖
color 0F

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║         🔧 Car Scout 安装依赖                  ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

echo 正在检查Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未安装Node.js
    echo.
    echo 请先安装Node.js：
    echo https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
    echo.
    echo 安装完成后重新运行此文件
    pause
    exit
)

echo ✅ Node.js已安装
node --version
echo.

echo 正在安装依赖（首次需要几分钟）...
npm install

echo.
echo ✅ 安装完成！
echo.
echo 现在可以开始使用：
echo    双击 1-开始抓取.bat 开始抓取车辆
echo.
pause

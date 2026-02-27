@echo off
chcp 65001 >nul
title 🚀 Car Scout - 一键部署到Vercel
color 0E

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   🚀 Car Scout - 一键部署到Vercel              ║
echo ║                                                ║
echo ║   让合伙人可以在任何地方访问！                  ║
echo ╚════════════════════════════════════════════════╝
echo.

echo 📋 部署步骤：
echo.
echo 第1步：安装Vercel CLI
echo -------------------------
echo.

REM 检查是否安装了vercel
vercel --version >nul 2>&1
if errorlevel 1 (
    echo 🔧 正在安装Vercel CLI...
    npm install -g vercel
    if errorlevel 1 (
        echo ❌ 安装失败，请手动运行：npm install -g vercel
        pause
        exit
    )
)

echo ✅ Vercel CLI已安装
vercel --version
echo.

echo 第2步：登录Vercel
echo -------------------------
echo.
echo 将会打开浏览器让你登录Vercel账号
echo.

vercel login
if errorlevel 1 (
    echo ❌ 登录失败
    pause
    exit
)

echo.
echo 第3步：部署项目
echo -------------------------
echo.
echo 🚀 开始部署...
echo.

vercel --prod
if errorlevel 1 (
    echo ❌ 部署失败
    echo.
    echo 可能的原因：
    echo 1. 没有正确登录
    echo 2. 网络连接问题
    echo 3. 配置错误
    echo.
    echo 请检查错误信息后重试
    pause
    exit
)

echo.
echo ✅ 部署成功！
echo.
echo 🎉 恭喜！您的Car Scout已上线！
echo.
echo 📱 合伙人访问地址：
echo    上方显示的URL（类似 https://car-scout-xxxxx.vercel.app）
echo.
echo 💡 提示：
echo    - 将这个地址分享给合伙人
echo    - 合伙人可以在手机/电脑浏览器打开
echo    - 页面每30秒自动刷新
echo    - 完全免费，24小时在线
echo.
echo 📖 详细说明请查看：在线共享版部署指南.md
echo.
pause

@echo off
chcp 65001 >nul
title 🚀 Car Scout 部署助手
color 0A
cls

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   🚀 Car Scout - 完整部署助手                  ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM 设置Git用户信息
git config user.email "deploy@carscout.com" 2>nul
git config user.name "Deployer" 2>nul

REM 确保使用main分支
git branch -m main 2>nul

echo 📋 当前Git状态：
git status
echo.

echo 🔗 当前远程仓库：
git remote -v
echo.

echo =================================================
echo  尝试推送到GitHub...
echo =================================================
echo.

git push -u origin main --force

if %errorlevel% == 0 (
    echo.
    echo ╔════════════════════════════════════════════════╗
    echo ║              ✅ 推送成功！                      ║
    echo ╚════════════════════════════════════════════════╝
    echo.
    echo 📂 GitHub仓库地址：
    echo https://github.com/bigbigraydeng-maker/car-scout
    echo.
    echo 🚀 下一步：部署到Render
    echo 1. 打开 https://dashboard.render.com
    echo 2. 用GitHub登录
    echo 3. New + -^> Web Service
    echo 4. 选择 car-scout 仓库
    echo 5. Build Command: npm install
    echo 6. Start Command: node src/web-server.js
    echo 7. 点击 Create
    echo.
    start https://dashboard.render.com
) else (
    echo.
    echo ╔════════════════════════════════════════════════╗
    echo ║              ❌ 推送失败                        ║
    echo ╚════════════════════════════════════════════════╝
    echo.
    echo 可能的原因：
    echo 1. GitHub仓库尚未创建
    echo 2. 网络连接问题
    echo 3. Token权限不足
    echo.
    echo 请先在GitHub创建仓库：
    echo https://github.com/new
    echo.
    echo 仓库名称：car-scout
    echo 选择 Public
    echo 勾选 Add a README file
    echo.
)

echo.
pause

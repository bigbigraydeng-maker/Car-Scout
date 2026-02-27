@echo off
chcp 65001 >nul
title 🚀 Car Scout - 半自动部署（使用您的API Token）
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   🚀 Car Scout 半自动部署                      ║
echo ║                                                ║
echo ║   使用您的GitHub Token和Render API Key         ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

echo 📋 部署流程：
echo.
echo 第1步：手动创建GitHub仓库（2分钟）
echo 第2步：自动推送代码（自动）
echo 第3步：自动创建Render服务（自动）
echo 第4步：完成部署！
echo.

echo =================================================
echo  第1步：创建GitHub仓库
echo =================================================
echo.
echo 请按以下步骤操作：
echo.
echo 1. 打开 https://github.com/new
echo 2. Repository name 输入：car-scout
echo 3. 选择 Public（公开）
echo 4. 勾选 "Add a README file"
echo 5. 点击 "Create repository"
echo.
echo 创建完成后，您会得到一个地址：
echo https://github.com/bigbigraydeng-maker/car-scout
echo.

set /p CONFIRM=已完成创建？请输入仓库地址（直接回车使用默认）：

if "%CONFIRM%"=="" set CONFIRM=https://github.com/bigbigraydeng-maker/car-scout

echo.
echo =================================================
echo  第2步：推送代码到GitHub
echo =================================================
echo.

echo 🔧 正在推送代码...

git init 2>nul
git config user.email "deploy@carscout.com" 2>nul
git config user.name "Car Scout Deployer" 2>nul
git add .
git commit -m "Auto deploy" 2>nul

git remote remove origin 2>nul
git remote add origin https://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@github.com/bigbigraydeng-maker/car-scout.git

git branch -M main 2>nul
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo ❌ 推送失败
    echo 请检查：
    echo 1. 仓库是否已创建
    echo 2. Token是否正确
    pause
    exit
)

echo.
echo ✅ 代码推送成功！
echo.

echo =================================================
echo  第3步：创建Render服务
echo =================================================
echo.

echo 🚀 正在创建Render服务...
echo.
echo 由于API限制，请手动创建：
echo.
echo 1. 打开 https://dashboard.render.com
echo 2. 用GitHub登录（使用bigbigraydeng-maker账号）
echo 3. 点击 "New +" → "Web Service"
echo 4. 选择 "car-scout" 仓库
echo 5. 填写配置：
echo    - Name: car-scout
echo    - Build Command: npm install
echo    - Start Command: node src/web-server.js
echo    - Plan: Free
echo 6. 点击 "Create Web Service"
echo.
echo ⏳ 等待部署完成（2-3分钟）...
echo.
start https://dashboard.render.com

echo.
echo 请在Render Dashboard中等待部署完成。
echo.
set /p URL=部署完成后，请输入访问地址（例如：https://car-scout-xxx.onrender.com）：

echo.
echo =================================================
echo  ✅ 部署完成！
echo =================================================
echo.
echo 🎉 恭喜！Car Scout已成功部署！
echo.
echo 📱 合伙人访问地址：
echo    %URL%
echo.
echo 📂 GitHub仓库：
echo    https://github.com/bigbigraydeng-maker/car-scout
echo.
echo 💡 提示：
echo    - 将上述地址分享给合伙人
echo    - 合伙人用浏览器即可访问
echo    - 页面每30秒自动刷新
echo    - 完全免费，24小时在线
echo.
echo 📖 详细文档：
echo    完全零基础指南.md
echo    Render部署完整指南.md
echo.

echo %URL% > deploy-url.txt
echo 💾 访问地址已保存到 deploy-url.txt
echo.

pause

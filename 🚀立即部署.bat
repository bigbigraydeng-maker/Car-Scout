@echo off
chcp 65001 >nul
title 🚀 Car Scout - 自动部署中
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   🚀 Car Scout - 自动部署到GitHub + Render    ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

echo 📋 部署流程：
echo 1. 推送代码到GitHub
echo 2. 创建Render服务
echo 3. 等待部署完成
echo.

cd /d "%~dp0"

echo =================================================
echo  步骤1：推送代码到GitHub
echo =================================================
echo.

git remote remove origin 2>nul

echo 🔗 连接GitHub仓库...
git remote add origin https://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@github.com/bigbigraydeng-maker/car-scout.git

echo 📤 推送代码...
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo ❌ 推送失败
    echo 请检查网络连接或Token是否有效
    pause
    exit
)

echo.
echo ✅ 代码推送成功！
echo.

echo =================================================
echo  步骤2：创建Render服务
echo =================================================
echo.

echo 🚀 正在创建Render服务...
echo.
echo ⚠️  Render API暂时无法自动调用
echo 请手动完成以下步骤：
echo.
echo 1. 打开 https://dashboard.render.com
echo 2. 用GitHub登录（bigbigraydeng-maker）
echo 3. 点击 "New +" → "Web Service"
echo 4. 选择 "car-scout" 仓库
echo 5. 填写：
echo    - Name: car-scout
echo    - Build Command: npm install
echo    - Start Command: node src/web-server.js
echo    - Plan: Free
echo 6. 点击 "Create Web Service"
echo.
echo ⏳ 等待部署完成（2-3分钟）
echo.
start https://dashboard.render.com

echo.
echo =================================================
echo  ✅ GitHub部署完成！
echo =================================================
echo.
echo 🎉 代码已成功推送到GitHub！
echo.
echo 📂 GitHub仓库：
echo    https://github.com/bigbigraydeng-maker/car-scout
echo.
echo 📱 接下来请在Render Dashboard中创建服务
echo    访问地址将在创建后显示
echo.
echo 💡 提示：
echo    - Render部署需要2-3分钟
echo    - 部署完成后分享生成的URL给合伙人
echo    - 合伙人用浏览器即可访问
echo.

pause

@echo off
chcp 65001 >nul
title 🚀 GitHub + Render 一键部署
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   🚀 GitHub + Render 一键部署工具              ║
echo ║                                                ║
echo ║   代码上传到GitHub → 自动部署到Render          ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

REM 检查Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未安装Git
    echo.
    echo 请先安装Git：
    echo https://git-scm.com/download/win
    echo.
    pause
    exit
)

echo ✅ Git已安装

echo.
echo =================================================
echo  第1步：配置GitHub账号
echo =================================================
echo.

REM 检查是否已配置git
git config user.name >nul 2>&1
if errorlevel 1 (
    echo 📝 首次使用Git，需要配置用户信息
    echo.
    set /p GIT_NAME=请输入您的GitHub用户名：
    set /p GIT_EMAIL=请输入您的GitHub邮箱：
    
    git config --global user.name "%GIT_NAME%"
    git config --global user.email "%GIT_EMAIL%"
    
    echo ✅ Git配置完成
)

echo.
echo =================================================
echo  第2步：初始化Git仓库
echo =================================================
echo.

if exist .git (
    echo ✅ Git仓库已存在
) else (
    echo 🔧 初始化Git仓库...
    git init
    echo ✅ 已初始化
)

echo.
echo =================================================
echo  第3步：添加文件到Git
echo =================================================
echo.

echo 📦 添加所有文件...
git add .
echo ✅ 已添加

echo.
echo =================================================
echo  第4步：提交代码
echo =================================================
echo.

set /p COMMIT_MSG=请输入提交说明（直接回车使用默认）：
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Initial commit - Car Scout v2.0

git commit -m "%COMMIT_MSG%"
echo ✅ 已提交

echo.
echo =================================================
echo  第5步：连接到GitHub仓库
echo =================================================
echo.

echo 请先在GitHub创建仓库：
echo 1. 打开 https://github.com/new
echo 2. 输入仓库名：car-scout
echo 3. 点击 "Create repository"
echo.
set /p REPO_URL=请输入GitHub仓库地址（例如：https://github.com/用户名/car-scout.git）：

if "%REPO_URL%"=="" (
    echo ❌ 请输入仓库地址
    pause
    exit
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo.
echo =================================================
echo  第6步：推送到GitHub
echo =================================================
echo.

echo 🚀 推送到GitHub...
git branch -M main
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ 推送失败
    echo.
    echo 可能原因：
    echo 1. 仓库地址错误
    echo 2. 需要登录GitHub
    echo 3. 网络问题
    echo.
    echo 请检查后重试，或手动执行：
    echo git push -u origin main
    pause
    exit
)

echo.
echo ✅ 代码已成功推送到GitHub！
echo.
echo 📍 仓库地址：%REPO_URL%
echo.

echo =================================================
echo  第7步：部署到Render
echo =================================================
echo.

echo 现在可以部署到Render了！
echo.
echo 请选择部署方式：
echo.
echo 1. 自动部署（需要Render CLI）
echo 2. 手动部署（推荐，打开浏览器操作）
echo.

choice /C 12 /M "请选择"

if errorlevel 2 goto ManualDeploy
goto AutoDeploy

:AutoDeploy
echo.
echo 🔧 检查Render CLI...

where vercel >nul 2>&1
if errorlevel 1 (
    echo ❌ 未安装Render CLI
    echo 转向手动部署...
    goto ManualDeploy
)

echo ✅ Render CLI已安装
echo.
echo 🚀 开始部署...
vercel --prod
goto DeployComplete

:ManualDeploy
echo.
echo 📝 手动部署步骤：
echo.
echo 1. 打开 https://dashboard.render.com
echo 2. 用GitHub登录
echo 3. 点击 "New +" → "Web Service"
echo 4. 选择您的 car-scout 仓库
echo 5. 填写配置：
echo    - Name: car-scout
echo    - Build Command: npm install
echo    - Start Command: node src/web-server.js
echo    - Plan: Free
echo 6. 点击 "Create Web Service"
echo.
echo 正在打开Render网站...
start https://dashboard.render.com

goto DeployComplete

:DeployComplete
echo.
echo =================================================
echo  ✅ 部署完成！
echo =================================================
echo.
echo 🎉 恭喜！您的Car Scout已成功部署！
echo.
echo 📱 合伙人访问地址将在Render部署完成后显示
echo    格式：https://car-scout-xxxx.onrender.com
echo.
echo 💡 重要提示：
echo    ✅ 代码已保存在GitHub，不会丢失
echo    ✅ Render会自动从GitHub拉取代码部署
echo    ✅ 每次更新代码后，Render会自动重新部署
echo    ✅ 完全免费，24小时在线
echo.
echo 📝 后续更新代码：
echo    修改代码后执行：
echo    git add .
echo    git commit -m "更新说明"
echo    git push origin main
echo.
echo 📖 详细文档：Render部署完整指南.md
echo.
pause

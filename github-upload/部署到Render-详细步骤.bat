@echo off
chcp 65001 >nul
title 🚀 Car Scout - 部署到Render
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   🚀 Car Scout - 部署到Render                  ║
echo ║                                                ║
echo ║   完全免费 · 24小时在线 · 自动HTTPS           ║
echo ╚════════════════════════════════════════════════╝
echo.

echo 📋 部署步骤：
echo.
echo =================================================
echo  第1步：准备GitHub仓库
echo =================================================
echo.
echo 选项A：使用现有的GitHub仓库
echo 选项B：创建新的GitHub仓库（推荐）
echo.
choice /C AB /M "请选择"

if errorlevel 2 goto CreateNewRepo
goto UseExistingRepo

:CreateNewRepo
echo.
echo 📝 创建新GitHub仓库步骤：
echo.
echo 1. 打开 https://github.com/new
echo 2. 输入仓库名称：car-scout
echo 3. 选择 Public（公开）
echo 4. 点击 "Create repository"
echo 5. 按下面步骤上传代码：
echo.
echo    git init
echo    git add .
echo    git commit -m "Initial commit"
echo    git branch -M main
echo    git remote add origin https://github.com/你的用户名/car-scout.git
echo    git push -u origin main
echo.
pause
goto ContinueDeploy

:UseExistingRepo
echo.
echo 📁 使用现有仓库
echo 请确保代码已经推送到GitHub
echo.
pause
goto ContinueDeploy

:ContinueDeploy
echo.
echo =================================================
echo  第2步：注册/登录Render
echo =================================================
echo.
echo 1. 打开 https://dashboard.render.com
echo 2. 点击 "Get Started for Free"
echo 3. 用GitHub账号登录
echo.
start https://dashboard.render.com
echo.
echo 登录完成后按任意键继续...
pause >nul

echo.
echo =================================================
echo  第3步：创建Web Service
echo =================================================
echo.
echo 在Render Dashboard中：
echo.
echo 1. 点击 "New +" 按钮
echo 2. 选择 "Web Service"
echo 3. 选择您的 car-scout GitHub仓库
echo 4. 配置如下：
echo.
echo    Name: car-scout
echo    Region: Oregon (US West) 或 Singapore
echo    Branch: main
echo    Runtime: Node
echo    Build Command: npm install
echo    Start Command: node src/web-server.js
echo    Plan: Free
echo.
echo 5. 点击 "Create Web Service"
echo.
pause

echo.
echo =================================================
echo  第4步：等待部署完成
echo =================================================
echo.
echo ⏳ 部署大约需要2-3分钟...
echo.
echo 部署完成后，您会获得一个URL：
echo https://car-scout-xxxx.onrender.com
echo.
echo 这个URL就是合伙人访问地址！
echo.
pause

echo.
echo =================================================
echo  ✅ 部署完成！
echo =================================================
echo.
echo 🎉 恭喜！您的Car Scout已成功部署到Render！
echo.
echo 📱 合伙人访问地址：
echo    https://car-scout-xxx.onrender.com
echo    （具体地址在Render Dashboard中查看）
echo.
echo 💡 重要提示：
echo    ✅ 完全免费，永不过期
echo    ✅ 24小时在线
echo    ✅ 自动HTTPS加密
echo    ✅ 每次代码更新自动重新部署
echo    ✅ 页面每30秒自动刷新
echo.
echo 📖 使用说明：
echo    1. 将上述地址分享给合伙人
echo    2. 合伙人用手机/电脑浏览器打开
echo    3. 即可查看所有车辆信息
echo    4. 数据每30秒自动更新
echo.
echo 🔧 后续更新代码：
echo    git add .
echo    git commit -m "更新内容"
echo    git push origin main
echo    （Render会自动重新部署）
echo.
echo 📞 遇到问题？
echo    查看：在线共享版部署指南.md
echo.
pause

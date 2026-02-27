@echo off
chcp 65001 >nul
title 🚀 推送代码到GitHub
color 0A
cls

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   📤 推送 Car Scout 代码到 GitHub             ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo 📂 当前目录：%CD%
echo.

echo =================================================
echo  配置Git...
echo =================================================
echo.

git config user.email "deploy@carscout.com" 2>nul
git config user.name "Car Scout Deployer" 2>nul

echo ✅ Git用户信息已设置
echo.

echo =================================================
echo  检查当前状态...
echo =================================================
echo.

git branch -m main 2>nul
echo ✅ 分支名已设为 main
echo.

echo 🔗 配置远程仓库...
git remote remove origin 2>nul
git remote add origin https://github.com/bigbigraydeng-maker/Car-Scout.git
echo ✅ 远程仓库已配置
echo.

git remote -v
echo.

echo =================================================
echo  准备推送代码...
echo =================================================
echo.
echo ⚠️  由于GitHub安全限制，需要手动输入凭据
echo.
echo 当出现登录提示时：
echo   用户名：bigbigraydeng-maker
echo   密码：使用您的GitHub Personal Access Token
echo.
echo 或者使用浏览器登录GitHub
echo.
pause
echo.

echo 📤 开始推送...
echo.
git push -u origin main --force

if %errorlevel% == 0 (
    echo.
    echo ╔════════════════════════════════════════════════╗
    echo ║              ✅ 推送成功！                      ║
    echo ╚════════════════════════════════════════════════╝
    echo.
    echo 🎉 代码已成功推送到GitHub！
    echo.
    echo 📂 仓库地址：
    echo https://github.com/bigbigraydeng-maker/Car-Scout
    echo.
    echo 🚀 下一步：部署到Render
    echo.
    echo 请访问 https://dashboard.render.com
    echo 用GitHub登录后创建Web Service
    echo.
    start https://dashboard.render.com
) else (
    echo.
    echo ╔════════════════════════════════════════════════╗
    echo ║              ❌ 推送失败                        ║
    echo ╚════════════════════════════════════════════════╝
    echo.
    echo 请尝试以下方法：
    echo.
    echo 方法1：使用GitHub Desktop
echo    - 下载安装 GitHub Desktop
echo    - 导入此文件夹
echo    - 点击Push
echo.
    echo 方法2：使用VS Code
echo    - 用VS Code打开此文件夹
echo    - 点击左侧Git图标
echo    - 点击Push
echo.
    echo 方法3：手动复制文件
echo    - 访问 https://github.com/bigbigraydeng-maker/Car-Scout
echo    - 点击 "Add file" -^> "Upload files"
echo    - 上传所有文件
echo.
)

echo.
pause

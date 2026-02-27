@echo off
chcp 65001 >nul
title 🚀 Car Scout - API自动部署工具
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   🚀 Car Scout - API自动部署工具               ║
echo ║                                                ║
echo ║   使用GitHub + Render API自动完成部署          ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

echo 📋 前置要求：
echo.
echo 您需要提供以下API Token：
echo.
echo 1️⃣  GitHub Personal Access Token
echo     获取地址：https://github.com/settings/tokens
echo     权限要求：勾选 "repo" (完整仓库权限)
echo.
echo 2️⃣  Render API Key  
echo     获取地址：https://dashboard.render.com/u/settings/api-keys
echo     点击 "Create API Key"
echo.
echo 3️⃣  GitHub用户名
echo     您的GitHub账号用户名
echo.

echo =================================================
echo  配置方式（选择一种）
echo =================================================
echo.
echo 方式1：临时输入（推荐，安全）
echo 方式2：修改auto-deploy.js文件（永久保存）
echo.

choice /C 12 /M "请选择配置方式"

if errorlevel 2 goto ModifyFile
goto InputTemp

:InputTemp
echo.
echo =================================================
echo  请输入API信息（输入时不会显示，正常）
echo =================================================
echo.

set /p GITHUB_OWNER=GitHub用户名：

set /p GITHUB_REPO=仓库名称（默认car-scout，直接回车）：
if "%GITHUB_REPO%"=="" set GITHUB_REPO=car-scout

echo.
echo GitHub Token（粘贴后按回车）：
powershell -Command "$p = read-host -AsSecureString; $BSTR=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)" > temp_token.txt
set /p GITHUB_TOKEN=<temp_token.txt
del temp_token.txt

echo.
echo Render API Key（粘贴后按回车）：
powershell -Command "$p = read-host -AsSecureString; $BSTR=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)" > temp_key.txt
set /p RENDER_API_KEY=<temp_key.txt
del temp_key.txt

echo.
echo =================================================
echo  确认信息
echo =================================================
echo.
echo GitHub用户名：%GITHUB_OWNER%
echo 仓库名称：%GITHUB_REPO%
echo GitHub Token：%GITHUB_TOKEN:~0,10%**********
echo Render API Key：%RENDER_API_KEY:~0,10%**********
echo.

choice /C YN /M "信息是否正确？"
if errorlevel 2 goto InputTemp

echo.
echo 🚀 开始自动部署...
echo.

set GITHUB_TOKEN=%GITHUB_TOKEN%
set GITHUB_OWNER=%GITHUB_OWNER%
set GITHUB_REPO=%GITHUB_REPO%
set RENDER_API_KEY=%RENDER_API_KEY%
set RENDER_SERVICE_NAME=%GITHUB_REPO%

node auto-deploy.js

goto End

:ModifyFile
echo.
echo =================================================
echo  手动修改配置文件
echo =================================================
echo.
echo 请用记事本打开 auto-deploy.js 文件
echo 修改开头的 CONFIG 对象：
echo.
echo const CONFIG = {
echo   github: {
echo     token: '您的GitHub-Token',
echo     owner: '您的GitHub用户名',
echo     repo: 'car-scout'
echo   },
echo   render: {
echo     apiKey: '您的Render-API-Key',
echo     serviceName: 'car-scout',
echo     region: 'oregon'
echo   }
echo };
echo.
echo 修改后保存，然后重新运行此脚本
echo.
pause
exit

:End
echo.
echo =================================================
echo  部署完成！
echo =================================================
echo.

if exist deploy-info.json (
    echo 📄 部署信息：
    type deploy-info.json
    echo.
)

echo 💡 提示：
echo    - API Token仅本次使用，不会保存
echo    - 部署信息保存在 deploy-info.json
echo    - 合伙人访问地址如上所示
echo.

pause

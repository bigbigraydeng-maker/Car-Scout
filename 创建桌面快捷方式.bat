@echo off
chcp 65001 >nul
title 🎯 创建桌面快捷方式
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║   🎯 创建Car Scout桌面快捷方式                 ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

set "TARGETDIR=%~dp0"
set "DESKTOP=%USERPROFILE%\Desktop"

echo 📂 项目文件夹：%TARGETDIR%
echo 🖥️  桌面位置：%DESKTOP%
echo.

echo 🔧 正在创建快捷方式...
echo.

:: 创建主快捷方式（打开文件夹）
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\🚗 Car Scout.lnk'); $Shortcut.TargetPath = '%TARGETDIR%'; $Shortcut.IconLocation = '%SystemRoot%\System32\SHELL32.dll,14'; $Shortcut.Save()"

echo ✅ 已创建：桌面\🚗 Car Scout.lnk
echo.

echo 🔧 创建常用功能快捷方式...
echo.

:: 开始抓取
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\📥 开始抓取.lnk'); $Shortcut.TargetPath = '%TARGETDIR%1-开始抓取.bat'; $Shortcut.WorkingDirectory = '%TARGETDIR%'; $Shortcut.IconLocation = '%SystemRoot%\System32\SHELL32.dll,14'; $Shortcut.Save()"
echo ✅ 已创建：桌面\📥 开始抓取.lnk

:: 生成报告
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\📊 生成报告.lnk'); $Shortcut.TargetPath = '%TARGETDIR%2-生成报告.bat'; $Shortcut.WorkingDirectory = '%TARGETDIR%'; $Shortcut.IconLocation = '%SystemRoot%\System32\SHELL32.dll,14'; $Shortcut.Save()"
echo ✅ 已创建：桌面\📊 生成报告.lnk

:: 打开看板
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\🌐 打开看板.lnk'); $Shortcut.TargetPath = '%TARGETDIR%打开车辆看板.bat'; $Shortcut.WorkingDirectory = '%TARGETDIR%'; $Shortcut.IconLocation = '%SystemRoot%\System32\SHELL32.dll,14'; $Shortcut.Save()"
echo ✅ 已创建：桌面\🌐 打开看板.lnk

:: GitHub+Render部署
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\🚀 GitHub+Render部署.lnk'); $Shortcut.TargetPath = '%TARGETDIR%GitHub+Render一键部署.bat'; $Shortcut.WorkingDirectory = '%TARGETDIR%'; $Shortcut.IconLocation = '%SystemRoot%\System32\SHELL32.dll,14'; $Shortcut.Save()"
echo ✅ 已创建：桌面\🚀 GitHub+Render部署.lnk

echo.
echo ╔════════════════════════════════════════════════╗
echo ║              ✅ 快捷方式创建完成！              ║
echo ╠════════════════════════════════════════════════╣
echo ║                                                ║
echo ║  已创建以下快捷方式到桌面：                     ║
echo ║                                                ║
echo ║  🚗 Car Scout        - 打开项目文件夹          ║
echo ║  📥 开始抓取         - 抓取车辆数据            ║
echo ║  📊 生成报告         - 生成今日报告            ║
echo ║  🌐 打开看板         - 查看车辆管理界面        ║
echo ║  🚀 GitHub+Render部署 - 部署到云端             ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 💡 现在可以在桌面上双击快捷方式使用了！
echo.
pause

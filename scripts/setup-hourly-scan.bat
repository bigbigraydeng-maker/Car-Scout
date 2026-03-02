@echo off
:: Car Scout - FB Delta Scan 每小时任务计划
:: 运行方式: 以管理员身份运行此 .bat 文件
::
:: 命令说明:
::   schtasks /create  — 创建定时任务
::   /sc HOURLY /mo 1  — 每1小时运行
::   /st 08:00          — 从早上8点开始
::   /et 23:00          — 晚上11点结束 (不浪费凌晨时段)
::   /tn                — 任务名称
::   /tr                — 要运行的命令

set SCRIPT_DIR=%~dp0..
set NODE_PATH=node

echo ========================================
echo  Car Scout - FB 增量扫描 定时任务设置
echo ========================================
echo.

:: 创建每小时扫描任务
schtasks /create /tn "CarScout-FB-DeltaScan" /sc HOURLY /mo 1 /st 08:00 /et 23:00 /tr "cmd /c cd /d \"%SCRIPT_DIR%\" && %NODE_PATH% src/fb-delta-scan.js >> data\fb_scan_output.log 2>&1" /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ 任务已创建: CarScout-FB-DeltaScan
    echo    频率: 每小时 (08:00 - 23:00)
    echo    日志: data\fb_scan_output.log
    echo.
    echo 管理命令:
    echo   查看:   schtasks /query /tn "CarScout-FB-DeltaScan"
    echo   手动跑: schtasks /run /tn "CarScout-FB-DeltaScan"
    echo   停用:   schtasks /change /tn "CarScout-FB-DeltaScan" /disable
    echo   删除:   schtasks /delete /tn "CarScout-FB-DeltaScan" /f
) else (
    echo.
    echo ❌ 创建失败! 请以管理员身份运行此脚本
)

echo.
pause

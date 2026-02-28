@echo off
echo =================================================
echo  配置Windows定时任务 - Car Scout自动同步
echo =================================================
echo.

set TASK_NAME=CarScoutFacebookScraper
set SCRIPT_PATH=C:\Users\Zhong\.openclaw\workspace-car-scout-toyota\src\auto-sync.js
set NODE_PATH=C:\Program Files\nodejs\node.exe

echo 创建定时任务: %TASK_NAME%
echo 脚本路径: %SCRIPT_PATH%
echo.

:: 删除旧任务（如果存在）
schtasks /delete /tn %TASK_NAME% /f 2>nul

:: 创建新任务 - 每天早上9点运行
schtasks /create ^
  /tn %TASK_NAME% ^
  /tr "\"%NODE_PATH%\" \"%SCRIPT_PATH%\"" ^
  /sc daily ^
  /st 09:00 ^
  /rl highest ^
  /f

if %errorlevel% == 0 (
    echo.
    echo ✅ 定时任务创建成功！
    echo.
    echo 任务详情：
    echo   - 名称: %TASK_NAME%
    echo   - 时间: 每天早上 9:00
    echo   - 操作: 自动抓取Facebook并推送到GitHub
    echo.
    echo 查看任务：
    echo   schtasks /query /tn %TASK_NAME%
    echo.
    echo 立即运行测试：
    echo   schtasks /run /tn %TASK_NAME%
    echo.
    echo 删除任务：
    echo   schtasks /delete /tn %TASK_NAME% /f
) else (
    echo.
    echo ❌ 创建失败，请检查：
    echo   1. Node.js是否安装
    echo   2. 脚本路径是否正确
    echo   3. 是否有管理员权限
)

echo.
pause

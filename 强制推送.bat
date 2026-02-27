@echo off
echo =================================================
echo  强制推送代码到 GitHub
echo =================================================
echo.

cd /d "C:\Users\Zhong\.openclaw\workspace-car-scout-toyota"

echo 当前Git状态:
git status
echo.

echo 最近提交:
git log --oneline -3
echo.

echo 远程状态:
git log --oneline origin/main -1 2>nul || echo 无法获取远程状态
echo.

echo 执行强制推送...
git push origin main --force

if %errorlevel% == 0 (
    echo.
    echo ✅ 推送成功！
    echo.
    echo 现在请在Render Dashboard中：
    echo 1. 打开 https://dashboard.render.com
    echo 2. 点击 car-scout 服务
    echo 3. 点击 Manual Deploy -^> Deploy latest commit
    echo 4. 等待部署完成
) else (
    echo.
    echo ❌ 推送失败
    echo 请检查网络连接
)

echo.
pause

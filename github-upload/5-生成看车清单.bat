@echo off
chcp 65001 >nul
title 📝 Car Scout 生成看车清单
color 0C

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║         📝 Car Scout 看车清单生成器            ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 使用说明：
echo 1. 输入车辆ID（例如：fb_123456789）
echo 2. 系统会自动生成看车清单
echo 3. 清单保存在 workflow 文件夹
echo.
echo 车辆ID在哪里找？
echo - 在可视化看板中查看
echo - 或者在数据库中查看
echo.

set /p vehicle_id=请输入车辆ID：

if "%vehicle_id%"=="" (
    echo ❌ 请输入车辆ID！
    pause
    exit
)

echo.
echo 正在为车辆 %vehicle_id% 生成看车清单...

node -e "
const VehicleDatabase = require('./src/vehicle-database');
const FeishuTableIntegration = require('./src/feishu-table-integration');
const fs = require('fs');
const path = require('path');

const db = new VehicleDatabase();
const feishu = new FeishuTableIntegration();

const vehicle = db.vehicles.vehicles.find(v => v.id === '%vehicle_id%' || v.id.includes('%vehicle_id%'));

if (!vehicle) {
    console.log('❌ 未找到车辆：%vehicle_id%');
    process.exit(1);
}

const checklist = feishu.generateInspectionChecklist(vehicle);
const checklistPath = path.join('workflow', 'checklist_%vehicle_id%.md');
fs.writeFileSync(checklistPath, checklist);

console.log('✅ 看车清单已生成！');
console.log('📁 文件位置：' + checklistPath);
"

echo.
echo 按任意键打开清单...
pause >nul

start workflow

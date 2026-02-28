# 🎯 Trae 执行提示词 - Car Scout Facebook自动化

## 📋 项目背景

**项目名称：** Car Scout - 二手车抓取系统  
**当前状态：** 
- ✅ Render网站已部署：https://car-scout.onrender.com/
- ✅ TradeMe自动化已完成（云端定时抓取）
- ❌ Facebook需要本地自动化方案

**目标：** 实现Facebook Marketplace每天自动抓取，并同步到Render网站

---

## 🎯 具体需求

### 需求1：创建自动同步脚本
创建 `src/auto-sync.js`，功能：
1. 运行Facebook抓取器（使用已保存的登录状态）
2. 合并新数据到数据库
3. 筛选超里程车辆（>16万公里剔除）
4. 生成可视化看板
5. 推送到GitHub
6. 触发Render重新部署

### 需求2：创建Windows定时任务配置
创建 `setup-windows-task.bat`，功能：
1. 创建Windows计划任务
2. 每天早上9点自动运行auto-sync.js
3. 无需人工干预（除非出现验证码）

### 需求3：完善数据合并脚本
确保 `src/merge-facebook.js` 存在，功能：
1. 读取Facebook抓取结果
2. 合并到database/vehicles.json
3. 去重（根据URL）
4. 添加时间戳字段

---

## 🔧 技术方案

### 架构流程
```
Windows定时任务（每天9点）
    ↓
运行 src/auto-sync.js
    ↓
1. 抓取Facebook（使用本地登录状态）
    ↓
2. 合并数据到数据库
    ↓
3. 筛选超里程车辆
    ↓
4. 生成HTML看板
    ↓
5. git push 到 GitHub
    ↓
Render自动部署更新
    ↓
网站显示最新数据
```

### 文件清单
需要创建/确保存在的文件：

| 文件路径 | 状态 | 说明 |
|---------|------|------|
| `src/auto-sync.js` | 需创建 | 主同步脚本 |
| `src/merge-facebook.js` | 需创建 | Facebook数据合并 |
| `setup-windows-task.bat` | 需创建 | 定时任务配置 |
| `src/facebook-scraper-v4.js` | 已存在 | Facebook抓取器 |
| `src/filter-by-mileage.js` | 已存在 | 里程筛选 |
| `src/dashboard.js` | 已存在 | 看板生成 |

---

## 📝 详细实现要求

### 文件1：src/auto-sync.js

**功能要求：**
```javascript
#!/usr/bin/env node

/**
 * Facebook自动同步脚本
 * 每天早上运行，抓取数据并推送到GitHub
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Facebook自动同步');
console.log('时间:', new Date().toLocaleString());

try {
  // 1. 抓取Facebook
  console.log('🔍 步骤1: 抓取Facebook...');
  execSync('node src/facebook-scraper-v4.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    timeout: 600000
  });
  console.log('✅ Facebook抓取完成');

  // 2. 合并数据
  console.log('📊 步骤2: 合并数据...');
  execSync('node src/merge-facebook.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ 数据合并完成');

  // 3. 筛选超里程
  console.log('🚗 步骤3: 筛选超里程车辆...');
  execSync('node src/filter-by-mileage.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ 筛选完成');

  // 4. 生成看板
  console.log('📈 步骤4: 生成看板...');
  execSync('node src/dashboard.js dashboard', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ 看板生成完成');

  // 5. 推送到GitHub
  console.log('📤 步骤5: 推送到GitHub...');
  const date = new Date().toISOString().split('T')[0];
  
  try {
    execSync('git add database/ data/ reports/', { cwd: path.join(__dirname, '..') });
    execSync(`git commit -m "Auto sync: ${date} Facebook data"`, { 
      cwd: path.join(__dirname, '..')
    });
    execSync('git push origin main', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('✅ 推送到GitHub成功');
  } catch (e) {
    console.log('⚠️ GitHub推送失败:', e.message);
  }

  console.log('🎉 自动同步完成！');
  console.log('网站: https://car-scout.onrender.com/');

} catch (error) {
  console.error('❌ 自动同步失败:', error.message);
  process.exit(1);
}
```

**关键要求：**
- 超时设置：抓取10分钟，推送1分钟
- 错误处理：每个步骤try-catch，失败继续下一步
- 日志输出：清晰的步骤提示和状态

---

### 文件2：src/merge-facebook.js

**功能要求：**
```javascript
#!/usr/bin/env node

/**
 * 合并Facebook抓取数据到主数据库
 */

const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'database', 'vehicles.json');
const dataDir = path.join(__dirname, '..', 'data');

console.log('📊 合并Facebook数据...\n');

// 读取数据库
let dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

// 查找最新的Facebook数据文件
const files = fs.readdirSync(dataDir)
  .filter(f => f.startsWith('facebook_') && f.endsWith('.json'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.log('⚠️ 未找到Facebook数据文件');
  process.exit(0);
}

const latestFile = files[0];
const facebookData = JSON.parse(fs.readFileSync(path.join(dataDir, latestFile), 'utf8'));

console.log(`📁 读取文件: ${latestFile}`);
console.log(`📥 Facebook车辆: ${facebookData.vehicles?.length || 0}辆\n`);

let added = 0;
let skipped = 0;

// 合并车辆
(facebookData.vehicles || []).forEach(fbVehicle => {
  // 检查是否已存在
  const exists = dbData.vehicles.find(v => v.url === fbVehicle.url);
  if (exists) {
    skipped++;
    return;
  }

  // 添加新车辆
  const newVehicle = {
    id: `fb-${Date.now()}-${added}`,
    title: fbVehicle.title,
    year: fbVehicle.year,
    price: fbVehicle.price,
    mileage: fbVehicle.mileage || 0,
    location: fbVehicle.location,
    url: fbVehicle.url,
    source: 'facebook',
    status: 'new',
    priority: calculatePriority(fbVehicle),
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    description: fbVehicle.description,
    seller: fbVehicle.seller
  };

  dbData.vehicles.push(newVehicle);
  added++;
});

// 计算优先级
function calculatePriority(vehicle) {
  let score = 5;
  if (vehicle.year >= 2010) score += 2;
  else if (vehicle.year >= 2005) score += 1;
  
  if (vehicle.mileage < 100000) score += 3;
  else if (vehicle.mileage < 130000) score += 2;
  else if (vehicle.mileage < 160000) score += 1;
  
  if (vehicle.price < 4000) score += 2;
  else if (vehicle.price < 5000) score += 1;
  
  return Math.min(Math.max(score, 1), 10);
}

// 保存数据库
dbData.lastUpdate = new Date().toISOString();
fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));

console.log('✅ 合并完成！\n');
console.log(`🆕 新增: ${added}辆`);
console.log(`⏭️ 跳过: ${skipped}辆`);
console.log(`📊 数据库总计: ${dbData.vehicles.length}辆\n`);
```

**关键要求：**
- 自动查找最新的Facebook数据文件
- 根据URL去重
- 计算优先级（年份、里程、价格）
- 添加完整的时间戳字段

---

### 文件3：setup-windows-task.bat

**功能要求：**
```batch
@echo off
echo =================================================
echo Car Scout Facebook自动同步 - Windows定时任务配置
echo =================================================
echo.

set TASK_NAME=CarScoutFacebookSync
set SCRIPT_PATH=C:\Users\Zhong\.openclaw\workspace-car-scout-toyota\src\auto-sync.js
set NODE_PATH=C:\Program Files\nodejs\node.exe

echo 任务名称: %TASK_NAME%
echo 脚本路径: %SCRIPT_PATH%
echo.

:: 检查Node.js
if not exist "%NODE_PATH%" (
  echo ❌ 错误: 未找到Node.js
  echo 请确认Node.js安装在: %NODE_PATH%
  pause
  exit /b 1
)

:: 删除旧任务
schtasks /delete /tn %TASK_NAME% /f >nul 2>&1

:: 创建新任务 - 每天早上9点
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
  echo 任务详情:
  echo   - 名称: %TASK_NAME%
  echo   - 运行时间: 每天早上 9:00
  echo   - 运行命令: node src/auto-sync.js
  echo.
  echo 管理命令:
  echo   查看: schtasks /query /tn %TASK_NAME%
  echo   运行: schtasks /run /tn %TASK_NAME%
  echo   删除: schtasks /delete /tn %TASK_NAME% /f
) else (
  echo.
  echo ❌ 创建失败
  echo 请用管理员权限运行此脚本
)

echo.
pause
```

**关键要求：**
- 检查Node.js是否存在
- 删除旧任务避免冲突
- 每天早上9点运行
- 提供管理命令提示

---

## ✅ 验证清单

### 代码完成后验证：

1. **文件存在性检查**
   ```bash
   ls src/auto-sync.js
   ls src/merge-facebook.js
   ls setup-windows-task.bat
   ```

2. **脚本可运行检查**
   ```bash
   node src/merge-facebook.js
   # 应该显示合并统计
   ```

3. **定时任务配置检查**
   - 双击setup-windows-task.bat
   - 查看任务计划程序中有CarScoutFacebookSync任务

4. **端到端测试**
   ```bash
   node src/auto-sync.js
   # 观察每个步骤是否成功
   # 检查GitHub是否有新提交
   ```

---

## 📁 项目路径

**工作目录：**
```
C:\Users\Zhong\.openclaw\workspace-car-scout-toyota\
```

**关键文件：**
- `src/facebook-scraper-v4.js` - 已存在，抓取器
- `src/filter-by-mileage.js` - 已存在，筛选脚本
- `src/dashboard.js` - 已存在，看板生成
- `database/vehicles.json` - 数据库文件

---

## 🎯 成功标准

**完成后应该：**
1. ✅ 每天早上9点自动运行
2. ✅ 自动抓取Facebook数据
3. ✅ 合并到数据库并筛选
4. ✅ 生成看板并推送到GitHub
5. ✅ Render自动部署，网站显示数据
6. ✅ 人工只需偶尔处理验证码

---

## ⚠️ 注意事项

1. **Facebook登录状态**
   - 首次运行前确保已登录Facebook
   - 登录状态保存在auth/目录

2. **GitHub Token**
   - 确保本地Git配置了有效的GitHub Token
   - 测试：git push origin main

3. **Render自动部署**
   - 确保render.yaml中autoDeploy: true
   - 或手动在Dashboard点击Deploy

---

## 📞 问题排查

**如果auto-sync.js失败：**
1. 检查Node.js版本：node -v (需要v18+)
2. 检查Facebook登录状态：运行1-开始抓取.bat测试
3. 检查Git配置：git status
4. 查看具体错误日志

**如果定时任务不运行：**
1. 检查电脑是否开机
2. 检查任务计划程序中的任务状态
3. 查看Windows事件查看器
4. 手动运行测试：schtasks /run /tn CarScoutFacebookSync

---

**请创建以上3个文件，并确保代码可以正常运行！**

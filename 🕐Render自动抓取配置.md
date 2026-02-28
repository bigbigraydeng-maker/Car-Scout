# 🕐 Render 自动定时抓取配置

## 方案A：使用Render Cron Job（推荐）

### 1. 创建定时任务服务

在 `render.yaml` 中添加：

```yaml
services:
  # Web服务（已有的）
  - type: web
    name: car-scout
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: node src/start.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /
    autoDeploy: true

  # 新增：定时抓取服务
  - type: cron
    name: car-scout-scraper
    runtime: node
    plan: free
    buildCommand: npm install
    schedule: "0 8 * * *"  # 每天上午8点运行
    startCommand: node src/auto-scrape.js
```

### 2. 创建自动抓取脚本

创建 `src/auto-scrape.js`：

```javascript
#!/usr/bin/env node

/**
 * 自动抓取脚本 - 每天定时运行
 * 1. 抓取TradeMe（不需要登录）
 * 2. 合并到数据库
 * 3. 生成报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始自动抓取...');
console.log('时间:', new Date().toISOString());
console.log('');

// 确保目录存在
const dirs = ['database', 'data', 'logs', 'reports'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// 确保数据库存在
const dbPath = path.join(__dirname, '..', 'database', 'vehicles.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({
    vehicles: [],
    lastUpdate: new Date().toISOString(),
    version: '1.0'
  }, null, 2));
}

try {
  // 1. 运行TradeMe抓取
  console.log('🔍 抓取TradeMe...');
  execSync('node src/trademe-scraper.js', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  // 2. 合并到数据库
  console.log('📊 合并数据...');
  if (fs.existsSync('src/merge-trademe.js')) {
    execSync('node src/merge-trademe.js', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  }
  
  // 3. 筛选超里程车辆
  console.log('🚗 筛选超里程车辆...');
  if (fs.existsSync('src/filter-by-mileage.js')) {
    execSync('node src/filter-by-mileage.js', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  }
  
  // 4. 生成看板
  console.log('📈 生成看板...');
  execSync('node src/dashboard.js dashboard', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('');
  console.log('✅ 自动抓取完成！');
  
} catch (error) {
  console.error('❌ 抓取失败:', error.message);
  process.exit(1);
}
```

### 3. 在Render Dashboard配置

1. 打开 https://dashboard.render.com
2. 点击 **New +** → **Cron Job**
3. 配置：
   - **Name**: car-scout-scraper
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/auto-scrape.js`
   - **Schedule**: `0 8 * * *`（每天8点）或 `0 */6 * * *`（每6小时）
   - **Plan**: Free
4. 点击 **Create Cron Job**

---

## 方案B：使用GitHub Actions（更稳定）

### 1. 创建GitHub Actions工作流

创建 `.github/workflows/scrape.yml`：

```yaml
name: Daily Scrape

on:
  schedule:
    - cron: '0 8 * * *'  # 每天UTC 8点（新西兰晚上8点）
  workflow_dispatch:  # 支持手动触发

jobs:
  scrape:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run TradeMe scraper
      run: node src/trademe-scraper.js
      continue-on-error: true
      
    - name: Merge data
      run: node src/merge-trademe.js
      continue-on-error: true
      
    - name: Filter by mileage
      run: node src/filter-by-mileage.js
      continue-on-error: true
      
    - name: Generate dashboard
      run: node src/dashboard.js dashboard
      continue-on-error: true
      
    - name: Commit changes
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add database/
        git add data/
        git add reports/
        git commit -m "Auto scrape: $(date +%Y-%m-%d)" || exit 0
        git push
```

### 2. 配置GitHub Token

1. 打开 GitHub → Settings → Secrets and variables → Actions
2. 点击 **New repository secret**
3. Name: `GITHUB_TOKEN`（或 `ACTIONS_DEPLOY_KEY`）
4. Value: 生成一个新的Personal Access Token（需要repo权限）

---

## 方案C：简单手动触发（最快速）

### 直接在Render Shell运行：

```bash
# 1. 进入项目目录
cd /opt/render/project/src

# 2. 运行抓取器
node trademe-scraper.js

# 3. 合并数据
node merge-trademe.js

# 4. 筛选超里程
node filter-by-mileage.js

# 5. 生成看板
node dashboard.js dashboard
```

**现在立即执行这5步，5分钟后网站就有数据了！**

---

## 🎯 推荐配置

| 方案 | 自动化程度 | 复杂度 | 推荐度 |
|------|-----------|--------|--------|
| **方案A** | ⭐⭐⭐⭐⭐ | 中等 | 首选 |
| **方案B** | ⭐⭐⭐⭐⭐ | 中等 | GitHub用户推荐 |
| **方案C** | ⭐⭐⭐ | 简单 | 立即可用 |

**建议：现在先用方案C手动运行一次，让网站立即有数据！**
**然后配置方案A或B，实现完全自动化！**

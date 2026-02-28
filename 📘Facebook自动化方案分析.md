# 📘 Facebook Marketplace 自动化抓取方案

## 🔴 核心难点

Facebook Marketplace有业界最强的反爬虫机制：
1. **登录验证** - 必须登录才能看完整数据
2. **设备指纹检测** - 检测无头浏览器、异常环境
3. **行为分析** - 检测异常点击模式、滚动速度
4. **验证码挑战** - 频繁出现人机验证
5. **账号封禁** - 异常行为直接封号

---

## ✅ 可行方案（按推荐度排序）

### 方案1：本地抓取 + 自动同步（最现实⭐⭐⭐⭐⭐）

**架构：**
```
本地电脑（每天定时运行）
    ↓ 抓取Facebook
    ↓ 保存数据
    ↓ 自动推送到GitHub/服务器
Render服务器（显示数据）
```

**技术实现：**

1. **本地定时任务**（Windows Task Scheduler）
```powershell
# 每天上午9点运行
schtasks /create /tn "CarScoutFacebook" /tr "node C:\workspace\src\facebook-scraper-v4.js" /sc daily /st 09:00
```

2. **抓取后自动上传**
```javascript
// src/auto-sync.js
const { execSync } = require('child_process');

// 1. 抓取Facebook
execSync('node facebook-scraper-v4.js');

// 2. 合并数据
execSync('node merge-facebook.js');

// 3. 自动推送到GitHub
execSync('git add database/');
execSync('git commit -m "Update: $(date)"');
execSync('git push origin main');

// 4. 触发Render重新部署（通过API）
fetch('https://api.render.com/v1/services/{service_id}/deploys', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer rnd_xxx' }
});
```

**优点：**
- ✅ 使用本地浏览器（正常设备指纹）
- ✅ 人工可以监督（看到验证码时处理）
- ✅ 账号安全（不频繁切换IP）
- ✅ 技术简单，成本低

**缺点：**
- ❌ 需要电脑开机
- ❌ 不是完全无人值守（偶尔需要处理验证码）

---

### 方案2：云端浏览器农场（高级⭐⭐⭐）

**架构：**
```
云端VPS（4-8台）
    ↓ 每台运行真实Chrome
    ↓ 每个账号独立IP
    ↓ 轮流抓取
Render服务器（合并显示）
```

**技术栈：**
- **Puppeteer Cluster** - 多浏览器管理
- **Bright Data/ScrapingBee** - 住宅代理IP（$5-10/GB）
- **2Captcha/Anti-Captcha** - 自动验证码解决（$2-3/千次）

**代码示例：**
```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');

puppeteer.use(StealthPlugin());
puppeteer.use(RecaptchaPlugin({
  provider: { id: '2captcha', token: 'xxx' }
}));

const browser = await puppeteer.launch({
  headless: false,
  args: [
    '--proxy-server=http://brightdata:xxx@proxy.com:22225',
    '--disable-web-security'
  ]
});

// 每个请求使用不同IP
// 随机延迟模拟真人
// 自动处理验证码
```

**成本估算：**
- VPS: $20-40/月 × 4台 = $80-160/月
- 代理IP: $50-100/月
- 验证码服务: $20-30/月
- **总计: $150-300/月**

**优点：**
- ✅ 完全无人值守
- ✅ 可大规模抓取

**缺点：**
- ❌ 成本高
- ❌ 技术复杂
- ❌ 仍有被封风险
- ❌ 可能违反Facebook ToS

---

### 方案3：使用Facebook官方API（不推荐❌）

**现实：**
- Facebook Marketplace **没有公开API**
- Graph API只能访问公开页面，看不到个人卖家
- 实际上**不可行**

---

### 方案4：数据购买服务（快速但贵⭐⭐）

**服务提供商：**
- **Apify** - 有现成的Facebook Marketplace爬虫（$49-199/月）
- **ScrapingRobot** - 按请求付费
- **Nimble** - 企业级数据服务

**使用方式：**
```javascript
// 调用Apify API
const response = await fetch('https://api.apify.com/v2/acts/xxx/runs', {
  method: 'POST',
  body: JSON.stringify({
    searchQuery: 'Toyota Corolla Auckland',
    maxResults: 50
  })
});
```

**成本：** $50-500/月

**优点：**
- ✅ 最快实现
- ✅ 无需技术维护

**缺点：**
- ❌ 贵
- ❌ 数据质量不可控
- ❌ 可能突然失效

---

## 🎯 最推荐方案：本地+云端混合

### 实施步骤：

**第1阶段：本地自动化（立即实施）**
1. 配置Windows计划任务，每天自动运行
2. 抓取后自动推送到GitHub
3. Render自动部署更新

**第2阶段：云端备份（可选）**
1. TradeMe完全云端自动化（已实现）
2. Facebook在云端尝试，失败时回退到本地

**第3阶段：监控告警（完善）**
1. 抓取失败时发送飞书/邮件通知
2. 数据量异常时人工介入

---

## 💡 具体实施建议

### 短期（本周）：
1. 先用TradeMe自动化（已实现）
2. Facebook每周手动抓取一次
3. 数据手动上传到GitHub

### 中期（下月）：
1. 配置本地定时任务自动抓取Facebook
2. 配置自动推送到GitHub
3. 基本无人值守，偶尔处理验证码

### 长期（视情况）：
1. 如果业务量大，考虑VPS方案
2. 或者购买Apify服务

---

## ⚖️ 风险评估

| 方案 | 成本 | 稳定性 | 合规性 | 维护难度 |
|------|------|--------|--------|----------|
| 本地+GitHub | ⭐低 | ⭐⭐⭐中 | ⭐⭐⭐安全 | ⭐简单 |
| VPS农场 | ⭐⭐⭐高 | ⭐⭐中 | ⭐有风险 | ⭐⭐⭐复杂 |
| 购买服务 | ⭐⭐中 | ⭐⭐⭐高 | ⭐⭐中 | ⭐简单 |

---

## 🚀 立即行动

**建议现在实施的方案：**
```
本地定时抓取 + 自动同步到GitHub + Render显示
```

**需要我提供详细的技术配置吗？**

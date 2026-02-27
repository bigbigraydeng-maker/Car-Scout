# Car Scout - 每日联合抓取配置

## 🚀 定时任务

**任务名称**: Car Scout Daily - 每日联合抓取  
**执行时间**: 每天早上 8:00 (NZST)  
**任务ID**: `3e826dff-4f53-4359-ac27-7fbc017803de`

### 数据源
- ✅ TradeMe (新西兰)
- ✅ Facebook Marketplace (奥克兰)

### 搜索范围
- **地区**: 奥克兰 + 100公里
- **价格**: $2,000 - $5,000 NZD
- **年份**: 2002-2010
- **里程**: ≤160,000 km

### 目标车型

| 品牌 | 车型 |
|------|------|
| **Toyota** | Corolla, Vitz, Yaris, RAV4 |
| **Honda** | Civic, Accord, Fit, Jazz |
| **Mazda** | Mazda3, Mazda6, Axela, Atenza |

---

## 📊 评分系统

| 维度 | 权重 | 标准 |
|------|------|------|
| **价格** | 40% | ≤$3,000=40分, ≤$3,500=35分, ≤$4,000=30分... |
| **里程** | 30% | ≤80k=30分, ≤100k=25分, ≤120k=20分... |
| **年份** | 20% | ≥2008=20分, ≥2006=15分, ≥2004=10分... |
| **数据源** | 10% | TradeMe=10分, Facebook=5分 |

---

## 📱 飞书消息格式

每日早上8点自动发送包含以下内容的消息：

1. **数据概览** - 总车辆数、各平台数量、新上架数量
2. **TOP 5 推荐** - 评分最高的5辆车，带链接
3. **新上架车辆** - 隔日发现的新车辆列表

### 消息示例

```
🚗 Car Scout 日报 - 2026-02-27

📊 数据概览
• 总车辆: 25 辆
• TradeMe: 15 辆
• Facebook: 10 辆
• 新上架: 3 辆

🏆 TOP 5 推荐

🥇 2005 Toyota Corolla
   💰 价格: $3,200
   🛣️ 里程: 95,000 km
   📍 位置: Auckland City
   📊 评分: 88/100
   🔗 [查看详情](https://trademe.co.nz/...)

🥈 ...

🆕 新上架车辆
• 2004 Honda Civic - $3,500
• 2006 Mazda 3 - $2,800
```

---

## 🔧 管理命令

### 立即运行
```bash
node src/daily-scraper.js
```

### 查看定时任务状态
```bash
openclaw cron list
```

### 手动触发
```bash
openclaw cron run --job-id 3e826dff-4f53-4359-ac27-7fbc017803de
```

### 暂停/恢复
```bash
openclaw cron update --job-id 3e826dff-4f53-4359-ac27-7fbc017803de --enabled false
openclaw cron update --job-id 3e826dff-4f53-4359-ac27-7fbc017803de --enabled true
```

---

## 📝 日志文件

| 文件 | 说明 |
|------|------|
| `data/previous_scrape.json` | 上次抓取数据（用于对比新车辆） |
| `reports/daily/report_YYYY-MM-DD.json` | 每日报告 |
| `data/daily_scrape_YYYY-MM-DD.json` | 完整抓取数据 |

---

## ⚠️ 注意事项

1. **Facebook 登录**: 确保 `auth/facebook_auth.json` 存在且有效
2. **Edge 浏览器**: 使用系统已登录的 Edge 浏览器
3. **运行时间**: 完整抓取约需 10-15 分钟
4. **飞书权限**: 确保 bot 有发送消息权限

# Car Scout Toyota - 双数据源使用说明

## 📦 数据源配置

### 1. TradeMe（优先）
- ✅ **容易抓取** - 有明确API和页面结构
- ✅ **个人卖家筛选** - URL参数直接过滤
- ✅ **信息完整** - 价格、里程、地区清晰
- ✅ **稳定可靠** - 反爬机制较少

### 2. Facebook Marketplace（补充）
- ⚠️ **较难抓取** - 需要登录，动态加载
- ⚠️ **卖家识别** - 需要额外判断个人/车行
- ⚠️ **速度较慢** - 每辆车都要打开详情页
- ✅ **车源丰富** - 个人卖家数量多

---

## 🚀 使用方法

### 方式A：运行完整流程（双数据源）
```bash
node src/run-all.js
```
这会依次：
1. 抓取 TradeMe 个人卖家
2. 抓取 Facebook Marketplace 个人卖家
3. 合并并去重
4. 执行100分制评分
5. 生成统一报告

### 方式B：单独运行 TradeMe（推荐先试）
```bash
node src/trademe-scraper.js
```
优点：速度快，成功率高，信息完整

### 方式C：单独运行 Facebook
```bash
node src/facebook-private-scraper.js
```
需要手动登录Facebook

---

## 📊 输出文件

运行后会生成：

| 文件 | 说明 |
|------|------|
| `data/trademe_YYYY-MM-DD.json` | TradeMe原始数据 |
| `data/facebook_private_YYYY-MM-DD.json` | Facebook原始数据 |
| `data/combined_YYYY-MM-DD.json` | 合并+评分数据 |
| `data/report_YYYY-MM-DD.txt` | 文本报告 |

---

## ⚙️ 配置调整

编辑 `search_config.json`：

```json
{
  "sources": {
    "trademe": {
      "enabled": true,      // 是否启用
      "seller_type": "private",
      "priority": 1         // 优先级（1=最高）
    },
    "facebook": {
      "enabled": true,
      "seller_type": "private",
      "priority": 2,
      "business_keywords": [  // 识别车行的关键词
        "motors", "cars", "auto", "dealer"
      ]
    }
  }
}
```

---

## 🎯 推荐使用流程

### 第1步：先测试 TradeMe
```bash
node src/trademe-scraper.js
```
- 验证配置是否正确
- 检查是否能抓到数据
- 查看数据质量

### 第2步：再测试 Facebook
```bash
node src/facebook-private-scraper.js
```
- 手动登录Facebook
- 观察卖家识别准确率
- 调整商业关键词列表

### 第3步：正式运行双数据源
```bash
node src/run-all.js
```
- 完整抓取流程
- 自动生成综合报告

---

## 📋 业务规则

### ✅ 只抓取个人卖家
- 卖家类型明确为 "Private seller"
- 卖家名称不包含商业关键词
- 卖家车辆数量 < 5辆（Facebook）

### ❌ 排除车行/Dealer
- 名称含 "Motors", "Cars", "Auto" 等
- 车辆数量过多
- 描述过于专业化

---

## ⚠️ 注意事项

1. **TradeMe更稳定** - 建议作为主要数据源
2. **Facebook需要登录** - Cookie会过期，需要定期更新
3. **首次运行较慢** - 需要建立基础数据
4. **尊重网站规则** - 遵守rate limiting，不要频繁抓取

---

## 🔄 定时任务

建议配置定时任务每天运行：
```bash
# 每天 08:00 NZT
0 8 * * * cd /path/to/workspace && node src/run-all.js
```

---

💰 **Car Scout Toyota - 专注个人卖家，发现价值洼地！**

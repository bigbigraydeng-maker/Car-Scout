# Car Scout 工作文档
# 最后更新: 2026-02-24

## 用户配置要求

### 1. 搜索车型 (4种)
- ✅ Corolla
- ✅ Vitz
- ✅ Wish (新增)
- ✅ RAV4

### 2. 筛选条件
- ✅ 年份: 2005年以后 (排除2004及更早)
- ✅ 里程: 20万公里以内 (排除>200,000km)
- ✅ 卖家描述: 打开详情页获取
- ✅ 大故障排除: 检查描述中的故障关键词

### 3. 排除关键词 (自动检测)
发动机/变速箱问题:
- engine problem, engine issue, transmission problem
- gearbox issue, blown head gasket, overheating
- engine knock, oil leak, coolant leak
- 发动机问题, 变速箱, 漏油, 漏水, 过热

无法启动/严重故障:
- not running, doesn't start, wont start
- engine blown, gearbox blown
- water damage, written off, totaled
- 无法启动, 事故车

### 4. 价格范围
- 最低: $2,000
- 最高: $5,000

### 5. 搜索地区
- Auckland (奥克兰)
- Waikato (哈密尔顿及周边)

## 数据抓取结果示例

### 实际过滤案例 (Wish 搜索结果)

**❌ 被过滤车辆:**

1. **2004 Toyota Wish - $4,200**
   - 年份: 2004 ❌ (低于2005)
   - 里程: 29万公里 ❌ (超过20万)
   - 链接: https://www.facebook.com/marketplace/item/1401866394954474/

2. **2005 Toyota Wish - $3,470**
   - 年份: 2005 ⚠️ (正好边界)
   - 里程: 24万公里 ❌ (超过20万)
   - 链接: https://www.facebook.com/marketplace/item/2189766001832059/

**✅ 符合条件的车辆:**
- 需要在详情页确认里程和描述
- 如确认无大故障、里程<20万，则保留

## 技术实现

### 抓取流程
1. 使用 browser 工具访问 Facebook Marketplace 搜索页
2. 提取列表页基础信息（价格、链接、标题中的年份/里程）
3. 点击每个 listing 进入详情页
4. 提取完整描述、准确里程、年份
5. 应用筛选条件过滤
6. 保存合格车辆数据

### 文件结构
```
skills/car-scout-toyota/
├── config.js              # 配置文件
├── src/
│   ├── scraper_v2.js      # 升级版抓取脚本
│   ├── scoring.js         # 评分系统
│   └── report.js          # 报告生成
├── data/
│   └── vehicles_YYYYMMDD.json  # 每日抓取数据
└── WORK_CONFIG.md         # 本文件
```

## 搜索链接

### Corolla
- Auckland: https://www.facebook.com/marketplace/auckland/search/?query=toyota%20corolla&minPrice=2000&maxPrice=5000
- Waikato: https://www.facebook.com/marketplace/waikato/search/?query=toyota%20corolla&minPrice=2000&maxPrice=5000

### Vitz
- Auckland: https://www.facebook.com/marketplace/auckland/search/?query=toyota%20vitz&minPrice=2000&maxPrice=5000
- Waikato: https://www.facebook.com/marketplace/waikato/search/?query=toyota%20vitz&minPrice=2000&maxPrice=5000

### Wish
- Auckland: https://www.facebook.com/marketplace/auckland/search/?query=toyota%20wish&minPrice=2000&maxPrice=5000
- Waikato: https://www.facebook.com/marketplace/waikato/search/?query=toyota%20wish&minPrice=2000&maxPrice=5000

### RAV4
- Auckland: https://www.facebook.com/marketplace/auckland/search/?query=toyota%20rav4&minPrice=2000&maxPrice=5000
- Waikato: https://www.facebook.com/marketplace/waikato/search/?query=toyota%20rav4&minPrice=2000&maxPrice=5000

## 使用说明

### 手动抓取
```bash
cd skills/car-scout-toyota
node src/scraper_v2.js
```

### 自动任务
- 已配置每日 08:00 自动抓取
- 定时任务 ID: e8a8f4c9-18b4-4cab-bb55-9fc6c4df2e0d

### 查看结果
- 数据文件: `data/vehicles_YYYYMMDD.json`
- 包含: 合格车辆 + 被过滤车辆 + 过滤原因

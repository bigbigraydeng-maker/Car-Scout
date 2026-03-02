# 紧急任务：Car Scout 真实数据抓取

## 现状（你必须知道的）

Car Scout 项目目前所有车辆数据都是**模拟的假数据**。`scraper_trademe.js` 和 `scraper_puppeteer.js` 里面没有任何真实抓取逻辑，全是 `generateMockData`。

**我现在需要 TradeMe + Facebook Marketplace 的真实车辆数据。**

项目路径：`C:\Users\Zhong\.openclaw\workspace\skills\car-scout\`

---

## 任务 1：TradeMe 真实抓取

### 方案：Puppeteer + Stealth（已安装）

`package.json` 已有依赖：
```json
"puppeteer": "^21.11.0",
"puppeteer-extra": "^3.3.6",
"puppeteer-extra-plugin-stealth": "^2.11.2"
```

先跑 `npm install`（在 `C:\Users\Zhong\.openclaw\workspace\skills\car-scout\` 目录下）。

### TradeMe 搜索 URL（共 12 个 = 6 车型 × 2 地区）

**Auckland (region=100003):**
- https://www.trademe.co.nz/a/motors/cars/toyota/corolla/search?price_min=2000&price_max=5000&year_min=2005&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/toyota/vitz/search?price_min=2000&price_max=5000&year_min=2005&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/toyota/wish/search?price_min=2000&price_max=5000&year_min=2005&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/toyota/rav4/search?price_min=2000&price_max=5000&year_min=2005&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/honda/fit/search?price_min=2000&price_max=5000&year_min=2006&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/mazda/demio/search?price_min=2000&price_max=5000&year_min=2006&odometer_max=160000&region=100003

**Waikato (region=100010):** 同上 URL，把 `region=100003` 换成 `region=100010`

### TradeMe 抓取要点

1. **不需要登录** — TradeMe 搜索和 listing 详情页都是公开的
2. **列表页提取**：标题、价格、位置、listing 链接
3. **详情页提取**：年份、里程、卖家类型(Private/Dealer)、完整描述、上架日期
4. **分页处理**：检查是否有 "Next" 按钮或 `?page=2` 参数
5. **反爬注意**：
   - 用 `puppeteer-extra-plugin-stealth`
   - 每次请求间隔 2-5 秒随机延迟
   - 设置真实 User-Agent 和 viewport

### TradeMe 页面结构提示

- 搜索结果列表：每个 listing 是一个卡片，包含标题、价格、缩略图
- Listing URL 格式：`https://www.trademe.co.nz/a/motors/cars/.../listing/XXXXXXX`
- 详情页：年份/里程/引擎等在 "Key details" 区域
- 卖家信息：页面会显示 "Private seller" 或 dealer 名称
- 描述文本：在详情页主体区域

---

## 任务 2：Facebook Marketplace 真实抓取

### 方案选择（二选一）

**方案 A（推荐）：用 Claude in Chrome 的浏览器自动化**
- 如果 Trae 的环境有 Chrome 浏览器且已登录 Facebook
- 直接访问 Marketplace URL，用 DOM 提取数据

**方案 B：Puppeteer + Cookie 登录**
- Facebook 需要登录才能看完整 Marketplace
- 用浏览器手动登录 Facebook → 导出 cookies → Puppeteer 加载 cookies
- 或用 `puppeteer` 打开 Facebook 手动登录一次，保存 session

### Facebook Marketplace 搜索 URL

基础格式：`https://www.facebook.com/marketplace/auckland/search/?query=toyota+corolla&minPrice=2000&maxPrice=5000&category_id=807311116002604`

需要搜索的车型：
- toyota corolla
- toyota vitz
- toyota wish
- toyota rav4
- honda fit
- mazda demio

地区：auckland, hamilton (Waikato)

### Facebook 抓取要点

1. **必须登录** — 否则看不到完整列表和详情
2. **动态加载** — 需要滚动页面触发 lazy load
3. **详情页** — 点击 listing 进入详情获取完整描述
4. **年份/里程提取** — Facebook 车辆 listing 有专门字段显示
5. **卖家判断** — 个人主页 vs 商家主页
6. **反爬严格** — 操作间隔要长（3-8 秒），模拟真人滚动

---

## 输出格式（严格遵守！）

两个平台的数据合并到一个文件：

```
C:\Users\Zhong\.openclaw\workspace\skills\car-scout\data\vehicles_YYYYMMDD.json
```

日期用实际抓取日期，如 `vehicles_20260228.json`

### JSON 结构

```json
{
  "scrapeDate": "2026-02-28T20:00:00.000Z",
  "sources": {
    "trademe": { "count": 15, "scraped": true },
    "facebook": { "count": 10, "scraped": true }
  },
  "totalCount": 25,
  "vehicles": [
    {
      "id": "tm_5798359074",
      "title": "2011 Toyota Wish 1.8 Petrol",
      "model": "Wish",
      "year": 2011,
      "price": 2056,
      "mileage": 140000,
      "location": "North Shore, Auckland",
      "seller": "Private",
      "description": "卖家的完整描述文字，一个字都不要省，评分系统需要扫描急售关键词和故障关键词",
      "listingUrl": "https://www.trademe.co.nz/a/motors/cars/toyota/wish/listing/5798359074",
      "platform": "trademe",
      "postedDate": "2026-02-20"
    },
    {
      "id": "fb_1234567890",
      "title": "Toyota Corolla 2008 Auto",
      "model": "Corolla",
      "year": 2008,
      "price": 3500,
      "mileage": 135000,
      "location": "Auckland",
      "seller": "Private",
      "description": "Moving overseas, must sell! Well maintained...",
      "listingUrl": "https://www.facebook.com/marketplace/item/1234567890",
      "platform": "facebook",
      "postedDate": "2026-02-25"
    }
  ]
}
```

### 字段规则

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | TradeMe 用 `tm_` 前缀，Facebook 用 `fb_` 前缀 + listing ID |
| model | string | **必须** 是这 6 个之一：Corolla, Vitz, Wish, RAV4, Honda Fit, Demio |
| year | number | 整数，如 2011。**不能是 null** |
| price | number | NZD 整数。拍卖的取当前出价。**不能是 null** |
| mileage | number | 公里数整数。如果原文是 "140,000 km" 提取为 140000。**不能是 null** |
| location | string | 包含城市名 |
| seller | string | "Private" 或 "Dealer" |
| description | string | **完整的**卖家描述，不要截断不要省略！评分需要扫描关键词 |
| listingUrl | string | 真实可点击的 listing 链接 |
| platform | string | "trademe" 或 "facebook" |
| postedDate | string | YYYY-MM-DD 格式 |

### ⚠️ 关键注意

- **year、price、mileage 这三个字段绝对不能是 null！** 否则评分脚本会跳过该车辆
- **description 要完整！** 评分系统检测急售信号（如 "moving overseas", "must sell"）和故障关键词（如 "engine problem"），截断的描述会导致误判
- **seller 必须准确！** Dealer 车辆会被评分系统直接排除

---

## 筛选条件（硬指标）

| 条件 | 值 |
|------|-----|
| 价格 | $2,000 - $5,000 NZD |
| 年份 | ≥ 2005 |
| 里程 | ≤ 160,000 km |
| 卖家 | 私人卖家优先（Dealer 也抓回来，评分系统会过滤） |
| 车型 | Corolla, Vitz, Wish, RAV4, Honda Fit, Demio |
| 地区 | Auckland, Waikato |

抓取时可以把 Dealer 的也抓进来没关系，评分脚本会自动过滤掉。
但 year/price/mileage 超出范围的就不用抓了，直接跳过。

---

## 抓完数据后执行

### Step 2：跑评分
```bash
cd C:\Users\Zhong\.openclaw\workspace\skills\car-scout
node src/run-flip.js
```

自动读取最新的 `vehicles_YYYYMMDD.json`，输出：
- `data/scored_*_flip.json` — 评分结果
- `data/report_*_flip_full.md` — 完整报告
- `data/report_*_flip_short.md` — 摘要报告

### Step 3：发飞书
```bash
node src/send-feishu.js
```

自动把报告发给飞书。

---

## 参考文件

| 文件 | 用途 |
|------|------|
| `config.json` | 所有配置参数（车型、价格、评分权重等） |
| `RULES.md` | 完整的 Flip Score v3.0 评分规则 |
| `src/scoring.js` | 评分逻辑代码 |
| `src/run-flip.js` | 评分运行脚本 |
| `src/send-feishu.js` | 飞书发送脚本 |
| `package.json` | 已有 puppeteer + stealth 依赖 |

---

## 优先级

1. **TradeMe 先做** — 不需要登录，数据结构规整，成功率高
2. **Facebook 后做** — 需要登录，反爬严格，但数据量通常更大
3. **两个都做完后再跑评分** — 合并到一个 JSON 文件里

**目标：今天拿到真实数据，跑出评分报告。不要再生成模拟数据！**

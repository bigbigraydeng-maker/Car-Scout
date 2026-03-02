# 给 Trae 的任务

## 背景
Car Scout 的评分系统已经从"找好车"升级为"找能倒卖的车"(Flip Score v3.0)。
代码全部写好了，就差一步：去 TradeMe 抓真实数据跑评分。

所有代码在：`C:\Users\Zhong\.openclaw\workspace\skills\car-scout\`

## 你只需要做 3 步

### Step 1：抓 TradeMe 数据

打开以下 URL 抓取车辆列表（Auckland + Waikato 各跑一遍）：

**Auckland (region=100003):**
- https://www.trademe.co.nz/a/motors/cars/toyota/corolla/search?price_min=2000&price_max=5000&year_min=2005&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/toyota/vitz/search?price_min=2000&price_max=5000&year_min=2005&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/toyota/wish/search?price_min=2000&price_max=5000&year_min=2005&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/toyota/rav4/search?price_min=2000&price_max=5000&year_min=2005&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/honda/fit/search?price_min=2000&price_max=5000&year_min=2006&odometer_max=160000&region=100003
- https://www.trademe.co.nz/a/motors/cars/mazda/demio/search?price_min=2000&price_max=5000&year_min=2006&odometer_max=160000&region=100003

**Waikato (region=100010):** 同上，把 region=100003 换成 region=100010

把所有结果合并存到一个文件：
```
C:\Users\Zhong\.openclaw\workspace\skills\car-scout\data\vehicles_20260228.json
```

**JSON 格式必须是这样：**
```json
{
  "scrapeDate": "2026-02-28T20:00:00.000Z",
  "totalCount": 25,
  "vehicles": [
    {
      "id": "tm_5798359074",
      "title": "2011 Toyota Wish",
      "model": "Wish",
      "year": 2011,
      "price": 2056,
      "mileage": 140000,
      "location": "North Shore, Auckland",
      "seller": "Private",
      "description": "完整的卖家描述文本，越全越好，评分系统需要检测急售信号和问题关键词",
      "listingUrl": "https://www.trademe.co.nz/a/motors/cars/toyota/wish/listing/5798359074",
      "platform": "trademe",
      "postedDate": "2026-02-20"
    }
  ]
}
```

**必填字段说明：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | "tm_" + listing ID |
| model | string | 必须是这6个之一: Corolla, Vitz, Wish, RAV4, Honda Fit, Demio |
| year | number | 车辆年份，如 2011 |
| price | number | 当前价格 NZD，如 2056 |
| mileage | number | 公里数，如 140000 |
| location | string | 包含城市名，如 "North Shore, Auckland" |
| seller | string | "Private" 或 "Dealer" |
| description | string | 卖家完整描述（很重要，评分要用） |
| listingUrl | string | TradeMe listing 完整链接 |
| platform | string | "trademe" |
| postedDate | string | "YYYY-MM-DD" 格式 |

### Step 2：跑评分
```bash
cd C:\Users\Zhong\.openclaw\workspace\skills\car-scout
node src/run-flip.js
```
这个脚本会自动：
- 读取最新的 `vehicles_YYYYMMDD.json`
- 用 Flip Score 评分（利润、周转、整备、议价 4个维度）
- 过滤掉不合格的（>160k km、Dealer、机械故障）
- 输出评分结果到 `data/scored_*_flip.json`
- 输出报告到 `data/report_*_flip_full.md` 和 `_short.md`

### Step 3：发飞书
```bash
node src/send-feishu.js
```
会自动找最新的 flip 报告发给老板。

## 完事！

如果有问题可以参考：
- `RULES.md` — 完整评分规则
- `src/scoring.js` — 评分逻辑代码
- `config.json` — 所有配置参数

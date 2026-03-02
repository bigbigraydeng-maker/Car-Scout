# Car Scout 排除列表
# 用户标记为放弃的车辆，后续扫描将跳过

## 排除规则说明
- 车行车辆 (dealer)
- 公里数过高 (>160k km 或隐藏/可疑)
- 虚假信息/链接无效
- 非新西兰车辆

## 已排除车辆

### 2026-03-02 添加

| # | 车型 | 价格 | 原因 | 链接 |
|---|------|------|------|------|
| 2 | 2010 Swift | $3,299 | 车行的车 | https://www.facebook.com/marketplace/item/1282302423822798/ |
| 3 | 2011 Prius | $4,300 | 公里数 288xxx | https://www.facebook.com/marketplace/item/25954925787521200/ |
| 4 | 2009 Vitz | $3,800 | Odometer: 2******km (隐藏) | https://www.facebook.com/marketplace/item/1958985288341311/ |
| 5 | 2009 Vitz | $3,000 | 221,000kms | https://www.facebook.com/marketplace/item/1937548966861939/ |
| 6 | 2009 Swift | $2,950 | 放弃 | https://www.facebook.com/marketplace/item/3372503292918470/ |
| 8 | 2020 RAV4 | $4,600 | 假的 | https://www.facebook.com/marketplace/item/33290180997295286/ |
| 9 | 2012 Demio | $3,500 | 链接打不开 | https://www.facebook.com/marketplace/item/815689881552977/ |
| 10 | 2010 Honda Fit | $3,200 | 美国的车，不是新西兰 | https://www.facebook.com/marketplace/item/1584964309474865/ |
| - | 2020 Honda Fit | $3,950 | 实际是摩托车 | https://www.facebook.com/marketplace/item/895277649878970/ |

## 排除 ID 列表 (用于自动过滤)
```json
[
  "1282302423822798",
  "25954925787521200",
  "1958985288341311",
  "1937548966861939",
  "3372503292918470",
  "33290180997295286",
  "815689881552977",
  "1584964309474865",
  "895277649878970"
]
```

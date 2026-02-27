# Car Scout 用户要求更新

## 日期
2026-02-20

## 用户明确要求

### 1. 语言要求
- **所有输出必须是中文**
- 包括报告、分析、车辆描述等

### 2. 卖家类型
- **只抓取个人卖家 (Private Seller)**
- **排除所有车行 (Car Dealer)**
- TradeMe: 使用 `seller_type=private` 参数
- Facebook: 使用关键词过滤识别车行

### 3. 品牌筛选
- **目前只关注丰田 (Toyota)**
- 目标车型:
  - Toyota Corolla
  - Toyota Vitz / Yaris
  - Toyota RAV4
- 其他品牌暂时不考虑

### 4. 新增数据源
- **Turners Auction** 拍卖行机会
- 需要添加 Turners 抓取支持
- 关注拍卖结束前的低价机会

## 实施状态

- [x] TradeMe 个人卖家抓取（已配置）
- [x] Facebook 个人卖家识别（已实现）
- [ ] Turners Auction 抓取（待开发）
- [ ] 中文输出全面化（待更新）

## 下次执行时

1. 只输出 Toyota 车辆
2. 只显示个人卖家
3. 所有内容中文
4. 添加 Turners 拍卖数据

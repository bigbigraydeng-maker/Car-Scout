# Car Scout v3.0 - 倒卖评分规则

## 核心理念
以"能赚多少、多快赚到"为唯一目标。不是找好车，是找能赚钱的车。

---

## 硬约束 (不通过直接踢)

| 条件 | 值 | 说明 |
|------|-----|------|
| **价格** | $2,000 - $5,000 NZD | 超出直接排除 |
| **年份** | ≥ 2005 | 2004及更早排除 |
| **里程** | ≤ 160,000 km | 所有车型统一 |
| **卖家** | 仅个人卖家 | Dealer 全部排除 |
| **机械故障** | 零容忍 | 有任何机械问题关键词直接踢 |

### 车型范围
Corolla, Vitz, Wish, RAV4, Honda Fit, Demio

### 地区范围
Auckland, Waikato

### 平台
Facebook Marketplace, TradeMe, Skykiwi 论坛

---

## Flip Score 评分 (100分)

### 1. 净利润空间 (35分)

```
净利润 = 预估售价 - 买入价 - 整备成本
利润率 = 净利润 / 买入价

利润率 ≥ 40%  → 35分
利润率 30-40% → 30分
利润率 20-30% → 24分
利润率 15-20% → 18分
利润率 10-15% → 12分
利润率 5-10%  → 6分
利润率 < 5%   → 0分
```

### 2. 周转速度 (30分)

| 等级 | 分数 | 车型+地区 | 预计出手 |
|------|------|----------|---------|
| **A** | 30 | Corolla/Vitz/Fit (Auckland) | 1-2周 |
| **B** | 22 | Corolla/Vitz/Fit (Waikato), RAV4/Demio (Auckland) | 2-3周 |
| **C** | 15 | Wish (Auckland), RAV4/Demio (Waikato) | 3-4周 |
| **D** | 8  | Wish (Waikato), 其他 | 4周+ |

### 3. 整备成本 (15分)

| 预估费用 | 分数 | 典型情况 |
|----------|------|---------|
| ≤ $150 | 15 | WOF有效，只需清洁 |
| $150-$350 | 12 | 小修小补 |
| $350-$600 | 8 | WOF快到期 |
| $600-$1000 | 4 | 无WOF，需要修理 |
| > $1000 | 0 | 成本太高 |

### 4. 议价潜力 (20分)

**急售信号检测 (最高10分):**
- moving overseas / leaving nz → +4分
- need gone / must sell / urgent → +4分
- price drop / reduced → +4分
- negotiable / make an offer / ono → +3分
- 出国甩卖 / 急转 / 急售 → +4分

**挂牌天数 (最高6分):**
- > 21天 → +6分 (卖家急了)
- 14-21天 → +4分
- 7-14天 → +2分
- < 7天 → +0分

**定价偏高 (最高4分):**
- 标价接近市场价 → +4分 (砍价空间大)
- 已有折扣 → +2分

---

## Flip 等级

| 等级 | 分数 | 行动 |
|------|------|------|
| **S级** 🔥 | 80+ | 立即行动，先打电话再看车 |
| **A级** ⭐ | 65-79 | 值得看车，准备议价策略 |
| **B级** 📋 | 50-64 | 谨慎考虑，必须砍到目标价 |
| **C级** ⛔ | < 50 | 不建议，除非有特殊信息 |

---

## 排除关键词 (机械硬伤)

### 英文
engine problem, engine issue, transmission problem, gearbox issue,
blown head gasket, overheating, engine knock, oil leak, coolant leak,
not running, doesn't start, wont start, engine blown, gearbox blown,
water damage, written off, totaled, spares or repair, as is,
project car, for parts, wrecking, head gasket, timing chain,
cambelt due, timing belt due, needs engine, needs gearbox,
smoke, smoking, knocking, rattling, flood damage, fire damage, salvage

### 中文
发动机问题, 变速箱问题, 漏油, 漏水, 过热, 无法启动, 事故车, 泡水车, 报废

---

## 高整备成本信号 (扣整备分)

needs new tyres, battery flat, ac not working, air con broken,
dent, panel damage, rust, rusty, no wof, no warrant,
wof expired, no rego, rego expired, scratch, 底盘生锈

---

## 市场参考售价 (NZD)

| 车型 | 2005 | 2008 | 2010 | 2012 | 2015 |
|------|------|------|------|------|------|
| Corolla | 4,500 | 5,200 | 6,000 | 7,000 | 8,500 |
| Vitz | 4,000 | 4,800 | 5,500 | 6,500 | 7,500 |
| Wish | 4,200 | 5,000 | 5,800 | 6,800 | 8,000 |
| RAV4 | 5,500 | 6,500 | 7,500 | 9,000 | 12,000 |
| Honda Fit | 4,000 | 4,800 | 5,500 | 6,500 | 7,500 |
| Demio | 3,800 | 4,500 | 5,200 | 6,000 | 7,000 |

---

## 每日扫描流程

```
08:00 - Facebook Marketplace 扫描
08:30 - TradeMe 扫描
09:00 - Skykiwi 论坛扫描
09:30 - Flip Score 评分 + 过滤
09:35 - 生成报告 + 飞书推送
```

## 通知规则

- **即时通知**: Flip Score 80+ 的新车辆
- **每日摘要**: 08:30 推送所有合格车辆
- **拍卖提醒**: TradeMe 拍卖最后 1 小时

---

更新日期: 2026-02-28
版本: v3.0 Flip Score

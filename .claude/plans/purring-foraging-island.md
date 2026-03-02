# 修复预估售价过于乐观

## Context

报告中预估售价严重偏高（如 2005 Vitz $4K→零售$9,288，利润123%），导致利润虚高。
根本原因：live market pricing 抓的 $8K-$15K 区间全是**车商/dealer 挂牌价**，直接当私人转售价用；
FB 车辆里程未知时按 0km 计算（不罚分）；年份匹配过于宽松（2005年的车用2014年的中位数）。

---

## 修改文件: `src/scoring.js` — `estimateSellPrice()` 函数

### Fix 1: 删除 `_overall` 兜底
```
// 删除 L162-166:
if (!price && modelData._overall) {
  price = modelData._overall.median;
  source = 'live-overall';
}
```
**原因**: `_overall` 中位数被高年份车拉高（如 Vitz overall=$11,949 主要来自 2014-2017），对 2005-2008 完全不适用。删除后自动回落到更准确的静态表。

### Fix 2: Live nearby 扩展到 ±3年，加年份差衰减
```javascript
// 替换 L151-160
if (!price && year) {
  for (const offset of [1, -1, 2, -2, 3, -3]) {
    const nearby = String(year + offset);
    if (modelData[nearby] && modelData[nearby].count >= 2) {
      price = modelData[nearby].median;
      // 年份差每年衰减 5%
      price *= (1 - Math.abs(offset) * 0.05);
      source = 'live-nearby';
      break;
    }
  }
}
```

### Fix 3: Live 数据打私人转售折扣 (×0.78)
```javascript
// 在 fallback static 之前, live price 打折
if (price && source.startsWith('live')) {
  price *= 0.78;  // 车商→私人 约-22%
}
```

### Fix 4: 未知里程默认 130,000km
```javascript
// L195: 改
const mileageOver80k = Math.max(0, (mileage || 130000) - 80000);
// was: (mileage || 0)
```

---

## 效果对比（修复前 → 修复后）

| 车辆 | 买价 | 修复前零售 | 修复后零售 | 修复前利润 | 修复后利润 |
|------|------|-----------|-----------|-----------|-----------|
| 2005 Vitz 151k | $4,000 | $9,288 (123%) | ~$3,120 (static) → ❌不入选 | $4,938 | 负 |
| 2005 Corolla ?km | $3,800 | $11,362 (190%) | ~$3,380 (static+130k) → ❌不入选 | $7,212 | 负 |
| 2008 Honda Fit ?km | $4,800 | $10,937 (121%) | ~$3,600 (static+130k) → ❌不入选 | $5,787 | 负 |
| 2007 RAV4 88k | $2,750 | $12,670 (343%) | ~$7,630 (live×0.78) | $9,420 | ~$4,530 (165%) |
| 2009 Vitz 148k | $4,800 | $7,856 (57%) | ~$5,440 (live-nearby×gap×0.78) | $2,756 | ~$340 (7%) |

**效果**: 只有买价真正低于市场的车（如 RAV4 $2,750/88k）才会显示高利润。价格虚高或里程未知的车会被过滤或降低评分。

---

## 验证

1. `node src/run-flip.js` — 重新评分
2. `node src/generate-final-report.js --no-send` — 检查利润是否合理（大部分应 <100%）
3. 确认 OK 后 `--force` 发飞书

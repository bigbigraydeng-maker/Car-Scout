/**
 * Car Scout v3.0 - Flip Scoring System
 * 倒卖评分模型 (100分制)
 *
 * 4 维度:
 *   净利润空间  35分 — 能赚多少
 *   周转速度    30分 — 多快卖出
 *   整备成本    15分 — 要花多少准备
 *   议价潜力    20分 — 还能砍多少
 */

const fs = require('fs');
const path = require('path');

// ─── 市场参考售价 (NZD, 个人转售价 @ 80k km 基线) ───
// 数据来源: 基于 NZ 二手车 FB/TM 私人成交价校准 (非车商价)
// 用于: 评估翻卖后可实现的私人出售价格
const MARKET_SELL_PRICES = {
  'Corolla':   { 2005: 4500, 2008: 5200, 2010: 6000, 2012: 7000, 2015: 8500 },
  'Vitz':      { 2005: 3500, 2008: 4200, 2010: 5000, 2012: 6000, 2015: 7000 },
  'Wish':      { 2005: 3500, 2008: 4200, 2010: 5000, 2012: 6000, 2015: 7500 },
  'RAV4':      { 2005: 5500, 2008: 6500, 2010: 7500, 2012: 9000, 2015: 12000 },
  'Honda Fit': { 2006: 3500, 2008: 4200, 2010: 5000, 2012: 6000, 2015: 7000 },
  'Demio':     { 2006: 3000, 2008: 3800, 2010: 4500, 2012: 5500, 2015: 6500 },
  // v4.1 新增车型
  'Aqua':      { 2012: 6500, 2014: 8000, 2016: 10000 },
  'Swift':     { 2005: 2500, 2008: 3500, 2010: 4500, 2012: 5500, 2015: 7500 },
  'Prius':     { 2005: 3500, 2008: 5000, 2010: 6500, 2012: 8000, 2015: 10000 },
  'Axela':     { 2005: 3500, 2008: 5000, 2010: 6000, 2012: 7500, 2015: 10000 },
  'Civic':     { 2006: 3500, 2008: 5000, 2010: 6000, 2012: 7500, 2015: 10000 },
  'Tiida':     { 2005: 2800, 2008: 3800, 2010: 4500, 2012: 5500, 2015: 7000 },
};

// ─── 周转等级 (按车型+地区) ───
const TURNOVER = {
  // A级: 1-2周出手 (快速周转车型)
  'Corolla_auckland': 'A', 'Vitz_auckland': 'A', 'Honda Fit_auckland': 'A',
  'Fielder_auckland': 'A', 'Aqua_auckland': 'A',
  'Swift_auckland': 'A', 'Prius_auckland': 'A',
  // B级: 2-3周
  'Corolla_waikato': 'B', 'Vitz_waikato': 'B', 'Honda Fit_waikato': 'B',
  'RAV4_auckland': 'B', 'Demio_auckland': 'B',
  'Aqua_waikato': 'B', 'Swift_waikato': 'B', 'Prius_waikato': 'B',
  'Axela_auckland': 'B', 'Civic_auckland': 'B', 'Tiida_auckland': 'B',
  // C级: 3-4周
  'Wish_auckland': 'C', 'RAV4_waikato': 'C', 'Demio_waikato': 'C',
  'Axela_waikato': 'C', 'Civic_waikato': 'C', 'Tiida_waikato': 'C',
  // D级: 4周+
  'Wish_waikato': 'D'
};

// ─── 急售信号 ───
const URGENT_SIGNALS = [
  'moving overseas', 'leaving nz', 'leaving country',
  'need gone', 'must sell', 'urgent sale', 'urgent',
  'price drop', 'reduced', 'negotiable', 'make an offer',
  'open to offers', 'or near offer', 'ono',
  '出国甩卖', '急转', '急售', '便宜卖'
];

// ─── 高整备成本信号 ───
const HIGH_PREP_SIGNALS = [
  'needs new tyres', 'tyres need replacing', 'tyre',
  'battery flat', 'new battery needed',
  'ac not working', 'air con broken', 'no ac', 'no aircon',
  'dent', 'panel damage', 'body damage',
  'rust', 'rusty', '底盘生锈',
  'no wof', 'no warrant', 'wof expired',
  'no rego', 'rego expired', 'scratch'
];

// ─── 排除关键词 (机械硬伤，直接踢) ───
const EXCLUDE_KEYWORDS = [
  'engine problem', 'engine issue', 'transmission problem',
  'gearbox issue', 'blown head gasket', 'overheating',
  'engine knock', 'oil leak', 'coolant leak',
  'not running', "doesn't start", 'wont start', "won't start",
  'engine blown', 'gearbox blown', 'water damage',
  'written off', 'totaled', 'spares or repair',
  'as is', 'project car', 'for parts', 'wrecking',
  'head gasket', 'timing chain', 'cambelt due', 'timing belt due',
  'needs engine', 'needs gearbox', 'needs transmission',
  'smoke', 'smoking', 'knocking', 'rattling',
  'flood damage', 'fire damage', 'salvage',
  '发动机问题', '变速箱问题', '漏油', '漏水', '过热',
  '无法启动', '事故车', '泡水车', '报废'
];

// ─── 市场估价引擎 (KNN, 基于真实 TM 数据) ───
const { valuateVehicle } = require('./market-valuation');

/**
 * 静态表估价 (兜底: 无市场数据时使用)
 * 基于 80k km 基线的手动校准参考价
 */
function getStaticPrice(model, year, mileage, location) {
  const prices = MARKET_SELL_PRICES[model];
  if (!prices) return null;

  let price;
  const years = Object.keys(prices).map(Number).sort((a, b) => a - b);

  if (!year || year <= years[0]) {
    price = prices[years[0]];
  } else if (year >= years[years.length - 1]) {
    price = prices[years[years.length - 1]];
  } else {
    let lo = years[0], hi = years[years.length - 1];
    for (let i = 0; i < years.length - 1; i++) {
      if (year >= years[i] && year <= years[i + 1]) {
        lo = years[i]; hi = years[i + 1]; break;
      }
    }
    const ratio = (year - lo) / (hi - lo);
    price = prices[lo] + ratio * (prices[hi] - prices[lo]);
  }

  // 里程折旧: baseline 80k, 每多 80k 降 25%, 封顶 50%
  const mileageOver80k = Math.max(0, (mileage || 130000) - 80000);
  const mileageDiscount = Math.min(0.5, (mileageOver80k / 80000) * 0.25);
  price *= (1 - mileageDiscount);

  if (location && location.toLowerCase().includes('waikato')) {
    price *= 0.95;
  }

  return Math.round(price);
}

/**
 * 估算市场转售价
 * 优先级: KNN市场数据 → low时与静态均值 → 纯静态表
 */
function estimateSellPrice(model, year, mileage, location) {
  // 1) 尝试 KNN 市场数据估价
  const valuation = valuateVehicle(model, year, mileage, location);

  if (valuation && valuation.confidence !== 'none') {
    if (valuation.confidence === 'low') {
      // 低置信: 与静态表取均值 (降低极端值风险)
      const staticPrice = getStaticPrice(model, year, mileage, location);
      if (staticPrice) {
        return Math.round((valuation.price + staticPrice) / 2);
      }
    }
    return valuation.price;
  }

  // 2) 回落: 静态表
  return getStaticPrice(model, year, mileage, location);
}

/**
 * 估算整备成本
 */
function estimatePrepCost(vehicle) {
  let cost = 150; // 基础清洁整备
  const desc = (vehicle.description || '').toLowerCase();

  // WOF 状态
  if (desc.includes('no wof') || desc.includes('no warrant') || desc.includes('wof expired')) {
    cost += 700;
  } else if (desc.includes('wof') && (desc.includes('month') || desc.includes('valid'))) {
    cost += 0; // WOF 有效
  } else {
    cost += 200; // 未知状态，预留
  }

  // 高成本信号
  const matches = HIGH_PREP_SIGNALS.filter(s => desc.includes(s));
  cost += matches.length * 150;

  return Math.min(cost, 1500); // 封顶 1500
}

/**
 * 检测急售信号
 */
function detectUrgentSignals(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  return URGENT_SIGNALS.filter(s => desc.includes(s));
}

/**
 * 检查是否有机械硬伤
 */
function hasMechanicalIssue(description) {
  if (!description) return false;
  const desc = description.toLowerCase();
  return EXCLUDE_KEYWORDS.some(kw => desc.includes(kw));
}

/**
 * 计算挂牌天数
 */
function getDaysListed(postedDate) {
  if (!postedDate) return 0;
  const posted = new Date(postedDate);
  const now = new Date();
  return Math.floor((now - posted) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════
// 4 维度评分
// ═══════════════════════════════════════════

/**
 * 1. 净利润空间 (35分)
 */
function scoreProfitMargin(buyPrice, sellPrice, prepCost) {
  const netProfit = sellPrice - buyPrice - prepCost;
  const margin = netProfit / buyPrice;

  if (margin >= 0.40) return 35;
  if (margin >= 0.30) return 30;
  if (margin >= 0.20) return 24;
  if (margin >= 0.15) return 18;
  if (margin >= 0.10) return 12;
  if (margin >= 0.05) return 6;
  return 0;
}

/**
 * 2. 周转速度 (30分)
 */
function scoreTurnover(model, location) {
  const loc = (location || '').toLowerCase();
  const region = loc.includes('auckland') ? 'auckland' :
                 loc.includes('waikato') || loc.includes('hamilton') ? 'waikato' :
                 'other';

  const key = `${model}_${region}`;
  const grade = TURNOVER[key] || 'D';

  switch (grade) {
    case 'A': return 30;
    case 'B': return 22;
    case 'C': return 15;
    case 'D': return 8;
    default: return 5;
  }
}

/**
 * 3. 整备成本 (15分) — 越低越好
 */
function scorePrepCost(prepCost) {
  if (prepCost <= 150) return 15;   // 只需清洁
  if (prepCost <= 350) return 12;   // 小修小补
  if (prepCost <= 600) return 8;    // 中等花费
  if (prepCost <= 1000) return 4;   // 较大花费
  return 0;                          // 高成本
}

/**
 * 4. 议价潜力 (20分)
 */
function scoreNegotiation(vehicle) {
  let score = 0;
  const desc = (vehicle.description || '').toLowerCase();
  const daysListed = getDaysListed(vehicle.postedDate);

  // 急售信号 (最高 10 分)
  const urgentSignals = detectUrgentSignals(vehicle.description);
  score += Math.min(urgentSignals.length * 4, 10);

  // 挂牌天数 (最高 6 分)
  if (daysListed > 21) score += 6;
  else if (daysListed > 14) score += 4;
  else if (daysListed > 7) score += 2;

  // 定价偏高 (最高 4 分) — 说明还价空间大
  const sellPrice = estimateSellPrice(vehicle.model, vehicle.year, vehicle.mileage, vehicle.location);
  if (sellPrice) {
    const overpriceRatio = vehicle.price / sellPrice;
    if (overpriceRatio > 0.95) score += 4;      // 标价接近市场价，空间大
    else if (overpriceRatio > 0.85) score += 2;  // 已经有折扣
    // 标价很低的，砍不了多少
  }

  return Math.min(score, 20);
}

// ═══════════════════════════════════════════
// 主评分函数
// ═══════════════════════════════════════════

/**
 * 计算 Flip Score
 */
function calculateFlipScore(vehicle) {
  // 硬约束检查
  if (vehicle.mileage > 160000) return null;
  if (vehicle.year < 2005) return null;
  if (vehicle.price < 2500 || vehicle.price > 8000) return null;
  if (hasMechanicalIssue(vehicle.description)) return null;
  // 排除 Dealer
  if (vehicle.seller && vehicle.seller.toLowerCase() === 'dealer') return null;

  const sellPrice = estimateSellPrice(vehicle.model, vehicle.year, vehicle.mileage, vehicle.location);
  if (!sellPrice) return null;

  const prepCost = estimatePrepCost(vehicle);
  const netProfit = sellPrice - vehicle.price - prepCost;
  const profitMargin = netProfit / vehicle.price;
  const urgentSignals = detectUrgentSignals(vehicle.description);
  const daysListed = getDaysListed(vehicle.postedDate);

  // 4 维度评分
  const scores = {
    profitMargin: scoreProfitMargin(vehicle.price, sellPrice, prepCost),
    turnover: scoreTurnover(vehicle.model, vehicle.location),
    prepCost: scorePrepCost(prepCost),
    negotiation: scoreNegotiation(vehicle)
  };

  const total = scores.profitMargin + scores.turnover + scores.prepCost + scores.negotiation;

  // Flip Grade
  let flipGrade;
  if (total >= 80) flipGrade = 'S';
  else if (total >= 65) flipGrade = 'A';
  else if (total >= 50) flipGrade = 'B';
  else flipGrade = 'C';

  // 周转等级
  const loc = (vehicle.location || '').toLowerCase();
  const region = loc.includes('auckland') ? 'auckland' :
                 loc.includes('waikato') || loc.includes('hamilton') ? 'waikato' : 'other';
  const turnoverGrade = TURNOVER[`${vehicle.model}_${region}`] || 'D';

  return {
    total,
    flipGrade,
    breakdown: scores,
    sellPrice,
    prepCost,
    netProfit,
    profitMargin: Math.round(profitMargin * 100),
    turnoverGrade,
    daysListed,
    urgentSignals,
    suggestedMaxBuy: Math.round(sellPrice * 0.7 - prepCost), // 目标 30% 利润
    suggestedBid: Math.round(vehicle.price * 0.88)            // 砍价 12%
  };
}

/**
 * 批量评分 + 过滤
 */
function scoreVehicles(vehicles) {
  const results = [];

  for (const vehicle of vehicles) {
    const flip = calculateFlipScore(vehicle);
    if (!flip) continue; // 不符合硬约束

    results.push({
      ...vehicle,
      flipScore: flip.total,
      flipGrade: flip.flipGrade,
      scoreBreakdown: flip.breakdown,
      estimatedSellPrice: flip.sellPrice,
      estimatedPrepCost: flip.prepCost,
      estimatedNetProfit: flip.netProfit,
      profitMargin: flip.profitMargin,
      turnoverGrade: flip.turnoverGrade,
      daysListed: flip.daysListed,
      urgentSignals: flip.urgentSignals,
      suggestedMaxBuy: flip.suggestedMaxBuy,
      suggestedBid: flip.suggestedBid
    });
  }

  // 按 flipScore 降序
  results.sort((a, b) => b.flipScore - a.flipScore);
  return results;
}

// 主函数
function main() {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const dataPath = path.join(__dirname, '..', 'data', `vehicles_${date}.json`);

  if (!fs.existsSync(dataPath)) {
    console.error('No data file:', dataPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const scored = scoreVehicles(data.vehicles);

  const scoredPath = path.join(__dirname, '..', 'data', `scored_${date}.json`);
  fs.writeFileSync(scoredPath, JSON.stringify({
    scoredDate: new Date().toISOString(),
    version: '3.0-flip',
    totalScanned: data.vehicles.length,
    totalQualified: scored.length,
    vehicles: scored
  }, null, 2));

  console.log(`Scored ${scored.length}/${data.vehicles.length} vehicles`);
  console.log(`S-grade: ${scored.filter(v => v.flipGrade === 'S').length}`);
  console.log(`A-grade: ${scored.filter(v => v.flipGrade === 'A').length}`);

  return scored;
}

if (require.main === module) {
  main();
}

module.exports = {
  scoreVehicles,
  calculateFlipScore,
  estimateSellPrice,
  estimatePrepCost,
  hasMechanicalIssue,
  detectUrgentSignals,
  EXCLUDE_KEYWORDS
};

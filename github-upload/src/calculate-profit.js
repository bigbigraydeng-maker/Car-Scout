const fs = require('fs');
const path = require('path');

// 车辆利润计算模型
function calculateResaleProfit(vehicle) {
  const { year, mileage, price, condition = 'average', listingDays = 0 } = vehicle;
  
  const currentYear = 2026;
  const age = currentYear - year;
  
  // 基础参数 - 调整后的合理利润模型
  const BASE_PROFIT_MARGIN = 0.25; // 25% 基础利润率（考虑到车龄）
  const AGE_DISCOUNT_RATE = 0.005; // 每年车龄减少0.5%利润（不是15%）
  const MILEAGE_PENALTY_RATE = 0.00001; // 降低里程惩罚
  const CONDITION_MULTIPLIER = {
    excellent: 1.20,
    good: 1.12,
    average: 1.05,
    fair: 0.95,
    poor: 0.85
  };
  const LISTING_DISCOUNT_RATE = 0.008; // 每天上架可砍价0.8%
  const MAX_LISTING_DISCOUNT = 0.08; // 最大上架折扣 8%
  
  // 计算成本
  const acquisitionPrice = price;
  
  // 整修成本估算 - 更合理的评估
  let refurbishmentCost = 200; // 基础清洁和检查
  if (age > 15) refurbishmentCost += 300; // 老车维护
  if (mileage > 150000) refurbishmentCost += 200; // 高里程
  if (condition === 'fair') refurbishmentCost += 300;
  if (condition === 'poor') refurbishmentCost += 600;
  
  // 基础利润
  let profitMargin = BASE_PROFIT_MARGIN;
  
  // 车龄调整 - 更合理的计算
  const ageDiscount = Math.min(age * AGE_DISCOUNT_RATE, 0.08); // 最大8%折扣
  profitMargin -= ageDiscount;
  
  // 里程调整
  const mileagePenalty = Math.min(mileage * MILEAGE_PENALTY_RATE, 0.10);
  profitMargin -= mileagePenalty;
  
  // 车况调整
  const conditionMultiplier = CONDITION_MULTIPLIER[condition] || 1.00;
  profitMargin *= conditionMultiplier;
  
  // 上架时间调整（越久越好砍价）
  const listingDiscount = Math.min(listingDays * LISTING_DISCOUNT_RATE, MAX_LISTING_DISCOUNT);
  const negotiationRoom = listingDiscount; // 议价空间
  
  // 计算售价和利润
  const totalCost = acquisitionPrice + refurbishmentCost;
  const targetResalePrice = Math.round(totalCost * (1 + profitMargin));
  const minResalePrice = Math.round(totalCost * (1 + 0.10)); // 最低10%利润
  
  // 快速出售价格（15%利润）
  const quickSalePrice = Math.round(totalCost * 1.15);
  
  // 预计净利润
  const maxProfit = targetResalePrice - totalCost;
  const quickProfit = quickSalePrice - totalCost;
  
  // 利润率
  const maxProfitMargin = ((maxProfit / totalCost) * 100).toFixed(1);
  const quickProfitMargin = ((quickProfit / totalCost) * 100).toFixed(1);
  
  // 销售周期预估
  let estimatedSaleDays = 14;
  if (age > 15) estimatedSaleDays += 7;
  if (mileage > 150000) estimatedSaleDays += 5;
  if (listingDays > 7) estimatedSaleDays -= 3; // 上架久说明市场接受度低，但我们可以低价买入
  
  // 风险评级 - 更合理的标准
  let riskLevel = 'low';
  if (age > 20 || mileage > 200000 || condition === 'poor') riskLevel = 'high';
  else if (age > 15 || mileage > 160000 || condition === 'fair') riskLevel = 'medium';
  
  // 建议出价
  const suggestedOffer = Math.round(price * (1 - negotiationRoom - 0.05));
  
  return {
    acquisitionPrice,
    refurbishmentCost,
    totalCost,
    targetResalePrice,
    quickSalePrice,
    minResalePrice,
    maxProfit,
    quickProfit,
    maxProfitMargin: parseFloat(maxProfitMargin),
    quickProfitMargin: parseFloat(quickProfitMargin),
    estimatedSaleDays,
    negotiationRoom: (negotiationRoom * 100).toFixed(1),
    suggestedOffer,
    riskLevel,
    recommendation: generateRecommendation(riskLevel, maxProfitMargin, listingDays)
  };
}

function generateRecommendation(riskLevel, profitMargin, listingDays) {
  // 老车的利润标准不同
  const minAcceptableProfit = riskLevel === 'high' ? 15 : 10;
  
  if (profitMargin < minAcceptableProfit) {
    return riskLevel === 'high' ? '不推荐 - 老车利润太低' : '不推荐 - 利润空间太小';
  }
  
  if (listingDays > 14) return '强烈推荐 - 上架时间长，议价空间大';
  if (profitMargin > 30) return '强烈推荐 - 高利润';
  if (profitMargin > 20) return '推荐 - 利润良好';
  if (profitMargin >= minAcceptableProfit) {
    return riskLevel === 'high' ? '可考虑 - 老车利润尚可' : '可考虑 - 合理利润';
  }
  return '可以考虑 - 利润空间一般';
}

// 处理数据
function processVehicles() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   💰 车辆利润分析计算器                        ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const dataFile = path.join(__dirname, '..', 'data', 'trademe_filtered.json');
  
  if (!fs.existsSync(dataFile)) {
    console.log('❌ 未找到数据文件:', dataFile);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(dataFile));
  
  console.log('📊 分析 ' + data.total + ' 辆车\n');
  
  const results = data.vehicles.map(v => {
    // 估算车况
    let condition = 'average';
    if (v.mileage < 100000 && v.year >= 2010) condition = 'good';
    if (v.mileage > 160000 || v.year < 2005) condition = 'fair';
    
    // 估算上架天数（如果没有数据，默认3天）
    const listingDays = v.listingDays || 3;
    
    const analysis = calculateResaleProfit({
      year: v.year,
      mileage: v.mileage,
      price: v.price,
      condition,
      listingDays
    });
    
    return {
      ...v,
      condition,
      listingDays,
      profitAnalysis: analysis
    };
  });
  
  // 按推荐度排序
  results.sort((a, b) => b.profitAnalysis.maxProfitMargin - a.profitAnalysis.maxProfitMargin);
  
  console.log('🏆 TOP 推荐车辆:\n');
  
  results.forEach((v, i) => {
    const p = v.profitAnalysis;
    console.log(`${i+1}. ${v.year} ${v.title}`);
    console.log(`   💰 收购价: $${v.price} | 🛣️ ${v.mileage}km | 📅 上架${v.listingDays}天`);
    console.log(`   🎯 建议出价: $${p.suggestedOffer} (可压价${p.negotiationRoom}%)`);
    console.log(`   💵 快速售价: $${p.quickSalePrice} (利润 $${p.quickProfit}, ${p.quickProfitMargin}%)`);
    console.log(`   🏷️ 目标售价: $${p.targetResalePrice} (利润 $${p.maxProfit}, ${p.maxProfitMargin}%)`);
    console.log(`   ⏱️ 预计销售周期: ${p.estimatedSaleDays}天 | 风险: ${p.riskLevel.toUpperCase()}`);
    console.log(`   ✅ ${p.recommendation}`);
    console.log(`   🔗 ${v.url}`);
    console.log();
  });
  
  // 保存分析结果
  const outputFile = path.join(__dirname, '..', 'data', 'trademe_with_profit.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    date: new Date().toISOString(),
    total: results.length,
    vehicles: results
  }, null, 2));
  
  console.log('✅ 分析结果已保存:', outputFile);
  
  return results;
}

// 导出函数
module.exports = {
  calculateResaleProfit,
  processVehicles
};

// 直接运行
if (require.main === module) {
  processVehicles();
}

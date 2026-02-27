/**
 * 市场基准利润计算器
 * 基于实际 TradeMe/Facebook 市场价格
 */

const fs = require('fs');
const path = require('path');

// 市场参考价格表（基于历史数据）
const MARKET_PRICES = {
  'toyota': {
    'corolla': {
      '2002-2005': { min: 3500, max: 5500, avg: 4500 },
      '2006-2010': { min: 4500, max: 7000, avg: 5800 },
      '2011-2015': { min: 6500, max: 10000, avg: 8200 }
    },
    'vitz': {
      '2002-2005': { min: 4500, max: 6500, avg: 5500 },
      '2006-2010': { min: 5500, max: 8000, avg: 6800 },
      '2011-2015': { min: 7500, max: 10000, avg: 8800 }
    },
    'yaris': {
      '2002-2005': { min: 3500, max: 5000, avg: 4200 },
      '2006-2010': { min: 4500, max: 6500, avg: 5500 },
      '2011-2015': { min: 6500, max: 9000, avg: 7700 }
    }
  },
  'honda': {
    'civic': {
      '2002-2005': { min: 3800, max: 5500, avg: 4600 },
      '2006-2010': { min: 4800, max: 7000, avg: 5900 },
      '2011-2015': { min: 7000, max: 9500, avg: 8200 }
    },
    'accord': {
      '2002-2005': { min: 3500, max: 5200, avg: 4300 },
      '2006-2010': { min: 4500, max: 6500, avg: 5500 },
      '2011-2015': { min: 6500, max: 9000, avg: 7700 }
    },
    'fit': {
      '2002-2005': { min: 3200, max: 4800, avg: 4000 },
      '2006-2010': { min: 4200, max: 6000, avg: 5100 },
      '2011-2015': { min: 5800, max: 8000, avg: 6900 }
    }
  },
  'mazda': {
    '3': {
      '2002-2005': { min: 3500, max: 5200, avg: 4300 },
      '2006-2010': { min: 4500, max: 6800, avg: 5600 },
      '2011-2015': { min: 6500, max: 9500, avg: 8000 }
    },
    '6': {
      '2002-2005': { min: 3800, max: 5500, avg: 4600 },
      '2006-2010': { min: 4800, max: 7200, avg: 6000 },
      '2011-2015': { min: 7000, max: 10000, avg: 8500 }
    },
    'cx-5': {
      '2012-2015': { min: 8500, max: 14000, avg: 11000 },
      '2016-2020': { min: 12000, max: 20000, avg: 16000 }
    }
  }
};

// 计算市场参考价
function getMarketPrice(brand, model, year) {
  const brandData = MARKET_PRICES[brand.toLowerCase()];
  if (!brandData) return null;
  
  const modelData = brandData[model.toLowerCase()];
  if (!modelData) return null;
  
  // 找到年份范围
  for (const [range, prices] of Object.entries(modelData)) {
    const [start, end] = range.split('-').map(Number);
    if (year >= start && year <= end) {
      return prices;
    }
  }
  
  return null;
}

// 里程调整系数
function getMileageAdjustment(mileage) {
  if (mileage < 80000) return 1.10;      // 低里程 +10%
  if (mileage < 120000) return 1.00;     // 正常里程
  if (mileage < 150000) return 0.95;     // 偏高里程 -5%
  if (mileage < 180000) return 0.90;     // 高里程 -10%
  return 0.85;                            // 很高里程 -15%
}

// 车况调整系数
function getConditionAdjustment(condition) {
  const adjustments = {
    'excellent': 1.12,   // 优秀 +12%
    'good': 1.05,        // 良好 +5%
    'average': 1.00,     // 一般
    'fair': 0.92,        // 较差 -8%
    'poor': 0.82         // 差 -18%
  };
  return adjustments[condition] || 1.00;
}

// 上架时间议价空间
function getNegotiationRoom(listingDays) {
  // 上架越久，议价空间越大
  if (listingDays < 3) return 0.02;      // 2%
  if (listingDays < 7) return 0.05;      // 5%
  if (listingDays < 14) return 0.08;     // 8%
  if (listingDays < 30) return 0.12;     // 12%
  return 0.15;                            // 15%
}

// 主要计算函数
function calculateMarketBasedProfit(vehicle) {
  const { brand, model, year, mileage, price, condition = 'average', listingDays = 0 } = vehicle;
  
  // 1. 获取市场参考价
  const marketPrice = getMarketPrice(brand, model, year);
  
  if (!marketPrice) {
    return {
      error: '未找到该车型的市场参考数据',
      fallback: calculateGenericProfit(vehicle)
    };
  }
  
  // 2. 计算调整后的市场售价
  const mileageAdj = getMileageAdjustment(mileage);
  const conditionAdj = getConditionAdjustment(condition);
  
  // 保守售价（偏低，快速出清）
  const conservativePrice = Math.round(marketPrice.min * mileageAdj * conditionAdj * 0.95);
  
  // 乐观售价（偏高，等待好买家）
  const optimisticPrice = Math.round(marketPrice.max * mileageAdj * conditionAdj * 0.98);
  
  // 推荐售价（平衡）
  const recommendedPrice = Math.round(marketPrice.avg * mileageAdj * conditionAdj);
  
  // 3. 计算成本
  const refurbishmentCost = calculateRefurbishmentCost(year, mileage, condition);
  const totalCost = price + refurbishmentCost;
  
  // 4. 计算议价空间
  const negotiationRoom = getNegotiationRoom(listingDays);
  const suggestedOffer = Math.round(price * (1 - negotiationRoom));
  
  // 5. 计算各场景利润
  const scenarios = {
    conservative: {
      salePrice: conservativePrice,
      profit: conservativePrice - totalCost,
      margin: ((conservativePrice - totalCost) / totalCost * 100).toFixed(1),
      timeframe: '1-2周',
      strategy: '快速出清，吸引买家'
    },
    recommended: {
      salePrice: recommendedPrice,
      profit: recommendedPrice - totalCost,
      margin: ((recommendedPrice - totalCost) / totalCost * 100).toFixed(1),
      timeframe: '2-4周',
      strategy: '平衡价格和出售速度'
    },
    optimistic: {
      salePrice: optimisticPrice,
      profit: optimisticPrice - totalCost,
      margin: ((optimisticPrice - totalCost) / totalCost * 100).toFixed(1),
      timeframe: '4-8周',
      strategy: '等待理想买家，需有耐心'
    }
  };
  
  // 6. 风险评估
  const riskLevel = assessRisk(year, mileage, condition, price, marketPrice);
  
  // 7. 综合建议
  let recommendation;
  const recProfit = parseFloat(scenarios.recommended.margin);
  
  if (recProfit < 10) {
    recommendation = '❌ 不推荐 - 利润空间不足10%';
  } else if (recProfit < 15) {
    recommendation = riskLevel === 'high' 
      ? '⚠️ 谨慎考虑 - 利润空间小且风险高' 
      : '⭕ 可考虑 - 利润空间一般，但风险可控';
  } else if (recProfit < 20) {
    recommendation = riskLevel === 'high'
      ? '⭕ 可考虑 - 合理利润但需承担风险'
      : '✅ 推荐 - 良好利润空间';
  } else {
    recommendation = riskLevel === 'high'
      ? '✅ 推荐 - 高利润，但注意风险管控'
      : '✅ 强烈推荐 - 高利润且风险低';
  }
  
  return {
    marketReference: marketPrice,
    adjustments: {
      mileage: (mileageAdj * 100 - 100).toFixed(0) + '%',
      condition: (conditionAdj * 100 - 100).toFixed(0) + '%'
    },
    acquisition: {
      askingPrice: price,
      suggestedOffer,
      negotiationRoom: (negotiationRoom * 100).toFixed(0) + '%',
      refurbishmentCost,
      totalInvestment: totalCost
    },
    scenarios,
    riskLevel,
    recommendation,
    marketDataSource: 'TradeMe/Facebook 历史数据'
  };
}

// 计算整修成本（更合理的估算）
function calculateRefurbishmentCost(year, mileage, condition) {
  let cost = 200; // 基础清洁、抛光、检查
  
  const age = 2026 - year;
  if (age > 15) cost += 200;      // 老车额外检查
  if (age > 20) cost += 200;
  
  if (mileage > 150000) cost += 150;  // 高里程换油保养
  if (mileage > 200000) cost += 200;
  
  if (condition === 'fair') cost += 300;  // 喷漆、小修复
  if (condition === 'poor') cost += 600;  // 较大修复
  
  return cost;
}

// 风险评估
function assessRisk(year, mileage, condition, price, marketPrice) {
  const age = 2026 - year;
  let riskScore = 0;
  
  if (age > 20) riskScore += 3;
  else if (age > 15) riskScore += 2;
  else if (age > 10) riskScore += 1;
  
  if (mileage > 200000) riskScore += 3;
  else if (mileage > 160000) riskScore += 2;
  else if (mileage > 130000) riskScore += 1;
  
  if (condition === 'poor') riskScore += 3;
  else if (condition === 'fair') riskScore += 2;
  else if (condition === 'average') riskScore += 1;
  
  // 价格是否合理
  if (price > marketPrice.avg * 0.9) riskScore += 2;
  
  if (riskScore >= 7) return 'high';
  if (riskScore >= 4) return 'medium';
  return 'low';
}

// 通用利润计算（当没有市场数据时）
function calculateGenericProfit(vehicle) {
  const { price, year, mileage } = vehicle;
  const age = 2026 - year;
  
  const refurbishmentCost = calculateRefurbishmentCost(year, mileage, 'average');
  const totalCost = price + refurbishmentCost;
  
  // 保守估算
  const conservativePrice = Math.round(totalCost * 1.15);
  const optimisticPrice = Math.round(totalCost * 1.25);
  
  return {
    note: '使用通用计算方法（无该车型市场数据）',
    scenarios: {
      conservative: {
        salePrice: conservativePrice,
        profit: conservativePrice - totalCost,
        margin: '15.0',
        timeframe: '2-4周'
      },
      optimistic: {
        salePrice: optimisticPrice,
        profit: optimisticPrice - totalCost,
        margin: '25.0',
        timeframe: '4-6周'
      }
    }
  };
}

// 格式化输出
function formatProfitReport(result) {
  if (result.error) {
    console.log('⚠️ ', result.error);
    console.log('\n使用备用计算方法...\n');
    result = result.fallback;
  }
  
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   💰 市场基准利润分析报告                      ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  if (result.marketReference) {
    console.log('📊 市场参考价格（TradeMe/Facebook 历史数据）');
    console.log('   最低售价: $' + result.marketReference.min.toLocaleString());
    console.log('   平均售价: $' + result.marketReference.avg.toLocaleString());
    console.log('   最高售价: $' + result.marketReference.max.toLocaleString());
    console.log();
  }
  
  if (result.adjustments) {
    console.log('📈 价格调整因素');
    console.log('   里程调整: ' + result.adjustments.mileage);
    console.log('   车况调整: ' + result.adjustments.condition);
    console.log();
  }
  
  console.log('💵 收购成本分析');
  console.log('   标价: $' + result.acquisition.askingPrice.toLocaleString());
  console.log('   建议出价: $' + result.acquisition.suggestedOffer.toLocaleString() + 
              ' (可压价 ' + result.acquisition.negotiationRoom + ')');
  console.log('   整修成本: $' + result.acquisition.refurbishmentCost.toLocaleString());
  console.log('   总投资: $' + result.acquisition.totalInvestment.toLocaleString());
  console.log();
  
  console.log('🏷️ 三种销售策略');
  console.log('─────────────────────────────────');
  
  Object.entries(result.scenarios).forEach(([key, scenario]) => {
    const emoji = key === 'conservative' ? '🐢' : key === 'recommended' ? '⚖️' : '🚀';
    const name = key === 'conservative' ? '保守' : key === 'recommended' ? '推荐' : '乐观';
    
    console.log(`${emoji} ${name}方案`);
    console.log(`   售价: $${scenario.salePrice.toLocaleString()}`);
    console.log(`   利润: $${scenario.profit.toLocaleString()} (${scenario.margin}%)`);
    console.log(`   周期: ${scenario.timeframe}`);
    if (scenario.strategy) console.log(`   策略: ${scenario.strategy}`);
    console.log();
  });
  
  console.log('⚠️ 风险评估: ' + result.riskLevel.toUpperCase());
  console.log('✅ 综合建议: ' + result.recommendation);
  console.log();
  
  return result;
}

// 导出
module.exports = {
  calculateMarketBasedProfit,
  formatProfitReport,
  MARKET_PRICES
};

// 直接运行测试
if (require.main === module) {
  // 测试 2004 Vitz
  const testVehicle = {
    brand: 'toyota',
    model: 'vitz',
    year: 2004,
    mileage: 118000,
    price: 3200,  // 假设成交价
    condition: 'fair',
    listingDays: 3
  };
  
  console.log('\n测试车辆: 2004 Toyota Vitz\n');
  const result = calculateMarketBasedProfit(testVehicle);
  formatProfitReport(result);
}

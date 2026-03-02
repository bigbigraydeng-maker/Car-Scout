/**
 * generate-top-opportunities.js
 * 生成今日最佳倒卖机会报告（Top 3）
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'top_opportunities_today.md');

// 加载配置
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

console.log('🎯 分析今日最佳倒卖机会...');

// 读取所有车辆数据
function loadAllVehicles() {
  const vehicles = [];
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f.includes('fb_'));
  
  files.forEach(file => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
      if (Array.isArray(data)) {
        vehicles.push(...data);
      } else {
        vehicles.push(data);
      }
    } catch (e) {}
  });
  
  return vehicles;
}

// 计算综合得分
function calculateDealScore(vehicle) {
  const flipScore = vehicle.flipScore || vehicle.flip?.score || 0;
  const profit = vehicle.estimatedProfit || vehicle.flip?.profit || 0;
  const profitMargin = vehicle.profitMargin || (profit / (vehicle.price || 1)) * 100;
  
  // 上架时间权重（新车加分）
  const listingDate = vehicle.listingDate || vehicle.date;
  let freshnessScore = 0;
  if (listingDate) {
    const age = (Date.now() - new Date(listingDate).getTime()) / (1000 * 60 * 60);
    if (age < 24) freshnessScore = 20; // 24小时内
    else if (age < 48) freshnessScore = 10; // 48小时内
  }
  
  // 已售风险（挂得越久越可能有问题）
  const daysListed = vehicle.daysListed || vehicle.days_on_market || 0;
  let urgencyScore = 0;
  if (daysListed > 20) urgencyScore = 15; // 急售可能
  else if (daysListed > 10) urgencyScore = 5;
  
  return {
    flipScore,
    profit,
    profitMargin,
    freshnessScore,
    urgencyScore,
    total: flipScore + freshnessScore + urgencyScore
  };
}

// 生成行动建议
function getActionAdvice(score, profit, vehicle) {
  if (score.flipScore >= 80) {
    return '立即行动：先打电话再看车，今天完成交易';
  } else if (score.flipScore >= 70) {
    return '优先看车：今天联系，尽快安排看车';
  } else if (vehicle.daysListed > 20) {
    return '议价空间：已挂' + vehicle.daysListed + '天，可大幅砍价';
  } else if (score.freshnessScore > 0) {
    return '快速决策：新车上市，需快速行动';
  }
  return '谨慎考虑：综合评估后再决定';
}

// 主函数
function main() {
  const vehicles = loadAllVehicles();
  console.log(`📊 加载了 ${vehicles.length} 辆车`);
  
  // 过滤和评分
  const scoredVehicles = vehicles
    .filter(v => {
      const price = v.price || 0;
      const flipScore = v.flipScore || v.flip?.score || 0;
      return price >= 2000 && price <= 8000 && flipScore >= 60;
    })
    .map(v => ({
      ...v,
      dealScore: calculateDealScore(v)
    }))
    .sort((a, b) => b.dealScore.total - a.dealScore.total)
    .slice(0, 5); // Top 5
  
  if (scoredVehicles.length === 0) {
    console.log('❌ 今日无符合条件的好机会');
    return;
  }
  
  // 生成报告
  const date = new Date().toLocaleDateString('zh-CN');
  let report = `🎯 Car Scout 今日最佳倒卖机会 | ${date}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  const medals = ['🏆', '🥈', '🥉', '4️⃣', '5️⃣'];
  
  scoredVehicles.forEach((v, i) => {
    const model = v.model || v.title || 'Unknown';
    const year = v.year || '';
    const price = v.price || 0;
    const km = v.kilometers || v.km || '?';
    const flipScore = v.dealScore.flipScore;
    const profit = v.dealScore.profit;
    const location = v.location || '';
    const link = v.link || v.url || '';
    const seller = v.sellerName || v.seller || '未知';
    
    report += `${medals[i]} **${year} ${model}**\n`;
    report += `💰 **$${price.toLocaleString()}** | ${km}km | Flip ${flipScore}\n`;
    report += `📈 预估利润: $${profit.toLocaleString()} (${Math.round(v.dealScore.profitMargin)}%)\n`;
    report += `📍 ${location} | 卖家: ${seller}\n`;
    report += `💡 ${getActionAdvice(v.dealScore, profit, v)}\n`;
    report += `🔗 ${link}\n\n`;
  });
  
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `⏰ 生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
  report += `📌 建议：优先联系 🏆 车辆，如果错过再看 🥈\n`;
  
  fs.writeFileSync(OUTPUT_FILE, report);
  console.log(`\n✅ 报告已保存: ${OUTPUT_FILE}`);
  console.log('\n' + report);
  
  return report;
}

// 如果直接运行
if (require.main === module) {
  main();
}

module.exports = { main, calculateDealScore };

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/vehicles_2026-02-18.json', 'utf8'));
const vehicles = data.vehicles;

// 评分函数
function scoreVehicle(v) {
  let score = 0;
  const year = v.year;
  const price = v.price;
  const mileage = v.mileage;
  const age = 2026 - year;
  
  // 1. 价格优势 (25分) - 价格越低分数越高
  if (price <= 3000) score += 25;
  else if (price <= 3500) score += 22;
  else if (price <= 4000) score += 18;
  else if (price <= 4500) score += 12;
  else score += 8;
  
  // 2. 车况/里程 (20分) - 里程越低分数越高
  const expectedMileage = age * 15000;
  if (mileage <= expectedMileage * 0.8) score += 20;
  else if (mileage <= expectedMileage) score += 16;
  else if (mileage <= expectedMileage * 1.2) score += 12;
  else score += 8;
  
  // 3. 车型热度 (15分)
  const model = (v.title + v.searchModel).toLowerCase();
  if (model.includes('corolla')) score += 15;
  else if (model.includes('vitz')) score += 12;
  else if (model.includes('rav4')) score += 10;
  else score += 8;
  
  // 4. 地区便利性 (10分)
  if (v.location.toLowerCase().includes('auckland')) score += 10;
  else score += 6;
  
  // 5. 年份折旧 (10分)
  if (year >= 2012) score += 10;
  else if (year >= 2009) score += 8;
  else if (year >= 2006) score += 6;
  else score += 4;
  
  // 6. 外观/描述质量 (10分)
  const desc = (v.description || '').toLowerCase();
  const keywords = ['service', 'wof', 'rego', 'condition', 'maintained', 'new', 'owner'];
  let keywordCount = keywords.filter(k => desc.includes(k)).length;
  score += Math.min(10, keywordCount * 2);
  
  // 7. 风险指标 (10分) - 有良好描述减分较少
  if (v.imageCount >= 10) score += 10;
  else if (v.imageCount >= 6) score += 8;
  else if (v.imageCount >= 3) score += 6;
  else score += 4;
  
  return Math.min(100, score);
}

// 计算建议采购价
function getSuggestedPrice(price) {
  return Math.round(price * 0.9);
}

// 计算预计利润
function getExpectedProfit(price) {
  const min = Math.round(price * 0.15);
  const max = Math.round(price * 0.25);
  return { min, max };
}

// 评分并排序
const scoredVehicles = vehicles.map(v => ({
  ...v,
  score: scoreVehicle(v),
  suggestedPrice: getSuggestedPrice(v.price),
  profit: getExpectedProfit(v.price)
})).sort((a, b) => b.score - a.score);

// 可投资车辆 (评分>=75)
const investable = scoredVehicles.filter(v => v.score >= 75);

// 生成报告
const today = new Date().toLocaleDateString('en-NZ');
const now = new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });

let report = `📅 Car Scout 报告 | ${today} ${now}
🚗 本次抓取: ${vehicles.length}辆车
✅ 可投资: ${investable.length}辆

🏆 TOP 3推荐:`;

scoredVehicles.slice(0, 3).forEach((v, i) => {
  const emoji = ['1️⃣', '2️⃣', '3️⃣'][i];
  const investableMark = v.score >= 75 ? ' ✅可投资' : '';
  report += `

${emoji} ${v.year} ${v.title.split(' - ')[0]} | $${v.price.toLocaleString()} | ${v.mileage.toLocaleString()}km | 评分:${v.score}${investableMark}
   📍 ${v.location} | WOF: ${v.wof}
   💰 建议采购价: $${v.suggestedPrice.toLocaleString()} | 预计利润: $${v.profit.min}-$${v.profit.max}
   🔗 ${v.url}`;
});

report += `

📋 全部车辆概览:`;

scoredVehicles.forEach((v, i) => {
  const investableMark = v.score >= 75 ? ' ✅' : '';
  report += `\n${i + 1}. ${v.year} ${v.title.split(' - ')[0]} | $${v.price.toLocaleString()} | 评分:${v.score}${investableMark}`;
});

report += `

⚠️ 注意: 
- 所有评分仅供参考，实地看车前请与卖家确认车况
- 建议采购价为要价的90%，实际成交价需根据车况协商
- WOF和Rego信息以实际车辆为准
- 数据来源: Facebook Marketplace Auckland & Waikato
- 本次报告基于 ${data.scrapeDate} 数据`;

console.log(report);

// 保存报告
const dateStr = new Date().toISOString().split('T')[0];
fs.writeFileSync(`data/report_${dateStr}.txt`, report);
console.log(`\n✅ 报告已保存到 data/report_${dateStr}.txt`);

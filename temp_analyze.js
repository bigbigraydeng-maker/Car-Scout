const data = require('./data/trademe_2026-02-24.json');
const vehicles = data.vehicles;

// 评分函数：基于年份、价格、里程计算综合得分
function calculateScore(v) {
  let score = 0;
  
  // 年份得分 (最高分40)
  const year = v.year;
  if (year >= 2012) score += 40;
  else if (year >= 2009) score += 30;
  else if (year >= 2006) score += 20;
  else score += 10;
  
  // 价格得分 (最高分35) - 越低越好
  const price = v.price;
  if (price <= 2500) score += 35;
  else if (price <= 3000) score += 28;
  else if (price <= 3500) score += 22;
  else if (price <= 4000) score += 16;
  else if (price <= 4500) score += 10;
  else score += 5;
  
  // 里程得分 (最高分25) - 越低越好
  const mileage = v.mileage;
  if (mileage < 100000) score += 25;
  else if (mileage < 160000) score += 20;
  else if (mileage < 200000) score += 12;
  else if (mileage < 250000) score += 6;
  else score += 2;
  
  return score;
}

// 计算每辆车的得分并排序
const scoredVehicles = vehicles.map(v => ({
  ...v,
  score: calculateScore(v)
})).sort((a, b) => b.score - a.score);

// 显示 TOP 10
console.log('=== TOP 10 推荐车辆 ===\n');
scoredVehicles.slice(0, 10).forEach((v, i) => {
  const location = v.location || 'Unknown';
  console.log(`${i+1}. ${v.title}`);
  console.log(`   品牌: ${v.brand}, 车型: ${v.model}`);
  console.log(`   年份: ${v.year}, 价格: $${v.price.toLocaleString()}, 里程: ${v.mileage.toLocaleString()}km`);
  console.log(`   地区: ${location.split('\n').pop() || location}`);
  console.log(`   评分: ${v.score}/100`);
  console.log(`   链接: ${v.url}`);
  console.log('');
});

// 保存结果供后续使用
const fs = require('fs');
fs.writeFileSync('temp_top10.json', JSON.stringify(scoredVehicles.slice(0, 10), null, 2));
console.log('TOP 10 已保存到 temp_top10.json');

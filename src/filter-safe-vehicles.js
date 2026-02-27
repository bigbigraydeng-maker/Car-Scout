const fs = require('fs');

// 读取数据
const data = JSON.parse(fs.readFileSync('data/trademe_2026-02-24.json'));

// 机械问题关键词
const riskKeywords = [
  'engine issue', 'gearbox', 'transmission', 'oil leak', 'overheating',
  'head gasket', 'smoke', 'knocking', 'noisy', 'problem',
  'needs work', 'project', 'wrecking', 'damaged', 'write off',
  'not running', 'broken', 'fault', 'leak',
  'engine light', 'check light', 'warning light', 'rough idle',
  'clutch slip', 'brake issue', 'suspension'
];

// 过滤有风险的车
const safeVehicles = data.vehicles.filter(v => {
  const text = (v.description || '').toLowerCase();
  const hasRisk = riskKeywords.some(kw => text.includes(kw.toLowerCase()));
  return !hasRisk && v.mileage <= 160000 && v.price >= 2000 && v.price <= 5000;
});

// 按性价比排序
safeVehicles.sort((a,b) => (a.price + a.mileage/1000) - (b.price + b.mileage/1000));

console.log('✅ 已过滤机械问题车辆');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('原始车辆:', data.vehicles.length, '辆');
console.log('排除风险车:', data.vehicles.length - safeVehicles.length, '辆');
console.log('安全车辆:', safeVehicles.length, '辆');
console.log('');
console.log('🏆 TOP 10 安全推荐:\n');

safeVehicles.slice(0, 10).forEach((v,i) => {
  console.log((i+1) + '. ' + v.title);
  console.log('   💰 $' + v.price + ' | 🛣️ ' + v.mileage + 'km | 📍 ' + (v.location || 'Auckland'));
  console.log('   🔗 ' + v.url);
  console.log();
});

// 保存安全列表
fs.writeFileSync('data/safe_vehicles_filtered.json', JSON.stringify({
  date: '2026-02-24',
  total: safeVehicles.length,
  vehicles: safeVehicles
}, null, 2));

console.log('✅ 已保存到 data/safe_vehicles_filtered.json');

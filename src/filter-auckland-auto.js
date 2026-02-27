const fs = require('fs');

// 读取原始数据
const data = JSON.parse(fs.readFileSync('data/trademe_2026-02-24.json'));

// 奥克兰及周边地区关键词
const aucklandLocations = [
  'auckland', 'north shore', 'waitakere', 'manukau', 
  'papakura', 'franklin', 'rodney', 'waiheke',
  'torbay', 'albany', 'glenfield', 'birkenhead',
  'takapuna', 'devonport', 'milford', 'browns bay',
  'pakuranga', 'howick', 'botany', 'flat bush',
  'manurewa', 'papatoetoe', 'mangere', 'otara',
  'pukekohe', 'waiuku', 'warkworth', 'helensville'
];

// 筛选条件
const safeVehicles = data.vehicles.filter(v => {
  const text = (v.description || '').toLowerCase();
  const title = (v.title || '').toLowerCase();
  const location = (v.location || '').toLowerCase();
  
  // 1. 排除手动档
  const isManual = text.includes('manual') || 
                   text.includes('manual transmission') ||
                   title.includes('manual') ||
                   text.includes('stick shift') ||
                   text.includes('5m') ||  // 5速手动
                   text.includes('6m');   // 6速手动
  
  if (isManual) return false;
  
  // 2. 检查是否为奥克兰地区
  const isAuckland = aucklandLocations.some(loc => location.includes(loc));
  if (!isAuckland) return false;
  
  // 3. 基本筛选
  if (v.mileage > 160000) return false;
  if (v.price < 2000 || v.price > 5000) return false;
  
  return true;
});

// 按性价比排序
safeVehicles.sort((a,b) => (a.price + a.mileage/1000) - (b.price + b.mileage/1000));

console.log('✅ 已更新筛选条件');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('筛选条件：');
console.log('  ✅ 自动档 only');
console.log('  ✅ 奥克兰及周边 only');
console.log('  ✅ 里程 ≤160,000km');
console.log('  ✅ 价格 $2,000-$5,000');
console.log('');
console.log('原始车辆:', data.vehicles.length, '辆');
console.log('自动档:', data.vehicles.filter(v => !(v.description||'').toLowerCase().includes('manual')).length, '辆');
console.log('奥克兰地区:', data.vehicles.filter(v => {
  const loc = (v.location||'').toLowerCase();
  return aucklandLocations.some(l => loc.includes(l));
}).length, '辆');
console.log('符合条件:', safeVehicles.length, '辆');
console.log('');
console.log('🏆 奥克兰地区自动档 TOP 10:\n');

safeVehicles.slice(0, 10).forEach((v,i) => {
  console.log((i+1) + '. ' + v.title);
  console.log('   💰 $' + v.price + ' | 🛣️ ' + v.mileage + 'km');
  console.log('   📍 ' + v.location);
  console.log('   🔗 ' + v.url);
  console.log();
});

// 保存筛选结果
fs.writeFileSync('data/auckland_auto_only.json', JSON.stringify({
  date: '2026-02-24',
  filters: {
    location: 'Auckland + surrounding',
    transmission: 'Automatic only',
    maxMileage: 160000,
    priceRange: '2000-5000'
  },
  total: safeVehicles.length,
  vehicles: safeVehicles
}, null, 2));

console.log('✅ 已保存到 data/auckland_auto_only.json');

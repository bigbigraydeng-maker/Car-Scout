const fs = require('fs');
const path = require('path');

// 读取数据库
const dbFile = path.join(__dirname, '..', 'database', 'vehicles.json');

console.log('🚗 剔除超里程车辆...\n');
console.log('里程限制: 160,000 km\n');

// 读取数据库
let dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

const beforeCount = dbData.vehicles.length;

// 筛选掉超过16万公里的车辆
const removed = [];
dbData.vehicles = dbData.vehicles.filter(v => {
  if (v.mileage > 160000) {
    removed.push({
      title: v.title,
      year: v.year,
      price: v.price,
      mileage: v.mileage,
      source: v.source || 'unknown'
    });
    return false;
  }
  return true;
});

const afterCount = dbData.vehicles.length;

// 保存数据库
dbData.lastUpdate = new Date().toISOString();
fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));

console.log('✅ 筛选完成！\n');
console.log(`📊 筛选前: ${beforeCount}辆`);
console.log(`📊 筛选后: ${afterCount}辆`);
console.log(`🗑️  剔除: ${removed.length}辆 (超16万公里)\n`);

if (removed.length > 0) {
  console.log('📝 被剔除的车辆:');
  removed.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.title} (${v.year}) - $${v.price} - ${v.mileage.toLocaleString()}km - ${v.source}`);
  });
}

console.log('\n🎉 现在重新生成看板即可看到筛选后的车辆！');

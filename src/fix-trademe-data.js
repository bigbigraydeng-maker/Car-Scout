const fs = require('fs');
const path = require('path');

// 读取数据库
const dbFile = path.join(__dirname, '..', 'database', 'vehicles.json');

console.log('🔧 修复TradeMe车辆数据...\n');

// 读取现有数据库
let dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

console.log(`📦 数据库总计: ${dbData.vehicles.length}辆\n`);

// 修复缺少firstSeen字段的车辆
let fixed = 0;

dbData.vehicles.forEach(v => {
  if (!v.firstSeen && v.source === 'trademe') {
    v.firstSeen = v.dateAdded || new Date().toISOString();
    v.lastSeen = v.lastUpdated || v.dateAdded || new Date().toISOString();
    fixed++;
  }
});

// 保存数据库
fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));

console.log('✅ 修复完成！\n');
console.log(`🔧 修复车辆: ${fixed}辆\n`);

console.log('🎉 现在重新生成看板即可看到所有车辆！');

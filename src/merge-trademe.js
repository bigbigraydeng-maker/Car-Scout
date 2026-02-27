const fs = require('fs');
const path = require('path');

// 读取TradeMe数据
const trademeFile = path.join(__dirname, '..', 'data', 'trademe_2026-02-27.json');
const dbFile = path.join(__dirname, '..', 'database', 'vehicles.json');

console.log('📊 合并TradeMe数据到看板数据库...\n');

// 读取TradeMe数据
let trademeData;
try {
  trademeData = JSON.parse(fs.readFileSync(trademeFile, 'utf8'));
} catch (e) {
  console.error('❌ 无法读取TradeMe文件:', e.message);
  process.exit(1);
}

// 读取现有数据库
let dbData;
try {
  dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
} catch (e) {
  console.log('⚠️  数据库不存在，创建新数据库');
  dbData = { vehicles: [], lastUpdate: new Date().toISOString(), version: '1.0' };
}

console.log(`📥 TradeMe车辆: ${trademeData.vehicles.length}辆`);
console.log(`📦 现有数据库: ${dbData.vehicles.length}辆\n`);

// 合并数据
let added = 0;
let skipped = 0;

trademeData.vehicles.forEach(trademeVehicle => {
  // 检查是否已存在（根据URL去重）
  const exists = dbData.vehicles.find(v => v.url === trademeVehicle.url);
  if (exists) {
    skipped++;
    return;
  }

  // 转换为看板格式
  const now = new Date().toISOString();
  const newVehicle = {
    id: `tm-${Date.now()}-${added}`,
    title: trademeVehicle.title,
    year: trademeVehicle.year,
    price: trademeVehicle.price,
    mileage: trademeVehicle.mileage,
    location: trademeVehicle.location,
    url: trademeVehicle.url,
    source: 'trademe',
    status: 'new',
    priority: calculatePriority(trademeVehicle),
    firstSeen: now,
    lastSeen: now,
    dateAdded: now,
    lastUpdated: now,
    brand: trademeVehicle.brand,
    model: trademeVehicle.model,
    transmission: trademeVehicle.transmission
  };

  dbData.vehicles.push(newVehicle);
  added++;
});

// 计算优先级函数
function calculatePriority(vehicle) {
  let score = 5;
  
  // 年份评分
  if (vehicle.year >= 2010) score += 2;
  else if (vehicle.year >= 2005) score += 1;
  
  // 里程评分
  if (vehicle.mileage < 100000) score += 2;
  else if (vehicle.mileage < 150000) score += 1;
  
  // 价格评分
  if (vehicle.price <= 4000) score += 2;
  else if (vehicle.price <= 5000) score += 1;
  
  return Math.min(Math.max(score, 1), 10);
}

// 保存数据库
dbData.lastUpdate = new Date().toISOString();
fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));

console.log('✅ 合并完成！\n');
console.log(`🆕 新增车辆: ${added}辆`);
console.log(`⏭️  跳过重复: ${skipped}辆`);
console.log(`📊 数据库总计: ${dbData.vehicles.length}辆\n`);

console.log('🎉 现在重新生成看板即可看到TradeMe车辆！');

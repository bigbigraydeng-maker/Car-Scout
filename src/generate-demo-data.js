// 示例数据生成器 - 用于演示可视化看板
const fs = require('fs');
const path = require('path');

// 创建示例车辆数据（模拟多车并行场景）
const exampleVehicles = [
  {
    id: "fb_1111111111111",
    title: "2005 Toyota Corolla 1.8 GLX",
    year: 2005,
    price: 4200,
    mileage: 145000,
    location: "Auckland City",
    url: "https://facebook.com/marketplace/item/1111111111111",
    status: "new",
    priority: 7,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  },
  {
    id: "fb_2222222222222",
    title: "2008 Toyota Corolla Runx",
    year: 2008,
    price: 3800,
    mileage: 162000,
    url: "https://facebook.com/marketplace/item/2222222222222",
    status: "contacted",
    priority: 5,
    firstSeen: new Date(Date.now() - 86400000).toISOString(),
    lastSeen: new Date().toISOString(),
    viewingDate: new Date(Date.now() + 86400000).toISOString() // 明天看车
  },
  {
    id: "fb_3333333333333",
    title: "2004 Toyota Vitz 1.3",
    year: 2004,
    price: 2900,
    mileage: 138000,
    url: "https://facebook.com/marketplace/item/3333333333333",
    status: "viewing",
    priority: 6,
    firstSeen: new Date(Date.now() - 172800000).toISOString(),
    lastSeen: new Date().toISOString(),
    viewingDate: new Date().toISOString(), // 今天看车
    viewingNotes: "车况良好，内饰干净，需要更换轮胎"
  },
  {
    id: "fb_4444444444444",
    title: "2006 Toyota Corolla Fielder",
    year: 2006,
    price: 4500,
    mileage: 155000,
    url: "https://facebook.com/marketplace/item/4444444444444",
    status: "inspecting",
    priority: 5,
    firstSeen: new Date(Date.now() - 259200000).toISOString(),
    lastSeen: new Date().toISOString(),
    inspectionPassed: true,
    repairCost: 350
  },
  {
    id: "fb_5555555555555",
    title: "2003 Toyota Corolla 1.8",
    year: 2003,
    price: 3200,
    mileage: 148000,
    url: "https://facebook.com/marketplace/item/5555555555555",
    status: "negotiating",
    priority: 4,
    firstSeen: new Date(Date.now() - 345600000).toISOString(),
    lastSeen: new Date().toISOString(),
    purchasePrice: 3000,
    suggestedResalePrice: 4200
  },
  {
    id: "fb_6666666666666",
    title: "2007 Toyota Corolla GLX",
    year: 2007,
    price: 3800,
    mileage: 125000,
    url: "https://facebook.com/marketplace/item/6666666666666",
    status: "purchased",
    priority: 6,
    firstSeen: new Date(Date.now() - 432000000).toISOString(),
    lastSeen: new Date().toISOString(),
    purchasePrice: 3600,
    purchaseDate: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "fb_7777777777777",
    title: "2005 Toyota Vitz RS",
    year: 2005,
    price: 3100,
    mileage: 142000,
    url: "https://facebook.com/marketplace/item/7777777777777",
    status: "cleaning",
    priority: 5,
    firstSeen: new Date(Date.now() - 518400000).toISOString(),
    lastSeen: new Date().toISOString(),
    purchasePrice: 2900,
    cleaningCost: 450,
    cleaningStarted: true
  },
  {
    id: "fb_8888888888888",
    title: "2008 Toyota Corolla 1.8",
    year: 2008,
    price: 5200,
    mileage: 118000,
    url: "https://facebook.com/marketplace/item/8888888888888",
    status: "reselling",
    priority: 7,
    firstSeen: new Date(Date.now() - 604800000).toISOString(),
    lastSeen: new Date().toISOString(),
    purchasePrice: 4100,
    cleaningCost: 380,
    suggestedResalePrice: 5200,
    resalePlatforms: ["TradeMe", "Facebook"]
  }
];

// 保存到数据库
const dbPath = path.join(__dirname, '..', 'database', 'vehicles.json');
const db = {
  vehicles: exampleVehicles,
  lastUpdate: new Date().toISOString()
};

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('✅ 示例数据已创建 (8辆车辆，展示多车并行)');
console.log('');
console.log('车辆状态分布:');
console.log('  📥 新发现: 1辆');
console.log('  📞 已联系: 1辆 (明天看车)');
console.log('  📅 预约看车: 1辆 (今天看车)');
console.log('  🔍 车检中: 1辆');
console.log('  💰 议价中: 1辆');
console.log('  ✅ 已购买: 1辆');
console.log('  🧹 清理中: 1辆');
console.log('  🔄 已上架: 1辆');
console.log('');
console.log('运行 "npm run dashboard" 查看可视化看板');

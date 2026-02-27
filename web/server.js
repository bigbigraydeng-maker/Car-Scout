/**
 * Car Scout 管理系统 - Web 服务器
 * 提供 API 和数据服务
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = 3000;

// 数据文件路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const VEHICLES_FILE = path.join(DATA_DIR, 'vehicles.json');

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 利润计算器页面
app.get('/calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'calculator.html'));
});

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据
function initData() {
  if (!fs.existsSync(VEHICLES_FILE)) {
    // 从现有文件导入
    const trademeFile = path.join(DATA_DIR, 'trademe_with_profit.json');
    if (fs.existsSync(trademeFile)) {
      const data = JSON.parse(fs.readFileSync(trademeFile));
      const vehicles = data.vehicles.map((v, i) => ({
        id: `v${String(i + 1).padStart(3, '0')}`,
        ...v,
        status: v.status || 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      fs.writeFileSync(VEHICLES_FILE, JSON.stringify({
        lastUpdate: new Date().toISOString(),
        vehicles
      }, null, 2));
      
      console.log('✅ 已导入', vehicles.length, '辆车');
    } else {
      fs.writeFileSync(VEHICLES_FILE, JSON.stringify({
        lastUpdate: new Date().toISOString(),
        vehicles: []
      }, null, 2));
    }
  }
}

// 读取车辆数据
function loadVehicles() {
  try {
    const data = JSON.parse(fs.readFileSync(VEHICLES_FILE));
    return data.vehicles || [];
  } catch (err) {
    console.error('读取数据失败:', err);
    return [];
  }
}

// 保存车辆数据
function saveVehicles(vehicles) {
  fs.writeFileSync(VEHICLES_FILE, JSON.stringify({
    lastUpdate: new Date().toISOString(),
    vehicles
  }, null, 2));
}

// API 路由

// 获取所有车辆
app.get('/api/vehicles', (req, res) => {
  const vehicles = loadVehicles();
  res.json(vehicles);
});

// 获取单个车辆
app.get('/api/vehicles/:id', (req, res) => {
  const vehicles = loadVehicles();
  const vehicle = vehicles.find(v => v.id === req.params.id);
  
  if (vehicle) {
    res.json(vehicle);
  } else {
    res.status(404).json({ error: '车辆不存在' });
  }
});

// 添加车辆
app.post('/api/vehicles', (req, res) => {
  const vehicles = loadVehicles();
  const newVehicle = {
    id: `v${String(vehicles.length + 1).padStart(3, '0')}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  vehicles.push(newVehicle);
  saveVehicles(vehicles);
  
  res.json(newVehicle);
});

// 更新车辆
app.put('/api/vehicles/:id', (req, res) => {
  const vehicles = loadVehicles();
  const index = vehicles.findIndex(v => v.id === req.params.id);
  
  if (index !== -1) {
    vehicles[index] = {
      ...vehicles[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveVehicles(vehicles);
    res.json(vehicles[index]);
  } else {
    res.status(404).json({ error: '车辆不存在' });
  }
});

// 删除车辆
app.delete('/api/vehicles/:id', (req, res) => {
  const vehicles = loadVehicles();
  const filtered = vehicles.filter(v => v.id !== req.params.id);
  
  saveVehicles(filtered);
  res.json({ success: true });
});

// 更新车辆状态
app.patch('/api/vehicles/:id/status', (req, res) => {
  const { status, notes } = req.body;
  const vehicles = loadVehicles();
  const index = vehicles.findIndex(v => v.id === req.params.id);
  
  if (index !== -1) {
    vehicles[index].status = status;
    vehicles[index].notes = notes || vehicles[index].notes;
    vehicles[index].updatedAt = new Date().toISOString();
    
    // 添加跟进记录
    if (!vehicles[index].followups) {
      vehicles[index].followups = [];
    }
    vehicles[index].followups.push({
      date: new Date().toISOString(),
      status,
      notes
    });
    
    saveVehicles(vehicles);
    res.json(vehicles[index]);
  } else {
    res.status(404).json({ error: '车辆不存在' });
  }
});

// 获取统计数据
app.get('/api/stats', (req, res) => {
  const vehicles = loadVehicles();
  
  const stats = {
    total: vehicles.length,
    byStatus: {},
    bySource: {},
    totalProfit: 0,
    avgMargin: 0
  };
  
  vehicles.forEach(v => {
    // 按状态统计
    stats.byStatus[v.status] = (stats.byStatus[v.status] || 0) + 1;
    
    // 按来源统计
    stats.bySource[v.source] = (stats.bySource[v.source] || 0) + 1;
    
    // 利润统计
    if (v.profit) {
      stats.totalProfit += v.profit.estimatedProfit || 0;
      stats.avgMargin += v.profit.margin || 0;
    }
  });
  
  if (vehicles.length > 0) {
    stats.avgMargin = (stats.avgMargin / vehicles.length).toFixed(1);
  }
  
  res.json(stats);
});

// 刷新数据（从 TradeMe 抓取）
app.post('/api/refresh', async (req, res) => {
  console.log('🔄 手动刷新数据...');
  
  // 这里可以调用抓取脚本
  res.json({ message: '刷新任务已启动' });
});

// 市场基准利润计算
app.post('/api/calculate-profit', (req, res) => {
  const { brand, model, year, mileage, price, condition, listingDays } = req.body;
  
  const result = calculateMarketBasedProfit({
    brand, model, year, mileage, price, condition, listingDays
  });
  
  res.json(result);
});

// 生成 Skykiwi 帖子
app.post('/api/generate-skykiwi-post/:id', (req, res) => {
  const vehicles = loadVehicles();
  const vehicle = vehicles.find(v => v.id === req.params.id);
  
  if (!vehicle) {
    return res.status(404).json({ error: '车辆不存在' });
  }
  
  const post = generateSkykiwiPost(vehicle);
  res.json({ post });
});

// 生成小红书帖子
app.post('/api/generate-xhs-post/:id', (req, res) => {
  const vehicles = loadVehicles();
  const vehicle = vehicles.find(v => v.id === req.params.id);
  
  if (!vehicle) {
    return res.status(404).json({ error: '车辆不存在' });
  }
  
  const post = generateXhsPost(vehicle);
  res.json({ post });
});

// 生成 Skykiwi 帖子内容
function generateSkykiwiPost(vehicle) {
  return `
【出售】${vehicle.year}年 ${vehicle.title}

基本信息：
- 年份：${vehicle.year}
- 里程：${vehicle.mileage.toLocaleString()} km
- 变速箱：${vehicle.transmission || '自动档'}
- 位置：${vehicle.location}

车辆状况：
- 车况良好，定期保养
- WOF和路税都有效
- 无事故记录

价格：$${vehicle.price.toLocaleString()}（可议价）

联系方式：
电话：请私信
微信：请私信

欢迎预约看车！

#奥克兰二手车 #新西兰卖车 #Toyota
  `.trim();
}

// 市场参考价格表
const MARKET_PRICES = {
  'toyota': {
    'corolla': { '2002-2005': { min: 3500, max: 5500, avg: 4500 }, '2006-2010': { min: 4500, max: 7000, avg: 5800 }, '2011-2015': { min: 6500, max: 10000, avg: 8200 } },
    'vitz': { '2002-2005': { min: 4500, max: 6500, avg: 5500 }, '2006-2010': { min: 5500, max: 8000, avg: 6800 }, '2011-2015': { min: 7500, max: 10000, avg: 8800 } },
    'yaris': { '2002-2005': { min: 3500, max: 5000, avg: 4200 }, '2006-2010': { min: 4500, max: 6500, avg: 5500 }, '2011-2015': { min: 6500, max: 9000, avg: 7700 } }
  },
  'honda': {
    'civic': { '2002-2005': { min: 3800, max: 5500, avg: 4600 }, '2006-2010': { min: 4800, max: 7000, avg: 5900 }, '2011-2015': { min: 7000, max: 9500, avg: 8200 } },
    'accord': { '2002-2005': { min: 3500, max: 5200, avg: 4300 }, '2006-2010': { min: 4500, max: 6500, avg: 5500 }, '2011-2015': { min: 6500, max: 9000, avg: 7700 } },
    'fit': { '2002-2005': { min: 3200, max: 4800, avg: 4000 }, '2006-2010': { min: 4200, max: 6000, avg: 5100 }, '2011-2015': { min: 5800, max: 8000, avg: 6900 } }
  },
  'mazda': {
    '3': { '2002-2005': { min: 3500, max: 5200, avg: 4300 }, '2006-2010': { min: 4500, max: 6800, avg: 5600 }, '2011-2015': { min: 6500, max: 9500, avg: 8000 } },
    '6': { '2002-2005': { min: 3800, max: 5500, avg: 4600 }, '2006-2010': { min: 4800, max: 7200, avg: 6000 }, '2011-2015': { min: 7000, max: 10000, avg: 8500 } },
    'cx-5': { '2012-2015': { min: 8500, max: 14000, avg: 11000 }, '2016-2020': { min: 12000, max: 20000, avg: 16000 } }
  }
};

// 市场基准利润计算
function calculateMarketBasedProfit(vehicle) {
  const { brand, model, year, mileage, price, condition = 'average', listingDays = 0 } = vehicle;
  
  const brandData = MARKET_PRICES[brand?.toLowerCase()];
  const modelData = brandData?.[model?.toLowerCase()];
  
  let marketPrice = null;
  if (modelData) {
    for (const [range, prices] of Object.entries(modelData)) {
      const [start, end] = range.split('-').map(Number);
      if (year >= start && year <= end) {
        marketPrice = prices;
        break;
      }
    }
  }
  
  if (!marketPrice) {
    return { error: '未找到该车型的市场数据' };
  }
  
  // 调整系数
  const mileageAdj = mileage < 80000 ? 1.10 : mileage < 120000 ? 1.00 : mileage < 150000 ? 0.95 : mileage < 180000 ? 0.90 : 0.85;
  const conditionAdj = { excellent: 1.12, good: 1.05, average: 1.00, fair: 0.92, poor: 0.82 }[condition] || 1.00;
  const negotiationRoom = listingDays < 3 ? 0.02 : listingDays < 7 ? 0.05 : listingDays < 14 ? 0.08 : listingDays < 30 ? 0.12 : 0.15;
  
  // 整修成本
  let refurbishmentCost = 200;
  const age = 2026 - year;
  if (age > 15) refurbishmentCost += 200;
  if (age > 20) refurbishmentCost += 200;
  if (mileage > 150000) refurbishmentCost += 150;
  if (condition === 'fair') refurbishmentCost += 300;
  if (condition === 'poor') refurbishmentCost += 600;
  
  const totalCost = price + refurbishmentCost;
  const suggestedOffer = Math.round(price * (1 - negotiationRoom));
  
  // 三种售价策略
  const conservativePrice = Math.round(marketPrice.min * mileageAdj * conditionAdj * 0.95);
  const recommendedPrice = Math.round(marketPrice.avg * mileageAdj * conditionAdj);
  const optimisticPrice = Math.round(marketPrice.max * mileageAdj * conditionAdj * 0.98);
  
  // 利润计算
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
      strategy: '等待理想买家'
    }
  };
  
  // 风险评估
  let riskScore = 0;
  if (age > 20) riskScore += 3;
  else if (age > 15) riskScore += 2;
  else if (age > 10) riskScore += 1;
  if (mileage > 200000) riskScore += 3;
  else if (mileage > 160000) riskScore += 2;
  else if (mileage > 130000) riskScore += 1;
  if (condition === 'poor') riskScore += 3;
  else if (condition === 'fair') riskScore += 2;
  const riskLevel = riskScore >= 7 ? 'high' : riskScore >= 4 ? 'medium' : 'low';
  
  // 综合建议
  const recMargin = parseFloat(scenarios.recommended.margin);
  let recommendation;
  if (recMargin < 10) recommendation = '❌ 不推荐 - 利润空间不足';
  else if (recMargin < 15) recommendation = riskLevel === 'high' ? '⚠️ 谨慎考虑' : '⭕ 可考虑';
  else if (recMargin < 20) recommendation = riskLevel === 'high' ? '⭕ 可考虑' : '✅ 推荐';
  else recommendation = '✅ 强烈推荐';
  
  return {
    marketReference: marketPrice,
    adjustments: { mileage: (mileageAdj * 100 - 100).toFixed(0) + '%', condition: (conditionAdj * 100 - 100).toFixed(0) + '%' },
    acquisition: { askingPrice: price, suggestedOffer, negotiationRoom: (negotiationRoom * 100).toFixed(0) + '%', refurbishmentCost, totalInvestment: totalCost },
    scenarios,
    riskLevel,
    recommendation
  };
}

// 生成小红书帖子
function generateXhsPost(vehicle) {
  return `
🚗 新西兰卖车 | ${vehicle.year}年 ${vehicle.title}

💰 价格：$${vehicle.price.toLocaleString()}
📍 地点：${vehicle.location}
🛣️ 里程：${vehicle.mileage.toLocaleString()} km

✨ 车况：
- 定期保养，车况良好
- 省油耐用
- 适合日常通勤

📞 有兴趣请私信联系

#新西兰生活 #奥克兰卖车 #新西兰二手车 #新西兰买车 #奥克兰生活
  `.trim();
}

// 定时任务：每天 8:00 更新数据
cron.schedule('0 8 * * *', () => {
  console.log('⏰ [' + new Date().toISOString() + '] 开始每日数据更新...');
  // 这里可以调用抓取脚本
});

// 启动服务器
initData();

app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🚗 Car Scout 管理系统                        ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  console.log('✅ 服务器已启动');
  console.log('📱 访问地址: http://localhost:' + PORT);
  console.log('📊 数据文件:', VEHICLES_FILE);
  console.log('\n功能:');
  console.log('   - 车辆管理');
  console.log('   - 利润计算');
  console.log('   - 跟进状态');
  console.log('   - 自动发布');
  console.log('\n按 Ctrl+C 停止服务器\n');
});

module.exports = app;

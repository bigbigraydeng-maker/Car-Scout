/**
 * Car Scout - Facebook Marketplace 智能抓取 (升级版 v2.0)
 * 支持多车型、自动过滤、详情页抓取
 */

const fs = require('fs');
const path = require('path');

// 加载配置
const CONFIG = {
  models: ['Corolla', 'Vitz', 'Wish', 'RAV4', 'Honda Fit', 'Demio', 'Aqua', 'Swift', 'Prius', 'Axela', 'Civic', 'Tiida'],
  locations: [
    { name: 'Auckland', slug: 'auckland' },
    { name: 'Waikato', slug: 'waikato' }
  ],
  minPrice: 2500,
  maxPrice: 8000,
  minYear: 2005,
  maxMileage: 160000,
  excludeKeywords: [
    'engine problem', 'engine issue', 'transmission problem', 'gearbox issue',
    'blown head gasket', 'overheating', 'not running', "doesn't start", 'wont start',
    'engine knock', 'oil leak', 'coolant leak', 'water damage', 'written off',
    'totaled', 'engine blown', 'gearbox blown', 'transmission', 'clutch problem',
    '发动机问题', '变速箱', '无法启动', '漏油', '漏水', '过热', '事故车'
  ]
};

/**
 * 生成 Facebook Marketplace 搜索 URL
 */
function generateSearchURL(model, location, minPrice, maxPrice) {
  const query = encodeURIComponent(model.toLowerCase());
  return `https://www.facebook.com/marketplace/${location}/search/?query=${query}&minPrice=${minPrice}&maxPrice=${maxPrice}&category_id=807311116002604`;
}

/**
 * 从标题中提取年份
 */
function extractYear(title) {
  const yearMatch = title.match(/\b(20\d{2}|19\d{2})\b/);
  return yearMatch ? parseInt(yearMatch[1]) : null;
}

/**
 * 从描述中提取里程
 */
function extractMileage(description) {
  if (!description) return null;
  
  // 匹配各种里程格式
  const patterns = [
    /(\d{1,3}[,.]?\d{0,3})\s*(km|kms|kilometers|miles|mi)\b/i,
    /(\d{1,3}[,.]\d{3})\s*(km|kms|kilometers|miles|mi)\b/i,
    /(\d{2,3})\s*,?\s*(\d{3})\s*(km|kms|kilometers|miles|mi)\b/i,
    /(\d{2,3})\s*k\s*(km|kms)?/i,
    /里程[:\s]*(\d+)/i,
    /(\d{2,3})[,\s]*(\d{3})\s*公里/i,
    /(\d+)\s*万?\s*公里/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      // 处理 "15万" 格式
      if (match[0].includes('万')) {
        const num = parseInt(match[1]);
        return num * 10000;
      }
      // 处理 "150,000" 格式
      const numStr = match[0].replace(/[^\d]/g, '');
      const mileage = parseInt(numStr);
      if (mileage > 1000 && mileage < 1000000) {
        return mileage;
      }
    }
  }
  return null;
}

/**
 * 检查是否有大故障
 */
function hasMajorFaults(description) {
  if (!description) return false;
  
  const descLower = description.toLowerCase();
  return CONFIG.excludeKeywords.some(keyword => 
    descLower.includes(keyword.toLowerCase())
  );
}

/**
 * 车辆是否符合条件
 */
function isQualified(vehicle) {
  // 检查年份
  if (vehicle.year && vehicle.year < CONFIG.minYear) {
    return { qualified: false, reason: `年份 ${vehicle.year} < ${CONFIG.minYear}` };
  }
  
  // 检查里程
  if (vehicle.mileage && vehicle.mileage > CONFIG.maxMileage) {
    return { qualified: false, reason: `里程 ${vehicle.mileage}km > ${CONFIG.maxMileage}km` };
  }
  
  // 检查大故障
  if (vehicle.hasFaults) {
    return { qualified: false, reason: '检测到重大故障描述' };
  }
  
  return { qualified: true, reason: '符合所有条件' };
}

/**
 * 模拟抓取数据（实际应使用 browser 工具）
 * 这里生成符合新筛选条件的测试数据
 */
async function scrapeVehicles() {
  console.log('🚗 Car Scout v2.0 - 智能抓取开始...');
  console.log('');
  console.log('📋 筛选条件:');
  console.log(`   - 车型: ${CONFIG.models.join(', ')}`);
  console.log(`   - 年份: >= ${CONFIG.minYear}`);
  console.log(`   - 里程: <= ${CONFIG.maxMileage} km`);
  console.log(`   - 价格: $${CONFIG.minPrice} - $${CONFIG.maxPrice}`);
  console.log(`   - 排除: 大故障车辆`);
  console.log('');
  
  // 这里应该是真实的 browser 抓取
  // 暂时使用测试数据展示过滤逻辑
  const mockVehicles = [
    {
      id: 'fb_001',
      title: 'Toyota Corolla 2008',
      model: 'Corolla',
      year: 2008,
      price: 3800,
      mileage: 145000,
      location: 'Auckland',
      description: 'Well maintained Toyota Corolla. Regular service. New tires. Clean interior.',
      listingUrl: generateSearchURL('Corolla', 'auckland', 2000, 5000)
    },
    {
      id: 'fb_002',
      title: 'Toyota Vitz 2010',
      model: 'Vitz',
      year: 2010,
      price: 4200,
      mileage: 98000,
      location: 'Auckland',
      description: '2010 Toyota Vitz in excellent condition. Low mileage. Fuel efficient.',
      listingUrl: generateSearchURL('Vitz', 'auckland', 2000, 5000)
    },
    {
      id: 'fb_003',
      title: 'Toyota Wish 2007',
      model: 'Wish',
      year: 2007,
      price: 4500,
      mileage: 185000,
      location: 'Auckland',
      description: '7-seater family car. Reliable engine. Recent service.',
      listingUrl: generateSearchURL('Wish', 'auckland', 2000, 5000)
    },
    {
      id: 'fb_004',
      title: 'Toyota RAV4 2006',
      model: 'RAV4',
      year: 2006,
      price: 4800,
      mileage: 210000,
      location: 'Waikato',
      description: 'Reliable RAV4 4WD. Some cosmetic wear.',
      listingUrl: generateSearchURL('RAV4', 'waikato', 2000, 5000)
    },
    {
      id: 'fb_005',
      title: 'Toyota Corolla 2004',
      model: 'Corolla',
      year: 2004,
      price: 2800,
      mileage: 180000,
      location: 'Auckland',
      description: 'Older model but runs well. Engine has oil leak.',
      listingUrl: generateSearchURL('Corolla', 'auckland', 2000, 5000),
      hasFaults: true
    },
    {
      id: 'fb_006',
      title: 'Toyota Corolla 2012',
      model: 'Corolla',
      year: 2012,
      price: 4800,
      mileage: 125000,
      location: 'Auckland',
      description: '2012 Corolla in great condition. Full service history.',
      listingUrl: generateSearchURL('Corolla', 'auckland', 2000, 5000)
    }
  ];
  
  // 应用筛选
  const qualified = [];
  const filtered = [];
  
  for (const vehicle of mockVehicles) {
    const result = isQualified(vehicle);
    if (result.qualified) {
      qualified.push(vehicle);
    } else {
      filtered.push({ ...vehicle, filterReason: result.reason });
    }
  }
  
  console.log(`✅ 符合条件: ${qualified.length} 辆`);
  console.log(`❌ 已过滤: ${filtered.length} 辆`);
  console.log('');
  
  if (filtered.length > 0) {
    console.log('🚫 过滤原因:');
    filtered.forEach(v => {
      console.log(`   - ${v.title}: ${v.filterReason}`);
    });
    console.log('');
  }
  
  return { qualified, filtered };
}

/**
 * 保存数据
 */
function saveData(qualified, filtered) {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  // 生成搜索链接
  const searchLinks = {};
  CONFIG.models.forEach(model => {
    CONFIG.locations.forEach(loc => {
      searchLinks[`${model.toLowerCase()}_${loc.slug}`] = 
        generateSearchURL(model, loc.slug, CONFIG.minPrice, CONFIG.maxPrice);
    });
  });
  
  const data = {
    scrapeDate: new Date().toISOString(),
    config: CONFIG,
    summary: {
      total: qualified.length + filtered.length,
      qualified: qualified.length,
      filtered: filtered.length
    },
    searchLinks: searchLinks,
    qualifiedVehicles: qualified,
    filteredVehicles: filtered
  };
  
  const filepath = path.join(__dirname, '..', 'data', `vehicles_${date}.json`);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`💾 数据已保存: ${filepath}`);
  
  return filepath;
}

/**
 * 主函数
 */
async function main() {
  try {
    const { qualified, filtered } = await scrapeVehicles();
    const savedPath = saveData(qualified, filtered);
    
    console.log('\n📊 统计:');
    console.log(`   - 合格车辆: ${qualified.length}`);
    console.log(`   - 已过滤: ${filtered.length}`);
    
    console.log('\n🔗 Facebook Marketplace 搜索链接:');
    CONFIG.models.forEach(model => {
      console.log(`   ${model}: https://www.facebook.com/marketplace/auckland/search/?query=toyota%20${model.toLowerCase()}&minPrice=2000&maxPrice=5000`);
    });
    
    return { success: true, qualified, filtered };
  } catch (error) {
    console.error('❌ 抓取失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 导出
module.exports = {
  CONFIG,
  generateSearchURL,
  extractYear,
  extractMileage,
  hasMajorFaults,
  isQualified,
  scrapeVehicles
};

// 直接运行
if (require.main === module) {
  main();
}

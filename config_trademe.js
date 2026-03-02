/**
 * Car Scout - TradeMe 抓取配置
 * 只抓取私人卖家 (Private Sellers)
 */

const CONFIG = {
  models: ['Corolla', 'Vitz', 'Wish', 'RAV4', 'Honda Fit', 'Demio', 'Aqua', 'Swift', 'Prius', 'Axela', 'Civic', 'Tiida'],
  locations: ['Auckland', 'Waikato'],
  minPrice: 2500,
  maxPrice: 8000,
  minYear: 2005,
  maxMileage: 160000,
  sellerType: 'private', // 只抓取私人卖家
  excludeKeywords: [
    'engine problem', 'engine issue', 'transmission problem', 'gearbox issue',
    'blown head gasket', 'overheating', 'not running', "doesn't start", 'wont start',
    'engine knock', 'oil leak', 'coolant leak', 'water damage', 'written off',
    'totaled', 'engine blown', 'gearbox blown', 'transmission', 'clutch problem',
    '发动机问题', '变速箱', '无法启动', '漏油', '漏水', '过热', '事故车',
    'dealer', 'dealership', 'yard', 'finance', 'warranty' // 排除车商关键词
  ]
};

/**
 * 生成TradeMe搜索URL
 */
function generateTradeMeURL(model, location, minPrice, maxPrice) {
  const baseUrl = 'https://www.trademe.co.nz/a/motors/cars/search';
  const params = new URLSearchParams({
    q: `toyota ${model.toLowerCase()}`,
    price_min: minPrice.toString(),
    price_max: maxPrice.toString(),
    year_min: '2005',
    odometer_max: '200000',
    seller_type: 'private' // TradeMe的私人卖家筛选参数
  });
  
  // 地区参数
  if (location === 'Auckland') {
    params.set('region', '1'); // Auckland region ID
  } else if (location === 'Waikato') {
    params.set('region', '14'); // Waikato region ID
  }
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * 判断是否为车商描述
 */
function isDealerListing(description, title) {
  const text = (title + ' ' + description).toLowerCase();
  const dealerKeywords = [
    'dealer', 'dealership', 'car yard', 'motor group', 'auto sales',
    'finance available', 'warranty included', 'trade ins welcome',
    'on site', 'yard', 'showroom', ' gst ', 'registered motor vehicle'
  ];
  
  return dealerKeywords.some(keyword => text.includes(keyword));
}

/**
 * 提取年份
 */
function extractYear(text) {
  const yearMatch = text.match(/\b(20\d{2})\b/);
  return yearMatch ? parseInt(yearMatch[1]) : null;
}

/**
 * 提取里程
 */
function extractMileage(text) {
  // TradeMe通常显示为 "123,456 km" 或 "123456km"
  const patterns = [
    /(\d{1,3},\d{3})\s*km/i,
    /(\d{6})\s*km/i,
    /(\d{2,3})\s*,\s*(\d{3})\s*(km|kms|kilometers)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const numStr = match[0].replace(/[^\d]/g, '');
      const mileage = parseInt(numStr);
      if (mileage > 1000 && mileage <= 200000) {
        return mileage;
      }
    }
  }
  return null;
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
  
  // 检查是否为车商
  if (vehicle.isDealer) {
    return { qualified: false, reason: '车商/Dealer (非私人卖家)' };
  }
  
  // 检查大故障
  if (vehicle.hasFaults) {
    return { qualified: false, reason: '检测到重大故障描述' };
  }
  
  return { qualified: true, reason: '符合所有条件' };
}

module.exports = {
  CONFIG,
  generateTradeMeURL,
  isDealerListing,
  extractYear,
  extractMileage,
  isQualified
};

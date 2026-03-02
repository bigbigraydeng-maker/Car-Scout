/**
 * Car Scout v3.0 - Flip Scanner
 * 三平台扫描主脚本 (倒卖优化版)
 */

const { scoreVehicles, hasMechanicalIssue, EXCLUDE_KEYWORDS } = require('./scoring');
const { generateReport, generateShortReport, saveReport } = require('./report');

const CONFIG = {
  models: ['Corolla', 'Vitz', 'Wish', 'RAV4', 'Honda Fit', 'Demio'],
  locations: ['auckland', 'waikato'],
  priceMin: 2000,
  priceMax: 5000,
  yearMin: 2005,
  kmMax: 160000,
  skykiwiMaxDays: 30,
  excludeKeywords: EXCLUDE_KEYWORDS
};

// 平台搜索链接生成器
const URL_GENERATORS = {
  facebook: (model, location) => {
    let query;
    if (model === 'Honda Fit') query = 'honda%20fit';
    else if (model === 'Demio') query = 'mazda%20demio';
    else query = `toyota%20${model.toLowerCase()}`;
    return `https://www.facebook.com/marketplace/${location}/search/?query=${query}&minPrice=${CONFIG.priceMin}&maxPrice=${CONFIG.priceMax}`;
  },

  trademe: (model, location) => {
    const locationId = location === 'auckland' ? '100003' : '100010';
    if (model === 'Honda Fit') {
      return `https://www.trademe.co.nz/a/motors/cars/honda/fit/search?price_min=${CONFIG.priceMin}&price_max=${CONFIG.priceMax}&year_min=2006&odometer_max=${CONFIG.kmMax}&region=${locationId}`;
    } else if (model === 'Demio') {
      return `https://www.trademe.co.nz/a/motors/cars/mazda/demio/search?price_min=${CONFIG.priceMin}&price_max=${CONFIG.priceMax}&year_min=2006&odometer_max=${CONFIG.kmMax}&region=${locationId}`;
    }
    return `https://www.trademe.co.nz/a/motors/cars/toyota/${model.toLowerCase()}/search?price_min=${CONFIG.priceMin}&price_max=${CONFIG.priceMax}&year_min=${CONFIG.yearMin}&odometer_max=${CONFIG.kmMax}&region=${locationId}`;
  },

  skykiwi: () => 'http://bbs.skykiwi.com/forum.php?mod=forumdisplay&fid=18'
};

// 硬约束检查
function passesHardFilter(vehicle) {
  if (vehicle.price < CONFIG.priceMin || vehicle.price > CONFIG.priceMax) return false;
  if (vehicle.year < CONFIG.yearMin) return false;
  if (vehicle.mileage > CONFIG.kmMax) return false;
  if (vehicle.seller && vehicle.seller.toLowerCase() === 'dealer') return false;
  if (hasMechanicalIssue(vehicle.description)) return false;
  return true;
}

// 生成每日报告 (使用新的 Flip 报告)
function generateDailyReport(vehicles) {
  return generateReport(vehicles);
}

module.exports = {
  CONFIG,
  URL_GENERATORS,
  passesHardFilter,
  generateDailyReport
};

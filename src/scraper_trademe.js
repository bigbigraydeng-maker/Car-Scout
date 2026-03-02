/**
 * Car Scout - TradeMe Scraper
 * 抓取TradeMe上的私人卖家车辆
 */

const fs = require('fs');
const path = require('path');
const { CONFIG, generateTradeMeURL, isDealerListing, extractYear, extractMileage, isQualified } = require('../config_trademe');

/**
 * 模拟抓取TradeMe数据
 * 实际使用时应通过browser工具访问
 */
async function scrapeTradeMe() {
  console.log('🚗 Car Scout TradeMe - 开始抓取...');
  console.log('');
  console.log('📋 筛选条件:');
  console.log(`   - 车型: ${CONFIG.models.join(', ')}`);
  console.log(`   - 卖家: 仅私人卖家 (Private Sellers)`);
  console.log(`   - 年份: >= ${CONFIG.minYear}`);
  console.log(`   - 里程: <= ${CONFIG.maxMileage} km`);
  console.log(`   - 价格: $${CONFIG.minPrice} - $${CONFIG.maxPrice}`);
  console.log('');
  
  // 生成搜索链接
  console.log('🔗 TradeMe 搜索链接:');
  CONFIG.models.forEach(model => {
    CONFIG.locations.forEach(loc => {
      const url = generateTradeMeURL(model, loc, CONFIG.minPrice, CONFIG.maxPrice);
      console.log(`   ${model} ${loc}: ${url}`);
    });
  });
  console.log('');
  
  return {
    searchUrls: CONFIG.models.map(model => ({
      model,
      auckland: generateTradeMeURL(model, 'Auckland', CONFIG.minPrice, CONFIG.maxPrice),
      waikato: generateTradeMeURL(model, 'Waikato', CONFIG.minPrice, CONFIG.maxPrice)
    }))
  };
}

/**
 * 保存配置
 */
function saveConfig() {
  const data = {
    scrapeDate: new Date().toISOString(),
    source: 'TradeMe',
    sellerType: 'private_only',
    config: CONFIG,
    searchUrls: CONFIG.models.map(model => ({
      model,
      urls: CONFIG.locations.map(loc => ({
        location: loc,
        url: generateTradeMeURL(model, loc, CONFIG.minPrice, CONFIG.maxPrice)
      }))
    }))
  };
  
  const filepath = path.join(__dirname, '..', 'data', `trademe_config_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.json`);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`💾 配置已保存: ${filepath}`);
  return filepath;
}

/**
 * 主函数
 */
async function main() {
  try {
    const result = await scrapeTradeMe();
    const savedPath = saveConfig();
    
    console.log('\n✅ TradeMe 配置完成!');
    console.log('\n💡 下一步:');
    console.log('   1. 使用 browser 工具访问上述搜索链接');
    console.log('   2. 提取listing数据');
    console.log('   3. 过滤私人卖家');
    console.log('   4. 应用年份/里程筛选');
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ 配置失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { scrapeTradeMe, saveConfig };

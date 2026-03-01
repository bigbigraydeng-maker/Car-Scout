/**
 * Car Scout - 统一运行入口
 * 整合 TradeMe + Facebook + Turners Auction
 * 输出中文报告
 */

const TradeMeScraper = require('./trademe-scraper');
const FacebookScraper = require('./facebook-private-scraper');
const TurnersScraper = require('./turners-scraper');
const fs = require('fs');
const path = require('path');

class CarScoutRunner {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.reportsDir = path.join(__dirname, '..', 'reports');
    this.allVehicles = [];
  }

  async run() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   🚗 Car Scout - 丰田二手车猎手           ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('📋 搜索条件:');
    console.log('   🚗 品牌: Toyota (Corolla / Vitz / RAV4)');
    console.log('   💰 价格: $2,000 - $5,000 NZD');
    console.log('   👤 卖家: 个人卖家 (Private Only)');
    console.log('   📍 地区: Auckland / Waikato');
    console.log('   🏪 拍卖: Turners Auction');
    console.log('');

    // 1. TradeMe
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 步骤 1/3: 抓取 TradeMe 个人卖家');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const trademe = new TradeMeScraper();
      const trademeResults = await trademe.run();
      const normalized = this.normalizeScraperResults(trademeResults, 'TradeMe');
      this.allVehicles.push(...normalized);
      console.log(`✅ TradeMe: ${normalized.length} 辆`);
    } catch (err) {
      console.error('❌ TradeMe 失败:', err.message);
    }

    // 2. Facebook
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 步骤 2/3: 抓取 Facebook Marketplace');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const facebook = new FacebookScraper();
      const fbResults = await facebook.run();
      const normalized = this.normalizeScraperResults(fbResults, 'Facebook');
      this.allVehicles.push(...normalized);
      console.log(`✅ Facebook: ${normalized.length} 辆`);
    } catch (err) {
      console.error('❌ Facebook 失败:', err.message);
    }

    // 3. Turners
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 步骤 3/3: 抓取 Turners 拍卖');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const turners = new TurnersScraper();
      const turnersResults = await turners.run();
      const normalized = this.normalizeScraperResults(turnersResults, 'Turners');
      this.allVehicles.push(...normalized);
      console.log(`✅ Turners: ${normalized.length} 辆`);
    } catch (err) {
      console.error('❌ Turners 失败:', err.message);
    }

    // 合并去重
    const unique = this.deduplicate(this.allVehicles);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 抓取完成!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🚗 总计找到: ${unique.length} 辆车`);
    console.log(`   • TradeMe: ${unique.filter(v => v.source === 'TradeMe').length} 辆`);
    console.log(`   • Facebook: ${unique.filter(v => v.source === 'Facebook').length} 辆`);
    console.log(`   • Turners: ${unique.filter(v => v.source === 'Turners').length} 辆`);

    // 保存合并数据
    this.saveData(unique);
    
    // 生成中文报告
    this.generateChineseReport(unique);

    return unique;
  }

  normalizeScraperResults(scraperOutput, sourceName) {
    const vehicles = Array.isArray(scraperOutput)
      ? scraperOutput
      : scraperOutput?.vehicles;

    if (!Array.isArray(vehicles)) {
      console.warn(`⚠️ ${sourceName} 返回格式异常，已跳过该数据源。`);
      return [];
    }

    return vehicles.map(vehicle => ({ ...vehicle, source: sourceName }));
  }

  deduplicate(vehicles) {
    const seen = new Set();
    return vehicles.filter(v => {
      const key = v.title + v.price + v.mileage;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  saveData(vehicles) {
    const today = new Date().toISOString().split('T')[0];
    const data = {
      date: today,
      total: vehicles.length,
      sources: {
        trademe: vehicles.filter(v => v.source === 'TradeMe').length,
        facebook: vehicles.filter(v => v.source === 'Facebook').length,
        turners: vehicles.filter(v => v.source === 'Turners').length
      },
      vehicles: vehicles
    };

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const filename = `all_vehicles_${today}.json`;
    fs.writeFileSync(
      path.join(this.dataDir, filename),
      JSON.stringify(data, null, 2)
    );

    console.log(`\n💾 数据已保存: ${filename}`);
  }

  generateChineseReport(vehicles) {
    const today = new Date().toISOString().split('T')[0];
    
    // 按价格排序
    const sorted = [...vehicles].sort((a, b) => (a.price || 0) - (b.price || 0));
    
    let report = `# 🚗 Car Scout 每日车辆报告\n\n`;
    report += `**日期**: ${today}\n\n`;
    report += `**搜索条件**: Toyota (Corolla/Vitz/RAV4) | $2,000-$5,000 | 个人卖家\n\n`;
    report += `---\n\n`;
    report += `## 📊 汇总\n\n`;
    report += `- 🚗 **总计**: ${vehicles.length} 辆车\n`;
    report += `- 📱 **TradeMe**: ${vehicles.filter(v => v.source === 'TradeMe').length} 辆\n`;
    report += `- 📘 **Facebook**: ${vehicles.filter(v => v.source === 'Facebook').length} 辆\n`;
    report += `- 🏪 **Turners拍卖**: ${vehicles.filter(v => v.source === 'Turners').length} 辆\n\n`;
    report += `---\n\n`;
    
    report += `## 🎯 推荐车辆 (按价格排序)\n\n`;
    
    sorted.forEach((v, i) => {
      const emoji = v.source === 'TradeMe' ? '📱' : v.source === 'Facebook' ? '📘' : '🏪';
      report += `### ${i + 1}. ${v.title || 'Toyota'} ${emoji}\n\n`;
      report += `- 💰 **价格**: $${v.price.toLocaleString()} NZD\n`;
      report += `- 📍 **地区**: ${v.location || '未知'}\n`;
      report += `- 🛣️ **里程**: ${v.mileage ? v.mileage.toLocaleString() + ' km' : '未知'}\n`;
      if (v.year) report += `- 📅 **年份**: ${v.year}\n`;
      if (v.transmission) report += `- ⚙️ **变速箱**: ${v.transmission}\n`;
      if (v.fuel) report += `- ⛽ **燃油**: ${v.fuel}\n`;
      report += `- 🔗 **链接**: ${v.url}\n`;
      report += `- 📌 **来源**: ${v.source}\n\n`;
    });
    
    report += `---\n\n`;
    report += `*报告生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Pacific/Auckland' })} NZT*\n`;

    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    const filename = `report_${today}.md`;
    fs.writeFileSync(path.join(this.reportsDir, filename), report);

    console.log(`📝 中文报告已生成: ${filename}`);
  }
}

// 直接运行
if (require.main === module) {
  new CarScoutRunner().run().catch(console.error);
}

module.exports = CarScoutRunner;

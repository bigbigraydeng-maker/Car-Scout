/**
 * Car Scout - Step 1: TradeMe Only
 * 第一步：只抓取 TradeMe（稳定可靠）
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class CarScoutTradeMe {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.reportsDir = path.join(__dirname, '..', 'reports', 'daily');
    this.results = [];
    
    this.config = {
      location: 'auckland',
      radius: 100,
      brands: [
        { name: 'toyota', models: ['corolla', 'vitz', 'yaris', 'rav4'] },
        { name: 'honda', models: ['civic', 'accord', 'fit', 'jazz'] },
        { name: 'mazda', models: ['mazda3', 'mazda6', 'axela', 'atenza'] }
      ],
      priceRange: { min: 2000, max: 5000 },
      yearRange: { min: 2002, max: 2010 },
      maxMileage: 160000
    };
    
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.reportsDir)) fs.mkdirSync(this.reportsDir, { recursive: true });
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚗 Car Scout - Step 1: TradeMe Only          ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const startTime = Date.now();
    
    // 1. 抓取 TradeMe
    await this.scrapeTradeMe();
    
    // 2. 处理和排名
    this.processAndRank();
    
    // 3. 生成报告
    const report = this.generateReport();
    
    // 4. 保存数据
    this.saveData();
    
    // 5. 生成飞书消息
    this.printFeishuMessage(report);
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n✅ TradeMe 抓取完成！耗时 ${duration} 分钟`);
    console.log(`📊 共找到 ${this.results.length} 辆车`);
    console.log(`\n💡 下一步：运行 node src/step2-facebook.js 抓取 Facebook 补充数据`);
    
    return report;
  }

  async scrapeTradeMe() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 抓取 TradeMe');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      for (const brand of this.config.brands) {
        for (const model of brand.models) {
          const url = `https://www.trademe.co.nz/a/motors/cars/${brand.name}/search?` +
            `price_min=${this.config.priceRange.min}&` +
            `price_max=${this.config.priceRange.max}&` +
            `year_min=${this.config.yearRange.min}&` +
            `sort_order=expirydesc&` +
            `seller_type=private&` +
            `search_string=${brand.name}%20${model}`;
          
          console.log(`🔍 ${brand.name} ${model}`);
          
          try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);
            
            const vehicles = await this.extractListings(page, brand.name, model);
            this.results.push(...vehicles);
            
            console.log(`   ✅ ${vehicles.length} 辆\n`);
          } catch (err) {
            console.log(`   ⚠️ ${err.message.substring(0, 50)}\n`);
          }
        }
      }
    } finally {
      await browser.close();
    }
  }

  async extractListings(page, brand, model) {
    return await page.evaluate(({ brand, model, config }) => {
      const vehicles = [];
      const seen = new Set();
      const links = document.querySelectorAll('a[href*="/listing/"]');
      
      links.forEach(link => {
        try {
          const text = link.innerText || link.textContent || '';
          
          const priceMatch = text.match(/\$([\d,]+)/);
          if (!priceMatch) return;
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          if (price < config.priceRange.min || price > config.priceRange.max) return;
          
          const yearMatch = text.match(/\b(200[2-9]|201[0-9])\b/);
          if (!yearMatch) return;
          const year = parseInt(yearMatch[1]);
          if (year < config.yearRange.min || year > config.yearRange.max) return;
          
          const kmMatch = text.match(/([\d,]+)\s*km/i);
          const mileage = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
          if (mileage > config.maxMileage) return;
          
          if (!text.toLowerCase().includes('private seller')) return;
          
          const href = link.getAttribute('href');
          const url = href.startsWith('http') ? href : `https://trademe.co.nz${href}`;
          const cleanUrl = url.split('?')[0];
          
          if (seen.has(cleanUrl)) return;
          seen.add(cleanUrl);
          
          vehicles.push({
            title: `${year} ${brand} ${model}`,
            price,
            year,
            mileage,
            location: text.match(/([A-Za-z\s]+),\s*[A-Za-z\s]+/)?.[1] || 'Auckland',
            url: cleanUrl,
            source: 'TradeMe',
            brand,
            model,
            firstSeen: new Date().toISOString()
          });
        } catch (e) {}
      });
      
      return vehicles;
    }, { brand, model, config: this.config });
  }

  processAndRank() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 数据处理和排名');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 去重
    const seen = new Set();
    this.results = this.results.filter(v => {
      const key = `${v.brand}-${v.model}-${v.price}-${v.mileage}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`去重后: ${this.results.length} 辆\n`);
    
    // 评分
    this.results.forEach(v => {
      v.score = this.calculateScore(v);
    });
    
    this.results.sort((a, b) => b.score - a.score);
  }

  calculateScore(v) {
    let score = 0;
    if (v.price <= 3000) score += 40;
    else if (v.price <= 3500) score += 35;
    else if (v.price <= 4000) score += 30;
    else if (v.price <= 4500) score += 20;
    else score += 10;
    
    if (v.mileage <= 80000) score += 30;
    else if (v.mileage <= 100000) score += 25;
    else if (v.mileage <= 120000) score += 20;
    else if (v.mileage <= 140000) score += 15;
    else score += 10;
    
    if (v.year >= 2008) score += 20;
    else if (v.year >= 2006) score += 15;
    else if (v.year >= 2004) score += 10;
    else score += 5;
    
    return score;
  }

  generateReport() {
    const today = new Date().toISOString().split('T')[0];
    
    const report = {
      date: today,
      summary: {
        total: this.results.length,
        trademe: this.results.length,
        facebook: 0
      },
      topPicks: this.results.slice(0, 5),
      allVehicles: this.results
    };
    
    const reportPath = path.join(this.reportsDir, `trademe_report_${today}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('✅ 报告已生成\n');
    
    return report;
  }

  saveData() {
    const today = new Date().toISOString().split('T')[0];
    const data = {
      date: today,
      vehicles: this.results
    };
    
    fs.writeFileSync(path.join(this.dataDir, `trademe_scrape_${today}.json`), JSON.stringify(data, null, 2));
    fs.writeFileSync(path.join(this.dataDir, 'previous_scrape.json'), JSON.stringify(data, null, 2));
  }

  printFeishuMessage(report) {
    const today = report.date;
    const top = report.topPicks[0];
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 飞书消息预览');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    let msg = `🚗 Car Scout 日报 - ${today}\n\n`;
    msg += `📊 TradeMe 数据\n`;
    msg += `总车辆: ${report.summary.total} 辆\n\n`;
    
    if (top) {
      msg += `🏆 最值得出手\n`;
      msg += `${top.title}\n`;
      msg += `💰 $${top.price.toLocaleString()} | 🛣️ ${top.mileage.toLocaleString()} km\n`;
      msg += `📍 ${top.location}\n`;
      msg += `🔗 ${top.url}\n\n`;
    }
    
    msg += `📋 TOP 5 推荐\n`;
    report.topPicks.slice(0, 5).forEach((v, i) => {
      msg += `${i+1}. ${v.title} - $${v.price.toLocaleString()} (${v.mileage.toLocaleString()} km)\n`;
    });
    
    msg += `\n💡 运行 step2-facebook.js 获取 Facebook 补充数据`;
    
    console.log(msg);
    console.log('');
  }
}

if (require.main === module) {
  new CarScoutTradeMe().run().catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
}

module.exports = CarScoutTradeMe;

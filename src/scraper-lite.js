/**
 * Car Scout Lite - 简化版Facebook抓取
 * 每4小时执行一次，只抓取2个任务避免超时
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class CarScoutLite {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.results = [];
    this.errors = [];
    
    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.logsDir)) fs.mkdirSync(this.logsDir, { recursive: true });
  }

  /**
   * 获取简化版搜索配置（只抓2个任务）
   */
  getSearchConfigs() {
    const priceMin = 2000;
    const priceMax = 5000;
    const base = 'https://www.facebook.com/marketplace';
    
    return [
      {
        model: 'corolla',
        location: 'Auckland',
        locationCode: 'auckland',
        url: `${base}/auckland/search/?query=toyota%20corolla&minPrice=${priceMin}&maxPrice=${priceMax}&sortBy=creation_time_descend`
      },
      {
        model: 'corolla',
        location: 'Waikato',
        locationCode: 'waikato',
        url: `${base}/waikato/search/?query=toyota%20corolla&minPrice=${priceMin}&maxPrice=${priceMax}&sortBy=creation_time_descend`
      }
    ];
  }

  async initBrowser() {
    console.log('🚀 启动浏览器...');
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);
  }

  async checkLogin() {
    console.log('🔐 检查Facebook登录状态...');
    try {
      await this.page.goto('https://www.facebook.com/marketplace/', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(3000);
      
      const loginButton = await this.page.$('[data-testid="royal_login_button"]');
      if (loginButton) {
        console.log('⚠️ 请在浏览器中手动登录Facebook...');
        await this.page.waitForSelector('[aria-label="Marketplace"]', { timeout: 120000 });
        console.log('✅ 登录成功！');
      } else {
        console.log('✅ 已登录');
      }
    } catch (err) {
      console.error('❌ 登录检查失败:', err.message);
      throw err;
    }
  }

  async scrollToLoad() {
    console.log('📜 滚动加载...');
    for (let i = 0; i < 2; i++) { // 减少滚动次数
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(2000);
    }
  }

  async extractVehicles(config) {
    await this.page.waitForTimeout(3000);
    
    const links = await this.page.$$eval('a[href*="/marketplace/item/"]', 
      links => links.slice(0, 25).map(l => ({ // 限制数量
        url: l.href.split('?')[0],
        title: l.innerText?.substring(0, 50) || ''
      }))
    );
    
    // 去重
    const unique = [];
    const seen = new Set();
    for (const link of links) {
      if (!seen.has(link.url)) {
        seen.add(link.url);
        unique.push({
          ...link,
          location: config.location,
          searchModel: config.model
        });
      }
    }
    
    console.log(`✅ 找到 ${unique.length} 辆车`);
    return unique;
  }

  async scrapeVehicleDetails(vehicle) {
    const detailPage = await this.context.newPage();
    try {
      await detailPage.goto(vehicle.url, { waitUntil: 'domcontentloaded' });
      await detailPage.waitForTimeout(2000);
      
      const details = await detailPage.evaluate(() => {
        const data = {
          title: '',
          price: 0,
          year: 0,
          mileage: 0,
          location: '',
          description: '',
          url: window.location.href
        };
        
        // 标题
        const titleEl = document.querySelector('h1 span[dir="auto"]');
        if (titleEl) data.title = titleEl.textContent.trim();
        
        // 价格
        const priceMatch = document.body.innerText.match(/\$?([\d,]+)\s*(?:NZD)?/);
        if (priceMatch) {
          data.price = parseInt(priceMatch[1].replace(/,/g, ''));
        }
        
        // 年份
        const yearMatch = (data.title + ' ').match(/\b(200[2-9]|201[0-9]|202[0-6])\b/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);
        
        return data;
      });
      
      details.searchLocation = vehicle.searchLocation;
      details.searchModel = vehicle.searchModel;
      
      return details;
    } finally {
      await detailPage.close();
    }
  }

  isValidVehicle(vehicle) {
    // 放宽验证条件
    if (!vehicle.price || vehicle.price < 1500 || vehicle.price > 6000) {
      console.log(`      ⚠️ 跳过: 价格不符 ($${vehicle.price})`);
      return false;
    }
    
    const text = (vehicle.title + ' ' + vehicle.description + ' ').toLowerCase();
    const hasToyota = text.includes('toyota');
    const hasModel = text.includes('corolla') || text.includes('vitz') || text.includes('rav4') || 
                     text.includes('allion') || text.includes('axio') || text.includes('fielder');
    
    if (!hasToyota && !hasModel) {
      console.log(`      ⚠️ 跳过: 不含Toyota或车型名 (标题: ${vehicle.title?.substring(0, 30)})`);
      return false;
    }
    
    return true;
  }

  async scrapeSearch(config, index, total) {
    console.log(`\n🔍 [${index}/${total}] 抓取: ${config.location} - Toyota ${config.model}`);
    
    try {
      // 添加重试机制
      let retries = 3;
      while (retries > 0) {
        try {
          await this.page.goto(config.url, { waitUntil: 'networkidle', timeout: 60000 });
          break;
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          console.log(`   ⚠️ 页面加载失败，重试...(${3-retries}/3)`);
          await this.page.waitForTimeout(3000);
        }
      }
      await this.page.waitForTimeout(8000);
      
      await this.scrollToLoad();
      const vehicles = await this.extractVehicles(config);
      
      let successCount = 0;
      for (let i = 0; i < vehicles.length; i++) {
        console.log(`   [${i+1}/${vehicles.length}] 抓取...`);
        
        try {
          await this.page.waitForTimeout(500);
          const details = await this.scrapeVehicleDetails(vehicles[i]);
          
          if (this.isValidVehicle(details)) {
            this.results.push(details);
            successCount++;
            console.log(`      ✅ 有效: ${details.title?.substring(0, 30)} ($${details.price})`);
          } else {
            console.log(`      ⚠️ 跳过: 不符合条件`);
          }
        } catch (err) {
          console.log(`      ❌ 失败: ${err.message}`);
        }
      }
      
      console.log(`✅ 完成: ${config.location} ${config.model} - 成功:${successCount}`);
    } catch (err) {
      console.error(`❌ 搜索失败:`, err.message);
    }
  }

  saveData() {
    const today = new Date().toISOString().split('T')[0];
    const filename = `vehicles_${today}.json`;
    const filepath = path.join(this.dataDir, filename);
    
    const data = {
      scrapeDate: today,
      scrapeTime: new Date().toISOString(),
      totalVehicles: this.results.length,
      vehicles: this.results
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`\n💾 数据已保存: ${filepath}`);
    console.log(`📊 总计: ${this.results.length} 辆有效车辆`);
    return filepath;
  }

  async run() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     🚗 Car Scout Toyota Lite (Cron)      ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`⏰ 开始时间: ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })} NZT\n`);
    
    try {
      await this.initBrowser();
      await this.checkLogin();
      
      const configs = this.getSearchConfigs();
      console.log(`📋 本次抓取 ${configs.length} 个任务\n`);
      
      for (let i = 0; i < configs.length; i++) {
        await this.scrapeSearch(configs[i], i + 1, configs.length);
        await this.page.waitForTimeout(3000);
      }
      
      this.saveData();
      
      console.log('\n✅ Car Scout Lite 抓取完成!');
    } catch (err) {
      console.error('\n❌ 执行失败:', err.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log('🔒 浏览器已关闭');
      }
    }
  }
}

// 执行
const scraper = new CarScoutLite();
scraper.run();

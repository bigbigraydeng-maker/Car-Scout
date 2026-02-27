/**
 * Car Scout - Facebook Marketplace Scraper (通宵简化版)
 * 只抓核心任务，适合通宵运行
 * 任务：Auckland + Brisbane 的热门车型
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class FacebookOvernightScraper {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.authDir = path.join(__dirname, '..', 'auth');
    this.results = [];
    this.errors = [];
    
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🌙 Facebook 通宵抓取版 v1.0                  ║');
    console.log('║        核心任务 only (8个搜索)                 ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    console.log('开始时间:', new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }));
    console.log('预计完成: 明天早上 6-8点\n');
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 100,
      channel: 'msedge'
    });
    
    const authFile = path.join(this.authDir, 'facebook_auth.json');
    const hasAuth = fs.existsSync(authFile);
    
    const contextOptions = {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    if (hasAuth) {
      contextOptions.storageState = authFile;
    }
    
    const context = await browser.newContext(contextOptions);
    
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(120000);

    try {
      await this.handleLogin(page, authFile);
      await this.executeSearches(page);
    } catch (err) {
      console.error('❌ 执行失败:', err.message);
      this.errors.push({ type: 'execution', message: err.message });
    } finally {
      await browser.close();
    }

    return this.saveData();
  }

  async handleLogin(page, authFile) {
    console.log('🔐 检查登录状态...\n');
    
    await page.goto('https://www.facebook.com/marketplace/', { 
      waitUntil: 'domcontentloaded',
      timeout: 120000 
    });
    
    await page.waitForTimeout(5000);
    
    const needsLogin = await page.$('input[name="email"], input#email') !== null;
    
    if (needsLogin) {
      console.log('⚠️  需要手动登录，请在浏览器中完成登录');
      console.log('   等待登录完成（最长10分钟）...\n');
      
      try {
        await page.waitForSelector('[aria-label="Marketplace"], [href="/marketplace/"]', { 
          timeout: 600000 
        });
        
        console.log('✅ 登录成功！保存登录状态...\n');
        await page.context().storageState({ path: authFile });
        await page.waitForTimeout(3000);
      } catch (err) {
        throw new Error('Login timeout');
      }
    } else {
      console.log('✅ 已登录\n');
    }
  }

  // 只抓8个核心任务（减少时间）
  getSearchConfigs() {
    return [
      // 新西兰 Auckland - 热门车型
      { location: 'Auckland', brand: 'toyota', model: 'corolla', minPrice: 2000, maxPrice: 5000, currency: 'NZD' },
      { location: 'Auckland', brand: 'toyota', model: 'vitz', minPrice: 2000, maxPrice: 5000, currency: 'NZD' },
      { location: 'Auckland', brand: 'honda', model: 'civic', minPrice: 2000, maxPrice: 5000, currency: 'NZD' },
      { location: 'Auckland', brand: 'honda', model: 'fit', minPrice: 2000, maxPrice: 5000, currency: 'NZD' },
      
      // Brisbane - 放宽预算
      { location: 'Brisbane', brand: 'toyota', model: 'corolla', minPrice: 2000, maxPrice: 8500, currency: 'AUD' },
      { location: 'Brisbane', brand: 'toyota', model: 'yaris', minPrice: 2000, maxPrice: 8500, currency: 'AUD' },
      { location: 'Brisbane', brand: 'honda', model: 'civic', minPrice: 2000, maxPrice: 8500, currency: 'AUD' },
      { location: 'Brisbane', brand: 'honda', model: 'jazz', minPrice: 2000, maxPrice: 8500, currency: 'AUD' },
    ];
  }

  async executeSearches(page) {
    const searches = this.getSearchConfigs();
    console.log(`📋 共 ${searches.length} 个核心搜索任务`);
    console.log(`预计耗时: ${searches.length * 20} 分钟 (${Math.round(searches.length * 20 / 60)} 小时)\n`);

    for (let i = 0; i < searches.length; i++) {
      const search = searches[i];
      const timeNow = new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' });
      console.log(`[${timeNow}] [${i+1}/${searches.length}] 🔍 ${search.location} - ${search.brand} ${search.model}`);
      
      try {
        await this.scrapeSearch(page, search);
      } catch (err) {
        console.error(`   ❌ 失败: ${err.message.substring(0, 60)}`);
        this.errors.push({ search: `${search.location}-${search.brand}-${search.model}`, error: err.message });
      }
      
      // 任务间长延迟，避免被封
      console.log('   ⏳ 休息 10 秒...\n');
      await page.waitForTimeout(10000);
    }
  }

  async scrapeSearch(page, config) {
    const url = `https://www.facebook.com/marketplace/${config.location.toLowerCase()}/search/?query=${config.brand}%20${config.model}&minPrice=${config.minPrice}&maxPrice=${config.maxPrice}`;
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(8000);
      
      // 滚动加载
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(3000);
      }
      
      // 提取列表
      const listings = await this.extractListings(page);
      console.log(`   📋 找到 ${listings.length} 个列表`);
      
      if (listings.length === 0) {
        console.log(`   ℹ️ 无结果`);
        return;
      }
      
      // 处理前8个列表
      let validCount = 0;
      for (let j = 0; j < Math.min(listings.length, 8); j++) {
        try {
          const details = await this.scrapeListingDetails(page, listings[j].url);
          
          if (details.price >= config.minPrice && details.price <= config.maxPrice) {
            if (details.mileage > 160000) {
              console.log(`      ⚠️ 跳过: 里程超标 (${details.mileage}km)`);
              continue;
            }
            
            this.results.push({
              ...details,
              searchLocation: config.location,
              searchBrand: config.brand,
              searchModel: config.model,
              currency: config.currency
            });
            validCount++;
            console.log(`      ✅ ${details.title?.substring(0, 35)} ($${details.price})`);
          }
        } catch (err) {
          // 忽略单个错误
        }
        
        await page.waitForTimeout(2000);
      }
      
      console.log(`   ✅ 有效: ${validCount} 辆`);
      
    } catch (err) {
      console.error(`   ❌ 搜索失败: ${err.message.substring(0, 60)}`);
    }
  }

  async extractListings(page) {
    try {
      return await page.evaluate(() => {
        const items = [];
        const seen = new Set();
        
        const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
        
        links.forEach(link => {
          try {
            const href = link.getAttribute('href') || '';
            if (!href.includes('/marketplace/item/')) return;
            
            const url = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
            const cleanUrl = url.split('?')[0];
            if (seen.has(cleanUrl)) return;
            seen.add(cleanUrl);
            
            let container = link.closest('[role="article"]') || link.parentElement?.parentElement;
            if (!container) container = link;
            
            const text = container.innerText || '';
            
            let price = 0;
            const priceMatch = text.match(/\$([\d,]+)/);
            if (priceMatch) {
              price = parseInt(priceMatch[1].replace(/,/g, ''));
            }
            
            if (price < 1500 || price > 10000) return;
            
            let title = link.getAttribute('aria-label') || '';
            
            items.push({
              url: cleanUrl,
              title: title.substring(0, 100),
              price,
              rawText: text.substring(0, 200)
            });
          } catch (e) {}
        });
        
        return items;
      });
    } catch (err) {
      return [];
    }
  }

  async scrapeListingDetails(page, url) {
    const detailPage = await page.context().newPage();
    
    try {
      await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await detailPage.waitForTimeout(4000);
      
      const details = await detailPage.evaluate(() => {
        const data = {
          title: '',
          price: 0,
          year: 0,
          mileage: 0,
          location: '',
          url: window.location.href
        };
        
        const pageText = document.body.innerText || '';
        
        const h1 = document.querySelector('h1');
        if (h1) data.title = h1.innerText.trim();
        
        const priceMatch = pageText.match(/\$([\d,]+)/);
        if (priceMatch) {
          data.price = parseInt(priceMatch[1].replace(/,/g, ''));
        }
        
        const yearMatch = (data.title + ' ' + pageText).match(/\b(200[2-9]|201[0-9]|202[0-6])\b/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);
        
        const kmMatch = pageText.match(/(\d+)\s*万公里/);
        if (kmMatch) data.mileage = parseInt(kmMatch[1]) * 10000;
        
        return data;
      });
      
      await detailPage.close();
      return details;
    } catch (err) {
      await detailPage.close();
      throw err;
    }
  }

  saveData() {
    const today = new Date().toISOString().split('T')[0];
    const endTime = new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' });
    
    const validResults = this.results.filter(v => v.mileage <= 160000 || v.mileage === 0);
    
    const nzResults = validResults.filter(v => v.searchLocation === 'Auckland');
    const auResults = validResults.filter(v => v.searchLocation === 'Brisbane');
    
    const data = {
      source: 'Facebook Marketplace (通宵版)',
      date: today,
      startTime: this.startTime,
      endTime: endTime,
      total: validResults.length,
      byLocation: {
        auckland: nzResults.length,
        brisbane: auResults.length
      },
      errors: this.errors,
      vehicles: validResults
    };

    const filepath = path.join(this.dataDir, `facebook_overnight_${today}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║           🌙 通宵抓取完成！                    ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  完成时间: ${endTime}          ║`);
    console.log(`║  Auckland: ${nzResults.length.toString().padStart(3)} 辆                          ║`);
    console.log(`║  Brisbane: ${auResults.length.toString().padStart(3)} 辆                          ║`);
    console.log(`║  总计有效: ${validResults.length.toString().padStart(3)} 辆                          ║`);
    console.log('╚════════════════════════════════════════════════╝');

    return data;
  }
}

// 记录开始时间
const scraper = new FacebookOvernightScraper();
scraper.startTime = new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' });

scraper.run().catch(err => {
  console.error('致命错误:', err);
  process.exit(1);
});

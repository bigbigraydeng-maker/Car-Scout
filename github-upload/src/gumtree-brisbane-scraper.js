/**
 * Car Scout - Gumtree Australia Scraper
 * 专门抓取 Brisbane 地区二手车
 * 预算：$2,000 - $8,500 AUD
 * 里程：≤160,000km
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class GumtreeAustraliaScraper {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.results = [];
    this.errors = [];
    
    // Brisbane 坐标和 radius
    this.brisbaneCoords = {
      lat: -27.4698,
      lng: 153.0251,
      radius: 50 // 50km
    };
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚗 Gumtree Australia Scraper v1.0            ║');
    console.log('║        Brisbane 专用版                          ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    console.log('📍 地区: Brisbane, Queensland');
    console.log('💰 预算: $2,000 - $8,500 AUD');
    console.log('📏 里程: ≤160,000 km\n');
    
    const browser = await chromium.launch({
      headless: false,
      slowMo: 100,
      channel: 'msedge'
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    // 反检测脚本
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
      await this.executeSearches(page);
    } catch (err) {
      console.error('❌ 执行失败:', err.message);
      this.errors.push({ type: 'execution', message: err.message });
    } finally {
      await browser.close();
    }

    return this.saveData();
  }

  getSearchConfigs() {
    const configs = [];
    const brands = [
      { name: 'toyota', models: ['corolla', 'yaris', 'rav4'] },
      { name: 'honda', models: ['civic', 'accord', 'jazz', 'crv'] },
      { name: 'mazda', models: ['mazda3', 'mazda6', 'cx5'] }
    ];

    for (const brand of brands) {
      for (const model of brand.models) {
        configs.push({
          brand: brand.name,
          model: model,
          url: `https://www.gumtree.com.au/s-cars-vans-utes/brisbane/${brand.name}-${model}/k0c18320l3008845?price-range=2000-8500`
        });
      }
    }
    
    return configs;
  }

  async executeSearches(page) {
    const searches = this.getSearchConfigs();
    console.log(`📋 共 ${searches.length} 个搜索任务\n`);

    for (let i = 0; i < searches.length; i++) {
      const search = searches[i];
      console.log(`[${i+1}/${searches.length}] 🔍 ${search.brand} ${search.model}`);
      
      try {
        await this.scrapeSearch(page, search);
      } catch (err) {
        console.error(`   ❌ 失败: ${err.message.substring(0, 60)}`);
        this.errors.push({ 
          search: `${search.brand}-${search.model}`, 
          error: err.message 
        });
      }
      
      await page.waitForTimeout(5000);
    }
  }

  async scrapeSearch(page, config) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await page.goto(config.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        
        await page.waitForTimeout(5000);
        
        // 等待列表加载
        await page.waitForSelector('.user-ad-collection-new, .search-results-page, [class*="ad"]');
        
        // 滚动加载
        await this.scrollPage(page);
        
        // 提取列表
        const listings = await this.extractListings(page, config);
        console.log(`   📋 找到 ${listings.length} 个列表`);
        
        if (listings.length === 0) {
          console.log(`   ℹ️ 无结果\n`);
          return;
        }
        
        // 处理每个列表
        let validCount = 0;
        for (let j = 0; j < Math.min(listings.length, 10); j++) {
          const listing = listings[j];
          
          try {
            const details = await this.scrapeListingDetails(page, listing.url);
            
            if (this.isValidVehicle(details)) {
              // 里程过滤 (≤160k)
              if (details.mileage > 160000) {
                console.log(`      ⚠️ 跳过: 里程超标 (${details.mileage}km)`);
                continue;
              }
              
              this.results.push({
                ...details,
                searchBrand: config.brand,
                searchModel: config.model,
                source: 'Gumtree Australia'
              });
              validCount++;
              console.log(`      ✅ ${details.title?.substring(0, 40)} ($${details.price})`);
            }
          } catch (err) {
            console.log(`      ❌ 详情获取失败`);
          }
          
          await page.waitForTimeout(1500);
        }
        
        console.log(`   ✅ 有效: ${validCount} 辆\n`);
        return;
        
      } catch (err) {
        retryCount++;
        console.log(`   ⚠️ 重试 ${retryCount}/${maxRetries}`);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Max retries: ${err.message}`);
        }
        
        await page.waitForTimeout(5000);
      }
    }
  }

  async scrollPage(page) {
    console.log('   📜 滚动加载...');
    for (let i = 0; i < 3; i++) {
      try {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(3000);
      } catch (e) {}
    }
  }

  async extractListings(page, config) {
    try {
      return await page.evaluate(() => {
        const items = [];
        const seen = new Set();
        
        // Gumtree 选择器
        const selectors = [
          'a[href^="/s-ad/"]',
          '.user-ad-row a',
          '[data-testid="listing-item"] a',
          '.search-result a'
        ];
        
        let links = [];
        for (const sel of selectors) {
          links = document.querySelectorAll(sel);
          if (links.length > 0) break;
        }
        
        links.forEach(link => {
          try {
            const href = link.getAttribute('href') || '';
            if (!href.includes('/s-ad/')) return;
            
            const url = href.startsWith('http') ? href : `https://www.gumtree.com.au${href}`;
            if (seen.has(url)) return;
            seen.add(url);
            
            // 获取容器
            let container = link.closest('.user-ad-row, .search-result, [class*="ad"]') || 
                           link.parentElement?.parentElement;
            
            if (!container) container = link;
            
            const text = container.innerText || '';
            
            // 提取价格 - 格式: "$X,XXX" 或 "$XXXX"
            let price = 0;
            const priceMatch = text.match(/\$([\d,]+)/);
            if (priceMatch) {
              price = parseInt(priceMatch[1].replace(/,/g, ''));
            }
            
            // 过滤价格范围 (AUD 2000-8500)
            if (price < 2000 || price > 8500) return;
            
            // 提取标题
            let title = '';
            const titleEl = container.querySelector('h3, h2, .title, [class*="title"]');
            if (titleEl) {
              title = titleEl.innerText.trim();
            } else {
              title = link.innerText?.trim() || '';
            }
            
            // 提取位置
            let location = '';
            const locMatch = text.match(/(Brisbane|QLD|Queensland)/i);
            if (locMatch) {
              location = locMatch[0];
            }
            
            items.push({
              url,
              title: title.substring(0, 100),
              price,
              location,
              rawText: text.substring(0, 300)
            });
            
          } catch (e) {}
        });
        
        return items;
      });
    } catch (err) {
      console.error('提取失败:', err.message);
      return [];
    }
  }

  async scrapeListingDetails(page, url) {
    const detailPage = await page.context().newPage();
    
    try {
      await detailPage.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await detailPage.waitForTimeout(3000);
      
      const details = await detailPage.evaluate(() => {
        const data = {
          title: '',
          price: 0,
          year: 0,
          mileage: 0,
          location: '',
          description: '',
          url: window.location.href,
          seller: { name: '', type: 'private' }
        };
        
        const pageText = document.body.innerText || '';
        
        // 标题
        const h1 = document.querySelector('h1');
        if (h1) data.title = h1.innerText.trim();
        
        // 价格
        const priceMatch = pageText.match(/\$([\d,]+)/);
        if (priceMatch) {
          data.price = parseInt(priceMatch[1].replace(/,/g, ''));
        }
        
        // 年份
        const yearMatch = (data.title + ' ' + pageText).match(/\b(200[2-9]|201[0-9]|202[0-6])\b/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);
        
        // 里程 - 格式: "XXX,XXX km" 或 "XXXXXkm"
        const kmMatch = pageText.match(/([\d,]+)\s*(?:km|kms|kilometers)/i);
        if (kmMatch) {
          data.mileage = parseInt(kmMatch[1].replace(/,/g, ''));
        }
        
        // 位置
        const locMatch = pageText.match(/(Brisbane[^\n]*|QLD[^\n]*)/i);
        if (locMatch) data.location = locMatch[0].trim();
        
        // 描述
        const descEl = document.querySelector('.description, [class*="description"], #ad-description');
        if (descEl) {
          data.description = descEl.innerText.trim().substring(0, 500);
        }
        
        // 卖家名称
        const sellerEl = document.querySelector('.seller-name, [class*="seller"], .username');
        if (sellerEl) {
          data.seller.name = sellerEl.innerText.trim();
        }
        
        return data;
      });
      
      await detailPage.close();
      return details;
    } catch (err) {
      await detailPage.close();
      throw err;
    }
  }

  isValidVehicle(vehicle) {
    if (!vehicle || !vehicle.price) return false;
    if (vehicle.price < 2000 || vehicle.price > 8500) return false;
    return true;
  }

  saveData() {
    const today = new Date().toISOString().split('T')[0];
    
    const data = {
      source: 'Gumtree Australia',
      location: 'Brisbane',
      date: today,
      scrapeTime: new Date().toISOString(),
      total: this.results.length,
      priceRange: 'AUD $2,000 - $8,500',
      mileageLimit: '≤160,000 km',
      errors: this.errors,
      vehicles: this.results
    };

    const filepath = path.join(this.dataDir, `gumtree_brisbane_${today}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║              📊 Brisbane 抓取完成              ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  有效车辆: ${this.results.length.toString().padStart(3)} 辆                          ║`);
    console.log(`║  错误数量: ${this.errors.length.toString().padStart(3)} 个                          ║`);
    console.log(`║  预算范围: $2,000 - $8,500 AUD                 ║`);
    console.log(`║  里程限制: ≤160,000 km                         ║`);
    console.log('╚════════════════════════════════════════════════╝');

    return data;
  }
}

if (require.main === module) {
  new GumtreeAustraliaScraper().run().catch(err => {
    console.error('致命错误:', err);
    process.exit(1);
  });
}

module.exports = GumtreeAustraliaScraper;

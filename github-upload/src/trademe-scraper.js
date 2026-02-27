/**
 * Car Scout - TradeMe Scraper v2.1 (修复版)
 * 支持多品牌抓取
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class TradeMeScraper {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.results = [];
    this.errors = [];
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║      🚗 TradeMe Scraper v2.1 (修复版)          ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 100
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
      // 搜索所有品牌
      const brands = [
        { name: 'toyota', models: ['corolla', 'vitz', 'rav4'] },
        { name: 'honda', models: ['civic', 'accord', 'fit', 'cr-v'] },
        { name: 'mazda', models: ['mazda3', 'mazda6', 'cx-5'] }
      ];

      for (const brand of brands) {
        for (const model of brand.models) {
          await this.scrapeModel(page, brand.name, model);
        }
      }

    } catch (err) {
      console.error('❌ 执行失败:', err.message);
      this.errors.push({ type: 'execution', message: err.message });
    } finally {
      await browser.close();
    }

    return this.saveData();
  }

  buildSearchUrl(brand, model) {
    const params = new URLSearchParams({
      'price_min': '2000',
      'price_max': '5000',
      'year_min': '2002',
      'sort_order': 'expirydesc',
      'seller_type': 'private'
    });
    
    params.set('search_string', `${brand} ${model}`);
    
    return `https://www.trademe.co.nz/a/motors/cars/${brand}/search?${params.toString()}`;
  }

  async scrapeModel(page, brand, model) {
    console.log(`\n🔍 搜索: ${brand.toUpperCase()} ${model}`);
    
    const searchUrl = this.buildSearchUrl(brand, model);
    console.log(`   URL: ${searchUrl.substring(0, 80)}...`);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await page.goto(searchUrl, { 
          waitUntil: 'networkidle',
          timeout: 60000 
        });
        
        await page.waitForTimeout(5000);
        
        // 等待列表加载
        await page.waitForSelector('a[href*="/listing/"]', { timeout: 30000 });
        
        // 获取总页数
        const totalPages = await this.getTotalPages(page);
        console.log(`   📄 总页数: ${totalPages}`);
        
        // 抓取所有页面
        let currentPage = 1;
        while (currentPage <= Math.min(totalPages, 3)) { // 最多3页
          console.log(`   📄 第 ${currentPage}/${Math.min(totalPages, 3)} 页...`);
          
          const vehicles = await this.extractVehicles(page, brand, model);
          console.log(`      ✅ 找到 ${vehicles.length} 辆`);
          this.results.push(...vehicles);
          
          // 下一页
          if (currentPage < totalPages && currentPage < 3) {
            const hasNext = await this.goToNextPage(page);
            if (!hasNext) break;
            await page.waitForTimeout(3000);
          }
          
          currentPage++;
        }
        
        return; // 成功
        
      } catch (err) {
        retryCount++;
        console.log(`   ⚠️ 重试 ${retryCount}/${maxRetries}: ${err.message.substring(0, 60)}`);
        
        if (retryCount >= maxRetries) {
          this.errors.push({ brand, model, error: err.message });
          return;
        }
        
        await page.waitForTimeout(5000);
      }
    }
  }

  async getTotalPages(page) {
    try {
      return await page.evaluate(() => {
        // 查找分页
        const pagination = document.querySelector('.o-pagination__list, [class*="pagination"]');
        if (pagination) {
          const pages = pagination.querySelectorAll('li, button');
          return Math.min(pages.length, 5); // 最多5页
        }
        
        // 检查是否有下一页
        const nextBtn = document.querySelector('a[rel="next"], [aria-label*="next"], [aria-label*="下一页"]');
        return nextBtn ? 2 : 1;
      });
    } catch (err) {
      return 1;
    }
  }

  async goToNextPage(page) {
    try {
      const nextSelectors = [
        'a[rel="next"]',
        '.o-pagination__next',
        '[aria-label*="next"]'
      ];
      
      for (const sel of nextSelectors) {
        const nextBtn = await page.$(sel);
        if (nextBtn && !await nextBtn.evaluate(el => el.disabled)) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
            nextBtn.click()
          ]);
          await page.waitForTimeout(3000);
          return true;
        }
      }
      
      return false;
    } catch (err) {
      return false;
    }
  }

  async extractVehicles(page, brand, model) {
    try {
      return await page.evaluate(({ searchBrand, searchModel }) => {
        const vehicles = [];
        const seen = new Set();
        
        // TradeMe 2025 列表选择器
        const listingSelectors = [
          'a[href*="/listing/"]',
          '[class*="listing"] a[href*="/listing/"]',
          'article a[href*="/listing/"]'
        ];
        
        let listings = [];
        for (const sel of listingSelectors) {
          listings = document.querySelectorAll(sel);
          if (listings.length > 0) break;
        }
        
        listings.forEach(listing => {
          try {
            const href = listing.getAttribute('href') || '';
            if (!href.includes('/listing/')) return;
            
            const url = href.startsWith('http') ? href : `https://trademe.co.nz${href}`;
            if (seen.has(url)) return;
            seen.add(url);
            
            // 获取容器
            let container = listing.closest('article, [class*="listing"], [class*="card"]') || 
                           listing.parentElement?.parentElement;
            
            if (!container) container = listing;
            
            // 提取文本
            const text = container.innerText || container.textContent || '';
            const ariaLabel = listing.getAttribute('aria-label') || '';
            
            // 检查是否为个人卖家
            const isPrivate = text.toLowerCase().includes('private seller') || 
                             ariaLabel.toLowerCase().includes('private seller');
            if (!isPrivate) return;
            
            // 提取标题
            let title = '';
            const titleMatch = (text + ' ' + ariaLabel).match(/(20\d{2})\s+([A-Za-z0-9\s]+?)(?=\$|km|·|Listed|$)/i);
            if (titleMatch) {
              title = `${titleMatch[1]} ${titleMatch[2]}`.trim();
            }
            
            // 提取价格
            let price = 0;
            const priceMatch = (text + ' ' + ariaLabel).match(/\$([\d,]+)/);
            if (priceMatch) {
              price = parseInt(priceMatch[1].replace(/,/g, ''));
            }
            
            // 价格过滤
            if (price < 2000 || price > 5000) return;
            
            // 提取年份
            let year = 0;
            const yearMatch = (title + ' ' + text).match(/\b(200[2-9]|201[0-9]|202[0-6])\b/);
            if (yearMatch) {
              year = parseInt(yearMatch[1]);
            }
            
            // 提取里程
            let mileage = 0;
            const kmMatch = (text + ' ' + ariaLabel).match(/([\d,]+)\s*km/i);
            if (kmMatch) {
              mileage = parseInt(kmMatch[1].replace(/,/g, ''));
            }
            
            // 提取位置
            let location = '';
            const locMatch = text.match(/([A-Za-z\s\/]+),?\s*(Auckland|Waikato|Wellington|Canterbury|Otago)/i);
            if (locMatch) {
              location = `${locMatch[1].trim()}, ${locMatch[2]}`;
            }
            
            // 提取变速箱
            let transmission = '';
            if (text.toLowerCase().includes('automatic') || text.toLowerCase().includes('auto')) {
              transmission = 'Automatic';
            } else if (text.toLowerCase().includes('manual')) {
              transmission = 'Manual';
            }
            
            vehicles.push({
              title: title || `${year} ${searchBrand} ${searchModel}`,
              url,
              price,
              year,
              mileage,
              location,
              transmission,
              brand: searchBrand,
              model: searchModel,
              sellerType: 'private',
              source: 'TradeMe'
            });
            
          } catch (e) {
            // 忽略单个错误
          }
        });
        
        return vehicles;
      }, { searchBrand: brand, searchModel: model });
      
    } catch (err) {
      console.error('提取车辆失败:', err.message);
      return [];
    }
  }

  saveData() {
    // 去重
    const unique = [];
    const seen = new Set();
    
    this.results.forEach(v => {
      if (!seen.has(v.url)) {
        seen.add(v.url);
        unique.push(v);
      }
    });
    
    const today = new Date().toISOString().split('T')[0];
    
    const data = {
      source: 'TradeMe',
      date: today,
      scrapeTime: new Date().toISOString(),
      total: unique.length,
      sellerType: 'private only',
      errors: this.errors,
      vehicles: unique
    };

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const filename = `trademe_${today}.json`;
    const filepath = path.join(this.dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║                 📊 抓取完成                    ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  总计车辆: ${unique.length.toString().padStart(3)} 辆                          ║`);
    console.log(`║  去重数量: ${(this.results.length - unique.length).toString().padStart(3)} 辆                          ║`);
    console.log(`║  错误数量: ${this.errors.length.toString().padStart(3)} 个                          ║`);
    console.log(`║  保存文件: ${filename}              ║`);
    console.log('╚════════════════════════════════════════════════╝');

    return data;
  }
}

// 执行
if (require.main === module) {
  new TradeMeScraper().run().catch(err => {
    console.error('致命错误:', err);
    process.exit(1);
  });
}

module.exports = TradeMeScraper;

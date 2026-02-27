/**
 * Car Scout - Turners Auction 抓取器
 * 抓取Turners拍卖行的Toyota车辆
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class TurnersScraper {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.results = [];
    // Turners搜索URL
    this.searchUrls = [
      // Auckland拍卖
      'https://www.turners.co.nz/Cars/Search?&make=toyota&model=corolla&pricefrom=2000&priceto=5000',
      'https://www.turners.co.nz/Cars/Search?&make=toyota&model=yaris&pricefrom=2000&priceto=5000',
      'https://www.turners.co.nz/Cars/Search?&make=toyota&model=rav4&pricefrom=2000&priceto=5000',
      'https://www.turners.co.nz/Cars/Search?&make=toyota&pricefrom=2000&priceto=5000', // 所有Toyota
    ];
  }

  async run() {
    console.log('🚗 Turners Auction 抓取器\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
      for (let i = 0; i < this.searchUrls.length; i++) {
        const url = this.searchUrls[i];
        console.log(`\n🔍 [${i+1}/${this.searchUrls.length}] 搜索: ${url.split('model=')[1]?.split('&')[0] || 'All Toyota'}`);
        
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(5000);

          // 等待列表加载
          const loaded = await this.waitForListings(page);
          if (!loaded) {
            console.log('   ⚠️ 页面未找到车辆列表');
            continue;
          }

          // 提取车辆
          const vehicles = await this.extractVehicles(page);
          console.log(`   ✅ 找到 ${vehicles.length} 辆车`);
          this.results.push(...vehicles);

        } catch (err) {
          console.error(`   ❌ 失败: ${err.message}`);
        }
        
        await page.waitForTimeout(3000);
      }

    } catch (err) {
      console.error('❌ 抓取失败:', err.message);
    }

    await browser.close();

    // 去重
    const unique = this.deduplicate(this.results);
    
    // 保存数据
    const data = {
      source: 'Turners Auction',
      date: new Date().toISOString().split('T')[0],
      total: unique.length,
      vehicles: unique
    };

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const filename = `turners_${data.date}.json`;
    fs.writeFileSync(
      path.join(this.dataDir, filename),
      JSON.stringify(data, null, 2)
    );

    console.log(`\n🎉 Turners抓取完成!`);
    console.log(`📊 总计: ${unique.length} 辆拍卖车辆`);
    console.log(`💾 已保存: ${filename}`);

    return unique;
  }

  async waitForListings(page) {
    const selectors = [
      '.vehicle-card',
      '[data-testid="vehicle-card"]',
      '.listing-item',
      '.auction-item',
      '.car-listing'
    ];
    
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        return true;
      } catch (e) {
        continue;
      }
    }
    
    // 检查是否有结果
    const hasResults = await page.evaluate(() => {
      const text = document.body.textContent.toLowerCase();
      return !text.includes('no results') && !text.includes('没有找到');
    });
    
    return hasResults;
  }

  async extractVehicles(page) {
    return await page.evaluate(() => {
      const vehicles = [];
      
      // Turners选择器（根据实际页面调整）
      const selectors = [
        '.vehicle-card',
        '.listing-item',
        '[class*="vehicle"]',
        '[class*="listing"]'
      ];
      
      let listings = [];
      for (const sel of selectors) {
        listings = document.querySelectorAll(sel);
        if (listings.length > 0) break;
      }

      listings.forEach(listing => {
        try {
          const text = listing.textContent || '';
          
          // 提取标题
          const titleEl = listing.querySelector('h3, h2, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // 只保留Toyota
          if (!title.toLowerCase().includes('toyota')) return;
          
          // 提取链接
          const linkEl = listing.querySelector('a');
          const href = linkEl ? linkEl.getAttribute('href') : '';
          const url = href ? (href.startsWith('http') ? href : 'https://www.turners.co.nz' + href) : '';
          
          // 提取价格
          let price = 0;
          const priceEl = listing.querySelector('.price, [class*="price"], [class*="bid"]');
          if (priceEl) {
            const priceMatch = priceEl.textContent.match(/\$?([\d,]+)/);
            if (priceMatch) {
              price = parseInt(priceMatch[1].replace(/,/g, ''));
            }
          }
          
          // 跳过不在价格范围内的
          if (price > 0 && (price < 2000 || price > 5000)) return;
          
          // 提取年份
          let year = 0;
          const yearMatch = title.match(/\b(200[2-9]|201[0-9]|202[0-6])\b/);
          if (yearMatch) year = parseInt(yearMatch[1]);
          
          // 提取里程
          let mileage = 0;
          const kmMatch = text.match(/([\d,]+)\s*(km|kms|kilometres)/i);
          if (kmMatch) {
            mileage = parseInt(kmMatch[1].replace(/,/g, ''));
          }
          
          // 提取拍卖信息
          let auctionInfo = '';
          const auctionEl = listing.querySelector('.auction-info, [class*="auction"], [class*="closing"]');
          if (auctionEl) {
            auctionInfo = auctionEl.textContent.trim();
          }
          
          // 提取地点
          let location = '';
          const locationEl = listing.querySelector('.location, [class*="location"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
          }
          
          vehicles.push({
            title,
            url,
            price,
            year,
            mileage,
            location,
            auctionInfo,
            source: 'Turners Auction',
            sellerType: 'auction'
          });
          
        } catch (e) {
          console.error('解析失败:', e);
        }
      });

      return vehicles;
    });
  }

  deduplicate(vehicles) {
    const seen = new Set();
    return vehicles.filter(v => {
      if (seen.has(v.url)) return false;
      seen.add(v.url);
      return true;
    });
  }
}

// 直接运行
if (require.main === module) {
  new TurnersScraper().run().catch(console.error);
}

module.exports = TurnersScraper;

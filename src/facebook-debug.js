/**
 * Facebook Scraper Debug Version
 * 调试版 - 显示更多日志信息
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class FacebookScraperDebug {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.authDir = path.join(__dirname, '..', 'auth');
    this.results = [];
    
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🐛 Facebook Scraper 调试版 v2.4            ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const authFile = path.join(this.authDir, 'facebook_auth.json');
    const hasAuth = fs.existsSync(authFile);
    
    if (!hasAuth) {
      console.log('❌ 未找到登录状态');
      console.log('请先运行: node src/facebook-private-scraper.js 完成首次登录\n');
      return;
    }
    
    console.log('✅ 已登录\n');
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 200
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: authFile
    });
    
    const page = await context.newPage();

    try {
      // 测试单个搜索
      const searchUrl = 'https://www.facebook.com/marketplace/auckland/search/?query=toyota%20vitz&minPrice=2000&maxPrice=5000';
      
      console.log('🔍 测试搜索: Toyota Vitz (Auckland)\n');
      console.log(`URL: ${searchUrl}\n`);
      
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      console.log('⏳ 等待页面加载 (10秒)...\n');
      await page.waitForTimeout(10000);
      
      // 检查页面标题
      const title = await page.title();
      console.log(`📄 页面标题: ${title}\n`);
      
      // 调试信息
      const debug = await page.evaluate(() => {
        const info = {
          url: window.location.href,
          title: document.title,
          bodyText: document.body.innerText.substring(0, 500),
          links: {
            total: document.querySelectorAll('a').length,
            marketplace: document.querySelectorAll('a[href*="/marketplace/item/"]').length
          }
        };
        
        // 查找所有包含价格的文本
        const priceMatches = document.body.innerText.match(/\$[\d,]+/g) || [];
        info.priceMatches = priceMatches.slice(0, 10);
        
        return info;
      });
      
      console.log('📊 调试信息:\n');
      console.log(`   URL: ${debug.url}`);
      console.log(`   总链接: ${debug.links.total}`);
      console.log(`   Marketplace链接: ${debug.links.marketplace}\n`);
      
      console.log('💰 找到的价格:');
      debug.priceMatches.forEach(p => console.log(`   ${p}`));
      console.log('');
      
      if (debug.links.marketplace === 0) {
        console.log('❌ 未找到 Marketplace 车辆链接\n');
        console.log('可能原因:');
        console.log('   1. 搜索结果为空');
        console.log('   2. 需要滚动加载');
        console.log('   3. 页面结构变化\n');
        
        // 尝试滚动
        console.log('📜 尝试滚动加载...\n');
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 1000));
          await page.waitForTimeout(3000);
          
          const afterScroll = await page.evaluate(() => 
            document.querySelectorAll('a[href*="/marketplace/item/"]').length
          );
          console.log(`   滚动 ${i+1} 后: ${afterScroll} 个链接`);
        }
        console.log('');
      } else {
        console.log(`✅ 找到 ${debug.links.marketplace} 个车辆!\n`);
        
        // 提取详细信息
        const listings = await this.extractListings(page);
        console.log(`📋 成功提取 ${listings.length} 个列表:\n`);
        
        listings.slice(0, 5).forEach((item, i) => {
          console.log(`   [${i+1}] ${item.title}`);
          console.log(`       价格: $${item.price}`);
          console.log(`       里程: ${item.mileage?.toLocaleString() || '?'} km`);
          console.log(`       位置: ${item.location || '?'}`);
          console.log(`       URL: ${item.url.substring(0, 50)}...\n`);
        });
      }
      
    } catch (err) {
      console.error('❌ 错误:', err.message);
    } finally {
      console.log('按 Enter 关闭浏览器...');
      await new Promise(resolve => process.stdin.once('data', resolve));
      await browser.close();
    }
  }

  async extractListings(page) {
    return await page.evaluate(() => {
      const items = [];
      const seen = new Set();
      
      const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
      
      links.forEach(link => {
        try {
          const href = link.getAttribute('href') || '';
          if (!href.includes('/marketplace/item/')) return;
          
          let url = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
          url = url.split('?')[0];
          
          if (seen.has(url)) return;
          seen.add(url);
          
          let container = link.closest('[role="article"]') || 
                         link.closest('div[style*="max-width"]') ||
                         link.parentElement?.parentElement?.parentElement ||
                         link;
          
          const text = container.innerText || '';
          
          // 提取价格
          let price = 0;
          const priceMatch = text.match(/\$\s*([\d,]+)/);
          if (priceMatch) price = parseInt(priceMatch[1].replace(/,/g, ''));
          
          // 提取标题
          let title = link.getAttribute('aria-label') || '';
          if (!title) {
            const img = container.querySelector('img');
            if (img) title = img.getAttribute('alt') || '';
          }
          
          // 提取里程
          let mileage = 0;
          const kmMatch = text.match(/(\d+)\s*万公里/) || text.match(/([\d,]+)\s*km/i);
          if (kmMatch) {
            const num = kmMatch[1].replace(/,/g, '');
            mileage = kmMatch[0].includes('万') ? parseInt(num) * 10000 : parseInt(num);
          }
          
          // 提取位置
          let location = '';
          const locMatch = text.match(/([^\n]{3,30})\s*中的/);
          if (locMatch) location = locMatch[1];
          
          items.push({ url, title: title || 'Unknown', price, mileage, location });
        } catch (e) {}
      });
      
      return items;
    });
  }
}

new FacebookScraperDebug().run();

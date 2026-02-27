/**
 * Facebook Marketplace 车辆抓取器
 * 使用已登录的 Profile
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FB_PROFILE_DIR = path.join(__dirname, '..', 'auth', 'facebook_profile');
const OUTPUT_DIR = path.join(__dirname, '..', 'data');

async function scrapeFacebookMarketplace() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🚗 Facebook Marketplace 车辆抓取器           ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const timestamp = new Date().toISOString().split('T')[0];
  
  console.log('📅 日期:', timestamp);
  console.log('🌐 启动浏览器...\n');
  
  try {
    // 使用 Persistent Context（已登录）
    const context = await chromium.launchPersistentContext(FB_PROFILE_DIR, {
      headless: false,
      viewport: { width: 1920, height: 1080 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run'
      ]
    });
    
    const page = await context.newPage();
    
    // 搜索 Toyota Auckland
    const searchUrl = 'https://www.facebook.com/marketplace/auckland/search/?query=toyota&minPrice=2000&maxPrice=5000';
    
    console.log('🔍 搜索: Toyota (Auckland)');
    console.log('   价格范围: $2,000 - $5,000\n');
    
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // 等待页面加载
    await page.waitForTimeout(5000);
    
    console.log('⏳ 等待车辆列表加载...\n');
    
    // 滚动加载更多
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(2000);
    }
    
    // 提取车辆信息
    const vehicles = await page.evaluate(() => {
      const results = [];
      
      // 尝试多种选择器
      const listings = document.querySelectorAll('[role="article"], [data-testid="marketplace_search_result"], div[class*="x9f619"]');
      
      listings.forEach(listing => {
        try {
          // 提取标题
          const titleEl = listing.querySelector('span[class*="x1lliihq"], h3, h4');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // 提取价格
          const priceEl = listing.querySelector('span[class*="x193iq5w"], span:contains("$")');
          const priceText = priceEl ? priceEl.textContent.trim() : '';
          const priceMatch = priceText.match(/\$([0-9,]+)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(',', '')) : 0;
          
          // 提取位置
          const locationEl = listing.querySelector('span[class*="x1lkfr7t"], span[class*="x1lliihq"]');
          const location = locationEl ? locationEl.textContent.trim() : '';
          
          // 提取链接
          const linkEl = listing.querySelector('a[href*="/marketplace/item/"]');
          const url = linkEl ? 'https://www.facebook.com' + linkEl.getAttribute('href') : '';
          
          if (title && price > 0) {
            results.push({
              title,
              price,
              location,
              url,
              source: 'Facebook Marketplace',
              timestamp: new Date().toISOString()
            });
          }
        } catch (e) {
          // 跳过无法解析的列表
        }
      });
      
      return results;
    });
    
    console.log('✅ 抓取完成！');
    console.log('   找到车辆:', vehicles.length, '辆\n');
    
    // 显示结果
    if (vehicles.length > 0) {
      console.log('📋 TOP 10 车辆:\n');
      vehicles.slice(0, 10).forEach((v, i) => {
        console.log((i+1) + '. ' + v.title);
        console.log('   💰 $' + v.price + ' | 📍 ' + v.location);
        console.log('   🔗 ' + v.url);
        console.log();
      });
      
      // 保存数据
      const outputFile = path.join(OUTPUT_DIR, `facebook_${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify({
        date: timestamp,
        total: vehicles.length,
        vehicles
      }, null, 2));
      
      console.log('✅ 数据已保存:', outputFile);
    } else {
      console.log('⚠️ 未找到车辆，可能需要调整选择器');
      console.log('   建议: 手动检查页面结构\n');
    }
    
    await context.close();
    
    return vehicles;
    
  } catch (err) {
    console.error('❌ 抓取失败:', err.message);
    throw err;
  }
}

// 运行
scrapeFacebookMarketplace().catch(console.error);

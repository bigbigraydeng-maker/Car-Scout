/**
 * Facebook Marketplace 车辆抓取器 - 改进版
 * 使用实际页面元素选择器
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
        '--no-first-run',
        '--disable-infobars'
      ]
    });
    
    const page = await context.newPage();
    
    // 搜索 Auckland 车辆
    console.log('🔍 搜索: Auckland 车辆 $2,000-$5,000\n');
    
    // 直接访问 Marketplace 搜索页
    await page.goto('https://www.facebook.com/marketplace/auckland/vehicles/', {
      waitUntil: 'networkidle',
      timeout: 120000
    });
    
    console.log('⏳ 等待页面完全加载...');
    await page.waitForTimeout(8000);
    
    // 截图查看页面状态
    await page.screenshot({ path: 'debug_facebook.png', fullPage: true });
    console.log('📸 已保存页面截图: debug_facebook.png\n');
    
    // 获取页面信息
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasLoginForm: !!document.querySelector('input[name="email"]'),
        contentLength: document.body.innerText.length
      };
    });
    
    console.log('📄 页面信息:');
    console.log('   URL:', pageInfo.url);
    console.log('   标题:', pageInfo.title);
    console.log('   需要登录:', pageInfo.hasLoginForm ? '是' : '否');
    console.log('   内容长度:', pageInfo.contentLength, '字符\n');
    
    if (pageInfo.hasLoginForm) {
      console.log('❌ 需要重新登录 Facebook');
      console.log('   请在浏览器中完成登录\n');
      
      // 等待用户登录
      await page.waitForFunction(() => {
        return !document.querySelector('input[name="email"]');
      }, { timeout: 300000 });
      
      console.log('✅ 检测到登录成功！\n');
    }
    
    // 等待车辆列表加载
    console.log('⏳ 等待车辆列表...');
    
    // 滚动页面加载更多
    console.log('   滚动加载更多车辆...\n');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(3000);
      process.stdout.write('.');
    }
    console.log('\n');
    
    // 提取车辆信息 - 使用多种选择器策略
    const vehicles = await page.evaluate(() => {
      const results = [];
      
      // 获取所有可能的列表项
      const allElements = document.querySelectorAll('*');
      
      // 查找包含价格和车辆信息的文章
      const listings = document.querySelectorAll('div[role="article"], a[href*="/marketplace/item/"]');
      
      console.log('找到元素数量:', listings.length);
      
      listings.forEach((listing, index) => {
        try {
          // 获取文本内容
          const text = listing.innerText || '';
          
          // 查找价格模式 $数字
          const priceMatch = text.match(/\$([0-9,]+)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
          
          // 查找年份 (2000-2025)
          const yearMatch = text.match(/\b(200[0-9]|201[0-9]|202[0-5])\b/);
          const year = yearMatch ? parseInt(yearMatch[1]) : 0;
          
          // 查找里程数 (包含 km 或 kms)
          const kmMatch = text.match(/([0-9,]+)\s*(km|kms| kilomet)/i);
          const mileage = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
          
          // 获取链接
          const linkEl = listing.tagName === 'A' ? listing : listing.querySelector('a[href*="/marketplace/item/"]');
          const url = linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : 'https://www.facebook.com' + linkEl.getAttribute('href')) : '';
          
          // 获取标题（第一行或包含 Toyota/Honda/Mazda 的文本）
          const lines = text.split('\n').filter(l => l.trim());
          const title = lines[0] || '';
          
          // 筛选条件
          if (price >= 2000 && price <= 5000 && url) {
            results.push({
              title: title.substring(0, 100),
              price,
              year,
              mileage,
              url,
              rawText: text.substring(0, 200),
              source: 'Facebook Marketplace',
              timestamp: new Date().toISOString()
            });
          }
        } catch (e) {
          // 忽略解析错误
        }
      });
      
      return results;
    });
    
    console.log('✅ 抓取完成！');
    console.log('   找到车辆:', vehicles.length, '辆\n');
    
    // 去重（按 URL）
    const uniqueVehicles = vehicles.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
    
    console.log('   去重后:', uniqueVehicles.length, '辆\n');
    
    // 显示结果
    if (uniqueVehicles.length > 0) {
      console.log('📋 TOP 车辆:\n');
      uniqueVehicles.slice(0, 10).forEach((v, i) => {
        console.log((i+1) + '. ' + v.title);
        console.log('   💰 $' + v.price + (v.year ? ' | 📅 ' + v.year : '') + (v.mileage ? ' | 🛣️ ' + v.mileage + 'km' : ''));
        console.log('   🔗 ' + v.url.substring(0, 80) + '...');
        console.log();
      });
      
      // 保存数据
      const outputFile = path.join(OUTPUT_DIR, `facebook_${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify({
        date: timestamp,
        total: uniqueVehicles.length,
        vehicles: uniqueVehicles
      }, null, 2));
      
      console.log('✅ 数据已保存:', outputFile);
    } else {
      console.log('⚠️ 未找到符合条件的车辆');
      console.log('   建议: 检查页面结构或更换搜索条件\n');
      
      // 保存调试信息
      const debugFile = path.join(OUTPUT_DIR, `facebook_debug_${timestamp}.json`);
      fs.writeFileSync(debugFile, JSON.stringify({
        date: timestamp,
        pageInfo,
        message: 'No vehicles found'
      }, null, 2));
    }
    
    await context.close();
    
    return uniqueVehicles;
    
  } catch (err) {
    console.error('❌ 抓取失败:', err.message);
    console.error(err.stack);
    throw err;
  }
}

// 运行
scrapeFacebookMarketplace().catch(console.error);

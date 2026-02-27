/**
 * Facebook Marketplace 智能抓取器 v3
 * 改进版：更好的元素检测、模拟真实用户行为
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FB_PROFILE_DIR = path.join(__dirname, '..', 'auth', 'facebook_profile');
const OUTPUT_DIR = path.join(__dirname, '..', 'data');

// 调试截图目录
const DEBUG_DIR = path.join(__dirname, '..', 'debug');
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

async function scrapeFacebookMarketplace() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🚗 Facebook Marketplace 智能抓取器 v3        ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const timestamp = new Date().toISOString().split('T')[0];
  const vehicles = [];
  
  console.log('📅 日期:', timestamp);
  console.log('🌐 启动浏览器...\n');
  
  try {
    // 使用 Persistent Context（保持登录状态）
    const context = await chromium.launchPersistentContext(FB_PROFILE_DIR, {
      headless: false,  // 可见模式便于调试
      viewport: { width: 1920, height: 1080 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--disable-infobars',
        '--disable-web-security'
      ]
    });
    
    const page = await context.newPage();
    
    // 1. 先检查登录状态
    console.log('🔐 检查登录状态...');
    await page.goto('https://www.facebook.com/marketplace/', {
      waitUntil: 'networkidle',
      timeout: 120000
    });
    
    await page.waitForTimeout(5000);
    
    // 截图检查页面状态
    await page.screenshot({ path: path.join(DEBUG_DIR, 'fb_step1_initial.png') });
    
    // 检查是否需要登录
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('input[name="email"]') && 
             !document.querySelector('[data-testid="royal_login_button"]');
    });
    
    if (!isLoggedIn) {
      console.log('⚠️ 需要登录 Facebook');
      console.log('   请在打开的浏览器中完成登录...\n');
      
      // 等待用户登录
      await page.waitForFunction(() => {
        return !document.querySelector('input[name="email"]');
      }, { timeout: 300000 });
      
      console.log('✅ 登录成功！\n');
    } else {
      console.log('✅ 已登录\n');
    }
    
    // 2. 搜索 Auckland 车辆
    console.log('🔍 搜索 Auckland 车辆...');
    
    // 构建搜索URL（使用价格筛选）
    const searchUrl = 'https://www.facebook.com/marketplace/auckland/search/?query=toyota%20honda%20mazda&minPrice=2000&maxPrice=5000';
    
    await page.goto(searchUrl, {
      waitUntil: 'networkidle',
      timeout: 120000
    });
    
    console.log('⏳ 等待搜索结果加载...');
    await page.waitForTimeout(8000);
    
    // 截图查看搜索结果页
    await page.screenshot({ path: path.join(DEBUG_DIR, 'fb_step2_search.png'), fullPage: true });
    console.log('📸 已保存搜索结果截图\n');
    
    // 3. 模拟真实用户行为 - 滚动加载
    console.log('🖱️ 模拟用户滚动...');
    
    for (let i = 0; i < 5; i++) {
      // 随机滚动距离（模拟真实用户）
      const scrollAmount = 800 + Math.random() * 400;
      
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
      
      // 随机等待时间（3-6秒）
      const waitTime = 3000 + Math.random() * 3000;
      await page.waitForTimeout(waitTime);
      
      process.stdout.write('.');
    }
    console.log('\n✅ 滚动完成\n');
    
    // 4. 截图查看加载后的页面
    await page.screenshot({ path: path.join(DEBUG_DIR, 'fb_step3_scrolled.png'), fullPage: true });
    
    // 5. 提取车辆数据 - 多种策略
    console.log('🔍 提取车辆数据...\n');
    
    // 策略1：通过JavaScript直接提取页面中的数据
    const extractedData = await page.evaluate(() => {
      const results = [];
      
      // 获取页面所有文本内容
      const pageText = document.body.innerText;
      
      // 查找所有可能的车辆列表项
      // Facebook Marketplace 使用动态生成的div
      const allDivs = document.querySelectorAll('div[role="article"], div[class*="x1lliihq"], a[href*="/marketplace/item/"]');
      
      console.log('找到元素数量:', allDivs.length);
      
      allDivs.forEach((element, index) => {
        try {
          // 获取元素文本
          const text = element.innerText || element.textContent || '';
          const href = element.href || element.getAttribute('href') || '';
          
          // 查找价格模式 $数字
          const priceMatch = text.match(/\$([0-9,]+)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
          
          // 查找年份 (2000-2025)
          const yearMatch = text.match(/\b(200[0-9]|201[0-9]|202[0-5])\b/);
          const year = yearMatch ? parseInt(yearMatch[1]) : 0;
          
          // 查找里程
          const kmMatch = text.match(/([0-9,]+)\s*(km|kms| kilomet|k\s*m)/i);
          const mileage = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
          
          // 获取链接
          let url = '';
          if (href.includes('/marketplace/item/')) {
            url = href.startsWith('http') ? href : 'https://www.facebook.com' + href;
          } else {
            const linkEl = element.querySelector('a[href*="/marketplace/item/"]');
            if (linkEl) {
              const linkHref = linkEl.getAttribute('href');
              url = linkHref.startsWith('http') ? linkHref : 'https://www.facebook.com' + linkHref;
            }
          }
          
          // 提取标题（第一行或包含品牌的关键文本）
          const lines = text.split('\n').filter(l => l.trim());
          const title = lines[0] || '';
          
          // 查找位置
          const locationPatterns = [/Auckland/i, /North Shore/i, /Manukau/i, /Waitakere/i];
          let location = 'Auckland';
          for (const pattern of locationPatterns) {
            if (pattern.test(text)) {
              const match = text.match(pattern);
              if (match) {
                location = match[0];
                break;
              }
            }
          }
          
          // 筛选：价格范围 && 有URL
          if (price >= 2000 && price <= 8000 && url) {
            results.push({
              title: title.substring(0, 100),
              price,
              year,
              mileage,
              location,
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
      
      return {
        count: allDivs.length,
        results
      };
    });
    
    console.log('📊 提取结果:');
    console.log('   扫描元素:', extractedData.count);
    console.log('   找到车辆:', extractedData.results.length);
    
    vehicles.push(...extractedData.results);
    
    // 6. 如果上面方法没找到足够数据，尝试第二策略
    if (vehicles.length < 5) {
      console.log('\n🔍 尝试备用提取策略...');
      
      // 通过页面源码正则匹配
      const pageContent = await page.content();
      
      // 查找所有价格
      const priceMatches = pageContent.match(/\$([0-9,]+)/g) || [];
      console.log('   页面中找到', priceMatches.length, '个价格标签');
      
      // 查找所有marketplace链接
      const urlMatches = pageContent.match(/\/marketplace\/item\/\d+/g) || [];
      console.log('   找到', urlMatches.length, '个车辆链接');
    }
    
    // 7. 去重
    const uniqueVehicles = vehicles.filter((v, i, a) => 
      a.findIndex(t => t.url === v.url || (t.title === v.title && t.price === v.price)) === i
    );
    
    console.log('\n✅ 抓取完成！');
    console.log('   原始数据:', vehicles.length);
    console.log('   去重后:', uniqueVehicles.length);
    
    // 8. 保存结果
    if (uniqueVehicles.length > 0) {
      const outputFile = path.join(OUTPUT_DIR, `facebook_${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify({
        date: timestamp,
        total: uniqueVehicles.length,
        vehicles: uniqueVehicles
      }, null, 2));
      
      console.log('\n💾 已保存:', outputFile);
      
      // 显示TOP车辆
      console.log('\n📋 TOP 车辆:');
      uniqueVehicles.slice(0, 5).forEach((v, i) => {
        console.log(`${i + 1}. ${v.title}`);
        console.log(`   💰 $${v.price.toLocaleString()} | 📍 ${v.location}`);
        console.log(`   🔗 ${v.url.substring(0, 80)}...`);
        console.log();
      });
    } else {
      console.log('\n⚠️ 未找到车辆数据');
      console.log('   可能原因:');
      console.log('   - 页面结构变化');
      console.log('   - 需要更长的加载时间');
      console.log('   - 反爬虫限制\n');
    }
    
    // 9. 最终截图
    await page.screenshot({ path: path.join(DEBUG_DIR, 'fb_step4_final.png'), fullPage: true });
    console.log('📸 已保存最终截图\n');
    
    await context.close();
    
    return uniqueVehicles;
    
  } catch (err) {
    console.error('\n❌ 抓取失败:', err.message);
    console.error(err.stack);
    
    // 保存错误截图
    try {
      // 尝试截图（如果页面还存在）
    } catch (e) {}
    
    throw err;
  }
}

// 运行
scrapeFacebookMarketplace()
  .then(vehicles => {
    console.log('\n═══════════════════════════════════════');
    console.log('✅ 任务完成');
    console.log(`📊 共找到 ${vehicles.length} 辆车`);
    console.log('═══════════════════════════════════════\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n═══════════════════════════════════════');
    console.error('❌ 任务失败');
    console.error(err.message);
    console.error('═══════════════════════════════════════\n');
    process.exit(1);
  });

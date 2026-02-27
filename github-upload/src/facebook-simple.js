/**
 * Facebook Marketplace 抓取器 - 简化稳定版
 * 专注于提取可见的车辆数据
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FB_PROFILE_DIR = path.join(__dirname, '..', 'auth', 'facebook_profile');
const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const DEBUG_DIR = path.join(__dirname, '..', 'debug');

async function scrapeFacebook() {
  console.log('🚗 Facebook Marketplace 抓取器\n');
  
  const vehicles = [];
  const timestamp = new Date().toISOString().split('T')[0];
  
  try {
    // 启动浏览器
    const browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: fs.existsSync(path.join(FB_PROFILE_DIR, '..', 'facebook_auth.json')) 
        ? path.join(FB_PROFILE_DIR, '..', 'facebook_auth.json')
        : undefined
    });
    
    const page = await context.newPage();
    
    // 访问 Marketplace
    console.log('正在打开 Facebook Marketplace...');
    await page.goto('https://www.facebook.com/marketplace/auckland/search/?query=toyota&minPrice=2000&maxPrice=5000');
    
    // 等待页面加载
    console.log('等待页面加载（15秒）...');
    await page.waitForTimeout(15000);
    
    // 截图
    await page.screenshot({ path: path.join(DEBUG_DIR, 'fb_search.png'), fullPage: true });
    console.log('✅ 已截图保存\n');
    
    // 检查页面内容
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      hasLogin: !!document.querySelector('input[name="email"]'),
      bodyText: document.body.innerText.substring(0, 500)
    }));
    
    console.log('页面信息:');
    console.log('  标题:', pageInfo.title);
    console.log('  需要登录:', pageInfo.hasLogin);
    console.log('  内容预览:', pageInfo.bodyText.substring(0, 100) + '...\n');
    
    if (pageInfo.hasLogin) {
      console.log('⚠️ 需要登录 Facebook');
      console.log('请在浏览器中登录，然后按回车继续...');
      
      // 等待用户登录
      await page.waitForFunction(() => {
        return !document.querySelector('input[name="email"]');
      }, { timeout: 300000 });
      
      console.log('✅ 登录成功！\n');
      await page.waitForTimeout(5000);
    }
    
    // 滚动页面
    console.log('滚动加载更多内容...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(3000);
      process.stdout.write('.');
    }
    console.log('\n');
    
    // 提取车辆信息
    console.log('提取车辆数据...\n');
    
    const results = await page.evaluate(() => {
      const data = [];
      
      // 查找所有链接
      const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
      
      links.forEach(link => {
        const container = link.closest('div[role="article"]') || link.parentElement;
        if (!container) return;
        
        const text = container.innerText || '';
        const href = link.getAttribute('href') || '';
        
        // 提取价格
        const priceMatch = text.match(/\$([0-9,]+)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
        
        // 提取年份
        const yearMatch = text.match(/\b(200[0-9]|201[0-9]|202[0-5])\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : 0;
        
        // 提取标题（通常第一行）
        const lines = text.split('\n').filter(l => l.trim());
        const title = lines[0] || '';
        
        // 构建完整URL
        const url = href.startsWith('http') ? href : 'https://www.facebook.com' + href;
        
        if (price >= 2000 && price <= 5000 && title) {
          data.push({ title, price, year, url, text: text.substring(0, 100) });
        }
      });
      
      return data;
    });
    
    console.log('找到', results.length, '辆候选车辆\n');
    
    // 去重
    const unique = results.filter((v, i, a) => 
      a.findIndex(t => t.url === v.url) === i
    );
    
    console.log('去重后:', unique.length, '辆\n');
    
    // 显示结果
    if (unique.length > 0) {
      unique.slice(0, 10).forEach((v, i) => {
        console.log(`${i + 1}. ${v.title}`);
        console.log(`   💰 $${v.price.toLocaleString()} | 📅 ${v.year || 'N/A'}`);
        console.log(`   🔗 ${v.url}`);
        console.log();
      });
      
      // 保存
      fs.writeFileSync(path.join(OUTPUT_DIR, `facebook_${timestamp}.json`), 
        JSON.stringify({ date: timestamp, total: unique.length, vehicles: unique }, null, 2));
      console.log('✅ 数据已保存');
    } else {
      console.log('⚠️ 未找到符合条件的车辆');
    }
    
    await browser.close();
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
  }
}

scrapeFacebook();

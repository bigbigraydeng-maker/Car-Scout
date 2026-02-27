/**
 * Facebook Scraper Quick Test
 * 快速测试修复后的抓取器
 */

const { chromium } = require('playwright');

async function testFacebookScraper() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🧪 Facebook Scraper 修复测试 v2.4          ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const authFile = './auth/facebook_auth.json';
  const fs = require('fs');
  const hasAuth = fs.existsSync(authFile);
  
  if (!hasAuth) {
    console.log('⚠️  未找到登录状态，请先运行完整版 scraper 登录\n');
    console.log('运行: node src/facebook-private-scraper.js\n');
    return;
  }
  
  console.log('✅ 发现登录状态\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: authFile
  });
  
  const page = await context.newPage();
  
  try {
    // 测试搜索
    const testUrl = 'https://www.facebook.com/marketplace/auckland/search/?query=toyota%20vitz&minPrice=2000&maxPrice=5000';
    
    console.log('🔍 测试搜索: Toyota Vitz in Auckland\n');
    console.log(`URL: ${testUrl}\n`);
    
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    
    // 测试选择器
    console.log('🔍 测试选择器...\n');
    
    const results = await page.evaluate(() => {
      const data = {
        totalLinks: 0,
        marketplaceLinks: 0,
        sampleTexts: []
      };
      
      // 所有链接
      const allLinks = document.querySelectorAll('a');
      data.totalLinks = allLinks.length;
      
      // Marketplace 链接
      const mpLinks = document.querySelectorAll('a[href*="/marketplace/item/"]');
      data.marketplaceLinks = mpLinks.length;
      
      // 提取前3个样本
      let count = 0;
      mpLinks.forEach(link => {
        if (count < 3) {
          const container = link.closest('[role="article"]') || link.parentElement?.parentElement;
          const text = container ? (container.innerText || '').substring(0, 200) : (link.innerText || '').substring(0, 100);
          data.sampleTexts.push({
            href: link.getAttribute('href'),
            text: text.replace(/\n/g, ' ')
          });
          count++;
        }
      });
      
      return data;
    });
    
    console.log('📊 测试结果:\n');
    console.log(`   总链接数: ${results.totalLinks}`);
    console.log(`   Marketplace 链接: ${results.marketplaceLinks}`);
    console.log(`   样本数据:\n`);
    
    results.sampleTexts.forEach((sample, i) => {
      console.log(`   [${i+1}] ${sample.text.substring(0, 80)}...`);
      console.log(`       URL: ${sample.href?.substring(0, 60)}...\n`);
    });
    
    if (results.marketplaceLinks === 0) {
      console.log('❌ 未找到任何车辆列表\n');
      console.log('可能原因:');
      console.log('   1. 页面加载失败');
      console.log('   2. 页面结构已变化');
      console.log('   3. 需要重新登录\n');
    } else {
      console.log(`✅ 成功找到 ${results.marketplaceLinks} 个车辆列表!\n`);
    }
    
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
  } finally {
    await browser.close();
  }
}

testFacebookScraper();

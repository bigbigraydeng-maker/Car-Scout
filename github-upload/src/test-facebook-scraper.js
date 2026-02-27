/**
 * Facebook Marketplace 快速测试
 * 检查登录状态和抓取功能
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'auth', 'facebook_auth.json');

async function testFacebookScraper() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🔍 Facebook Marketplace 功能测试             ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  // 检查登录状态文件
  if (!fs.existsSync(AUTH_FILE)) {
    console.log('❌ 未找到 Facebook 登录状态文件');
    console.log('   需要先运行登录配置流程\n');
    return false;
  }
  
  console.log('✅ 找到登录状态文件\n');
  
  try {
    // 启动浏览器
    console.log('🌐 启动浏览器...\n');
    const browser = await chromium.launch({
      headless: false,
      slowMo: 200
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: AUTH_FILE
    });
    
    const page = await context.newPage();
    
    // 测试访问 Facebook Marketplace
    console.log('⏳ 测试访问 Facebook Marketplace...');
    await page.goto('https://www.facebook.com/marketplace/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    
    // 检查登录状态
    const checks = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasEmailInput: !!document.querySelector('input[name="email"], input#email'),
        hasLoginButton: !!document.querySelector('[data-testid="royal_login_button"]'),
        hasMarketplaceHeader: !!document.querySelector('[role="main"]'),
        pageTitle: document.title
      };
    });
    
    console.log('\n📊 检测结果:');
    console.log('   URL:', checks.url);
    console.log('   标题:', checks.pageTitle);
    console.log('   发现邮箱输入框:', checks.hasEmailInput ? '❌ 是（未登录）' : '✅ 否');
    console.log('   发现登录按钮:', checks.hasLoginButton ? '❌ 是（未登录）' : '✅ 否');
    console.log('   Marketplace 内容:', checks.hasMarketplaceHeader ? '✅ 是' : '❌ 否');
    
    const isLoggedIn = !checks.hasEmailInput && !checks.hasLoginButton;
    
    console.log('\n' + '═'.repeat(50));
    if (isLoggedIn) {
      console.log('✅ Facebook 登录状态正常！');
      console.log('✅ 可以开始抓取数据\n');
      
      // 测试搜索 Toyota
      console.log('🚗 测试搜索 Toyota...');
      await page.goto('https://www.facebook.com/marketplace/auckland/search/?query=toyota%20corolla%202000-5000', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      await page.waitForTimeout(5000);
      
      // 检查是否有搜索结果
      const searchResults = await page.evaluate(() => {
        const listings = document.querySelectorAll('[role="article"], [data-testid="marketplace_search_result"]');
        return listings.length;
      });
      
      console.log('   找到车辆列表:', searchResults, '辆\n');
      
      if (searchResults > 0) {
        console.log('✅ Facebook 抓取功能正常！');
      } else {
        console.log('⚠️ 未找到车辆列表，可能需要调整选择器');
      }
      
    } else {
      console.log('❌ Facebook 未登录，需要重新登录');
      console.log('   请运行: node src/facebook-auth-helper.js\n');
    }
    console.log('═'.repeat(50) + '\n');
    
    await context.close();
    await browser.close();
    
    return isLoggedIn;
    
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    console.log('\n可能原因:');
    console.log('   1. 登录状态已过期');
    console.log('   2. Facebook 阻止了访问');
    console.log('   3. 网络连接问题\n');
    return false;
  }
}

// 运行测试
testFacebookScraper().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('错误:', err);
  process.exit(1);
});

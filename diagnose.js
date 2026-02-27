/**
 * Facebook页面诊断工具
 * 检查页面结构和选择器
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function diagnose() {
  console.log('🔍 Facebook Marketplace 诊断工具');
  console.log('================================\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  try {
    // 测试1: Auckland Corolla
    console.log('📍 测试1: Auckland Corolla');
    await page.goto('https://www.facebook.com/marketplace/auckland/search/?query=toyota%20corolla&minPrice=2000&maxPrice=5000&sortBy=creation_time_descend', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    
    // 检查登录状态
    const loginButton = await page.$('[data-testid="royal_login_button"]');
    if (loginButton) {
      console.log('⚠️  未登录 - 请手动登录');
    } else {
      console.log('✅ 已登录');
    }

    // 测试各种选择器
    const selectors = [
      '[role="main"] div[class*="x1lliihq"] a[href*="/marketplace/item/"]',
      '[role="article"]',
      '[data-testid="marketplace_search_results"]',
      'a[href*="/marketplace/item/"]',
      'div[data-testid="marketplace_feed"]',
      'div[class*="x9f619"]',
      '[data-pagelet="root"]'
    ];

    console.log('\n📋 选择器测试结果:');
    for (const selector of selectors) {
      try {
        const count = await page.evaluate((sel) => {
          return document.querySelectorAll(sel).length;
        }, selector);
        console.log(`   ${count > 0 ? '✅' : '❌'} ${selector}: ${count} 个元素`);
      } catch (e) {
        console.log(`   ❌ ${selector}: 错误 - ${e.message}`);
      }
    }

    // 检查页面内容
    console.log('\n📄 页面信息:');
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasContent: document.body.innerText.length > 1000,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    console.log(`   标题: ${pageInfo.title}`);
    console.log(`   URL: ${pageInfo.url}`);
    console.log(`   有内容: ${pageInfo.hasContent}`);
    console.log(`   内容预览: ${pageInfo.bodyText.substring(0, 200)}...`);

    // 查找车辆链接
    const vehicleLinks = await page.$$eval('a[href*="/marketplace/item/"]', links => 
      links.slice(0, 5).map(l => ({
        href: l.href,
        text: l.innerText?.substring(0, 50) || 'no text'
      }))
    );
    
    console.log('\n🔗 车辆链接样本 (前5个):');
    vehicleLinks.forEach((link, i) => {
      console.log(`   ${i+1}. ${link.text}`);
      console.log(`      ${link.href.substring(0, 80)}...`);
    });

    // 保存诊断信息
    const diagnosis = {
      timestamp: new Date().toISOString(),
      pageInfo,
      vehicleLinks,
      selectors: selectors.map((sel, i) => ({ selector: sel, found: true }))
    };

    fs.writeFileSync('diagnosis.json', JSON.stringify(diagnosis, null, 2));
    console.log('\n💾 诊断信息已保存到 diagnosis.json');

    // 等待用户查看
    console.log('\n⏳ 浏览器保持打开，请按 Ctrl+C 关闭...');
    await new Promise(() => {});

  } catch (err) {
    console.error('\n❌ 诊断失败:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

diagnose().catch(console.error);

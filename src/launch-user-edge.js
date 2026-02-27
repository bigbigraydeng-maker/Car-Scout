/**
 * 使用系统 Edge 浏览器 + 用户 Profile
 * 不是 Testing 模式
 */

const { chromium } = require('playwright');
const path = require('path');

const FB_PROFILE_DIR = path.join(__dirname, '..', 'auth', 'facebook_profile');

async function launchUserEdge() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🌐 启动系统 Edge 浏览器（用户 Profile）      ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  console.log('📁 Profile 路径:', FB_PROFILE_DIR);
  console.log('🌐 使用 Persistent Context（保持登录状态）\n');
  
  try {
    // 使用 Persistent Context 启动 Edge
    const context = await chromium.launchPersistentContext(FB_PROFILE_DIR, {
      headless: false,
      viewport: { width: 1920, height: 1080 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });
    
    const page = await context.newPage();
    
    console.log('✅ 浏览器已启动');
    console.log('🚀 正在打开 Facebook Marketplace...\n');
    
    // 访问 Facebook Marketplace
    await page.goto('https://www.facebook.com/marketplace/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    // 检查登录状态
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('input[name="email"], input#email, [data-testid="royal_login_button"]');
    });
    
    console.log('═'.repeat(50));
    if (isLoggedIn) {
      console.log('✅ Facebook 已登录！');
      console.log('✅ 可以正常使用 Marketplace\n');
    } else {
      console.log('⚠️ Facebook 未登录');
      console.log('   请在浏览器中完成登录\n');
    }
    console.log('═'.repeat(50) + '\n');
    
    console.log('💡 提示:');
    console.log('   - 这是您的专用 Profile');
    console.log('   - 登录状态会保持');
    console.log('   - 关闭浏览器后状态自动保存');
    console.log('   - 下次启动会自动恢复登录\n');
    
    console.log('按 Ctrl+C 关闭浏览器...');
    
    // 保持运行
    await new Promise(() => {});
    
  } catch (err) {
    console.error('❌ 启动失败:', err.message);
    console.log('\n可能原因:');
    console.log('   1. Edge 浏览器未安装');
    console.log('   2. Profile 目录被占用');
    console.log('   3. 权限问题\n');
  }
}

launchUserEdge().catch(console.error);

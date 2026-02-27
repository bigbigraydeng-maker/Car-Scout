/**
 * Facebook 浏览器配置 - 独立 Profile 方案
 * 创建专用 Profile 避免与日常使用冲突
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '..', 'auth');
const FB_PROFILE_DIR = path.join(AUTH_DIR, 'facebook_profile');
const FB_COOKIES_FILE = path.join(AUTH_DIR, 'facebook_cookies.json');
const FB_STATE_FILE = path.join(AUTH_DIR, 'facebook_auth.json');

/**
 * 获取或创建 Facebook 专用浏览器上下文
 */
async function getFacebookContext() {
  console.log('🌐 配置 Facebook 浏览器...\n');
  
  // 确保目录存在
  if (!fs.existsSync(FB_PROFILE_DIR)) {
    fs.mkdirSync(FB_PROFILE_DIR, { recursive: true });
    console.log('✅ 创建专用 Profile 目录');
  }
  
  // 方案1: 如果有 storage state 文件，使用它
  if (fs.existsSync(FB_STATE_FILE)) {
    console.log('✅ 找到登录状态文件\n');
    
    const browser = await chromium.launch({
      headless: false,
      slowMo: 200
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: FB_STATE_FILE
    });
    
    return { browser, context, type: 'storage_state' };
  }
  
  // 方案2: 使用持久化上下文（首次登录）
  console.log('⚠️ 未找到登录状态，创建新 Profile...\n');
  console.log('💡 首次使用需要在浏览器中手动登录 Facebook\n');
  
  const context = await chromium.launchPersistentContext(FB_PROFILE_DIR, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });
  
  return { browser: null, context, type: 'persistent' };
}

/**
 * 保存 Facebook 登录状态
 */
async function saveFacebookState(context) {
  try {
    await context.storageState({ path: FB_STATE_FILE });
    console.log('✅ 登录状态已保存\n');
    return true;
  } catch (err) {
    console.error('❌ 保存失败:', err.message);
    return false;
  }
}

/**
 * 检查 Facebook 登录状态
 */
async function checkFacebookLogin(page) {
  await page.goto('https://www.facebook.com/marketplace/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(3000);
  
  const isLoggedIn = await page.evaluate(() => {
    return !document.querySelector('input[name="email"], input#email, [data-testid="royal_login_button"]');
  });
  
  return isLoggedIn;
}

/**
 * 完整的 Facebook 登录流程
 */
async function facebookLoginFlow() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🔐 Facebook 登录配置                         ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const { browser, context, type } = await getFacebookContext();
  const page = await context.newPage();
  
  console.log('🚀 打开 Facebook Marketplace...\n');
  
  // 检查登录状态
  const isLoggedIn = await checkFacebookLogin(page);
  
  if (isLoggedIn) {
    console.log('✅ Facebook 已登录！\n');
    
    if (type === 'persistent') {
      // 保存状态供后续使用
      await saveFacebookState(context);
    }
    
    await context.close();
    if (browser) await browser.close();
    
    return true;
  }
  
  console.log('⚠️ 需要登录 Facebook\n');
  console.log('请在打开的浏览器中：');
  console.log('   1. 输入您的 Facebook 邮箱和密码');
  console.log('   2. 完成登录（包括可能的验证）');
  console.log('   3. 确保 Marketplace 可以正常访问');
  console.log('   4. 关闭浏览器保存登录状态\n');
  
  console.log('⏳ 等待登录完成...');
  
  // 等待用户登录
  await page.waitForFunction(() => {
    return !document.querySelector('input[name="email"], input#email');
  }, { timeout: 300000 }); // 5分钟超时
  
  console.log('✅ 检测到登录成功！\n');
  
  // 保存状态
  await saveFacebookState(context);
  
  await context.close();
  if (browser) await browser.close();
  
  console.log('💡 下次运行将自动使用已登录状态\n');
  return true;
}

// 导出
module.exports = {
  getFacebookContext,
  saveFacebookState,
  checkFacebookLogin,
  facebookLoginFlow,
  FB_STATE_FILE,
  FB_PROFILE_DIR
};

// 直接运行
if (require.main === module) {
  facebookLoginFlow().catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
}

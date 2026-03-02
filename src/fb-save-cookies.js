/**
 * FB Cookie 导出工具
 * 打开可见浏览器窗口 → 登录 FB → 自动保存 cookie
 *
 * 用法: node src/fb-save-cookies.js
 * 只需运行一次（cookie 有效期通常 90 天）
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

puppeteer.use(StealthPlugin());

const COOKIES_PATH = path.join(__dirname, '..', 'data', 'fb_cookies.json');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  console.log('🌐 打开浏览器...\n');

  const browser = await puppeteer.launch({
    headless: false,  // 可见窗口！
    args: [
      '--no-sandbox',
      '--window-size=1280,900',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1280, height: 900 }
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Load existing cookies if available (may auto-login)
  try {
    const existingCookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
    if (Array.isArray(existingCookies) && existingCookies.length > 0) {
      await page.setCookie(...existingCookies);
      console.log(`🍪 已加载 ${existingCookies.length} 个旧 cookie，尝试自动登录...\n`);
    }
  } catch(e) { /* no existing cookies */ }

  await page.goto('https://www.facebook.com/marketplace/', { waitUntil: 'networkidle2', timeout: 60000 });

  // Check if actually logged in by looking for c_user cookie
  let cookies = await page.cookies('https://www.facebook.com');
  const hasSession = cookies.some(c => c.name === 'c_user');

  if (!hasSession) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 请在弹出的浏览器窗口中登录 Facebook');
    console.log('   自动检测登录状态（最多等待 3 分钟）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Poll for login completion
    const maxWait = 180000; // 3 minutes
    const start = Date.now();
    let loggedIn = false;
    while (Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, 3000));
      const checkCookies = await page.cookies('https://www.facebook.com');
      if (checkCookies.some(c => c.name === 'c_user')) {
        loggedIn = true;
        console.log('\n✅ 检测到登录成功！');
        break;
      }
      process.stdout.write('.');
    }
    if (!loggedIn) {
      console.log('\n⏰ 超时，未检测到登录。请重试。');
      await browser.close();
      return;
    }
    // Re-navigate to pick up all cookies
    await page.goto('https://www.facebook.com/marketplace/', { waitUntil: 'networkidle2', timeout: 30000 });
  } else {
    console.log('✅ 已登录 Facebook！');
  }

  // Navigate to marketplace to ensure we have all relevant cookies
  await page.goto('https://www.facebook.com/marketplace/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Export ALL cookies (including httpOnly)
  const allCookies = await page.cookies('https://www.facebook.com');

  // Filter to facebook-related cookies only
  const fbCookies = allCookies.filter(c =>
    c.domain.includes('facebook.com') || c.domain.includes('.facebook.com')
  );

  fs.writeFileSync(COOKIES_PATH, JSON.stringify(fbCookies, null, 2));

  // Verify key cookies
  const keyNames = ['c_user', 'xs', 'datr', 'fr'];
  const found = keyNames.filter(k => fbCookies.find(c => c.name === k));
  const missing = keyNames.filter(k => !fbCookies.find(c => c.name === k));

  console.log(`\n✅ 已保存 ${fbCookies.length} 个 cookie → ${COOKIES_PATH}`);
  console.log(`   关键 cookie: ${found.join(', ')} ✓`);
  if (missing.length > 0) {
    console.log(`   ⚠️ 缺少: ${missing.join(', ')}`);
  }

  // Show expiry of session cookie
  const xsCookie = fbCookies.find(c => c.name === 'xs');
  if (xsCookie && xsCookie.expires) {
    const expiry = new Date(xsCookie.expires * 1000);
    console.log(`   会话有效期: ${expiry.toLocaleDateString('zh-CN')}`);
  }

  await browser.close();
  console.log('\n🎉 完成！fb-delta-scan.js 现在可以访问 FB 详情页和检测已售状态了。');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});

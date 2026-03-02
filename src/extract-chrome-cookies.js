/**
 * 从 Chrome 浏览器提取 Facebook cookie（含 httpOnly）
 *
 * 原理: 启动你的 Chrome + 调试端口 → Puppeteer 连接 → 提取 cookie
 * 无需重新登录！
 *
 * 用法:
 *   1. 关闭 Chrome 浏览器
 *   2. node src/extract-chrome-cookies.js
 *   3. 重新打开 Chrome
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');

puppeteer.use(StealthPlugin());

const COOKIES_PATH = path.join(__dirname, '..', 'data', 'fb_cookies.json');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
const DEBUG_PORT = 9222;

function waitForDebugger(port, maxMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            resolve(info.webSocketDebuggerUrl);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', () => {
        if (Date.now() - start > maxMs) {
          reject(new Error('Chrome debugger timeout'));
        } else {
          setTimeout(check, 500);
        }
      });
      req.setTimeout(2000, () => { req.destroy(); setTimeout(check, 500); });
    };
    check();
  });
}

async function main() {
  console.log('🔑 提取 Facebook cookie（使用你的 Chrome 配置）\n');

  // Check Chrome not running
  try {
    const taskList = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', { encoding: 'utf8' });
    if (taskList.includes('chrome.exe')) {
      console.error('⛔ Chrome 正在运行！请先关闭所有 Chrome 窗口。\n');
      process.exit(1);
    }
  } catch (e) { /* ignore */ }

  // Launch Chrome with debugging port
  console.log('1️⃣ 启动 Chrome...');
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=800,600',
    'about:blank'
  ], { stdio: 'ignore', detached: true });
  chromeProc.unref();

  // Wait for debugger endpoint
  console.log('2️⃣ 等待调试端口...');
  let wsUrl;
  try {
    wsUrl = await waitForDebugger(DEBUG_PORT, 30000);
    console.log('   ✅ 已连接');
  } catch (e) {
    console.error('❌ 无法连接 Chrome 调试端口:', e.message);
    try { process.kill(-chromeProc.pid); } catch (_) {}
    process.exit(1);
  }

  // Connect Puppeteer
  console.log('3️⃣ 访问 Facebook...');
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();

  await page.goto('https://www.facebook.com/marketplace/', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Extract cookies
  console.log('4️⃣ 提取 cookie...');
  const allCookies = await page.cookies('https://www.facebook.com');
  const fbCookies = allCookies.filter(c =>
    c.domain.includes('facebook.com') || c.domain.includes('.facebook.com')
  );

  const hasCUser = fbCookies.some(c => c.name === 'c_user');
  const hasXs = fbCookies.some(c => c.name === 'xs');

  if (!hasCUser || !hasXs) {
    console.error('\n❌ Facebook 未登录！请先在 Chrome 中登录 Facebook，然后重新运行。');
    await page.close();
    browser.disconnect();
    // Kill Chrome
    // (removed taskkill - use Chrome extension method instead)
    process.exit(1);
  }

  // Save cookies
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(fbCookies, null, 2));

  // Report
  const keyNames = ['c_user', 'xs', 'datr', 'fr', 'sb'];
  const found = keyNames.filter(k => fbCookies.find(c => c.name === k));
  const missing = keyNames.filter(k => !fbCookies.find(c => c.name === k));

  console.log(`\n✅ 已保存 ${fbCookies.length} 个 cookie → ${COOKIES_PATH}`);
  console.log(`   关键 cookie: ${found.join(', ')} ✓`);
  if (missing.length > 0) console.log(`   ⚠️ 缺少: ${missing.join(', ')}`);

  const cUser = fbCookies.find(c => c.name === 'c_user');
  if (cUser) console.log(`   用户 ID: ${cUser.value}`);

  const xsCookie = fbCookies.find(c => c.name === 'xs');
  if (xsCookie && xsCookie.expires > 0) {
    console.log(`   会话有效期: ${new Date(xsCookie.expires * 1000).toLocaleDateString('zh-CN')}`);
  }

  // Close Chrome
  await page.close();
  browser.disconnect();
  // (removed taskkill - use Chrome extension method instead)

  console.log('\n🎉 完成！现在可以重新打开 Chrome。');
  console.log('   fb-delta-scan.js 可以完整运行了！');
}

main().catch(e => {
  console.error('Error:', e.message || e);
  // (removed taskkill - use Chrome extension method instead)
  process.exit(1);
});

/**
 * Facebook 浏览器配置指南
 * 
 * 正确配置 Persistent Context 保持登录状态
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 用户数据目录配置
const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function createPersistentContext() {
  console.log('🌐 配置 Facebook 浏览器...\n');
  console.log('用户数据目录:', USER_DATA_DIR);
  console.log('Edge 路径:', EDGE_PATH, '\n');
  
  // 检查 Edge 是否安装
  const useEdge = fs.existsSync(EDGE_PATH);
  
  if (!useEdge) {
    console.log('⚠️ 未找到系统 Edge，使用 Playwright Chromium');
  } else {
    console.log('✅ 找到系统 Edge 浏览器\n');
  }
  
  // 方案1: 使用 Persistent Context (推荐)
  // 这会使用您系统中已登录的 Edge 配置
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    executablePath: useEdge ? EDGE_PATH : undefined,
    viewport: { width: 1920, height: 1080 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  return context;
}

// 使用示例
async function example() {
  const context = await createPersistentContext();
  const page = await context.newPage();
  
  // 访问 Facebook - 应该已经登录
  await page.goto('https://www.facebook.com/marketplace/');
  await page.waitForTimeout(3000);
  
  // 检查登录状态
  const isLoggedIn = await page.evaluate(() => {
    return !document.querySelector('input[name="email"]');
  });
  
  if (isLoggedIn) {
    console.log('✅ Facebook 已登录！');
  } else {
    console.log('⚠️ 需要手动登录 Facebook');
    console.log('请在浏览器中完成登录，然后关闭浏览器保存状态');
  }
  
  // 保持浏览器打开
  console.log('\n按 Ctrl+C 关闭...');
}

// 导出配置
module.exports = {
  USER_DATA_DIR,
  EDGE_PATH,
  createPersistentContext
};

// 如果直接运行
if (require.main === module) {
  example().catch(err => {
    console.error('错误:', err.message);
    process.exit(1);
  });
}

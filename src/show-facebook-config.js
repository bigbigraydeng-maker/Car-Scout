/**
 * 显示 Facebook 浏览器配置信息
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'auth', 'facebook_auth.json');
const FB_PROFILE_DIR = path.join(__dirname, '..', 'auth', 'facebook_profile');

async function showFacebookConfig() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🔍 Facebook 浏览器配置详情                   ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  console.log('📁 配置文件路径:');
  console.log('   Auth 文件:', AUTH_FILE);
  console.log('   Profile 目录:', FB_PROFILE_DIR);
  console.log('');
  
  // 检查文件
  const hasAuthFile = fs.existsSync(AUTH_FILE);
  const hasProfileDir = fs.existsSync(FB_PROFILE_DIR);
  
  console.log('📊 文件状态:');
  console.log('   Auth 文件:', hasAuthFile ? '✅ 存在' : '❌ 不存在');
  console.log('   Profile 目录:', hasProfileDir ? '✅ 存在' : '❌ 不存在');
  console.log('');
  
  if (hasAuthFile) {
    const stats = fs.statSync(AUTH_FILE);
    console.log('   Auth 文件大小:', (stats.size / 1024).toFixed(2), 'KB');
    console.log('   最后修改:', stats.mtime.toLocaleString());
    console.log('');
  }
  
  console.log('🌐 启动浏览器查看实际效果...\n');
  console.log('浏览器将打开，您可以查看:');
  console.log('   1. 是否已登录 Facebook');
  console.log('   2. Marketplace 是否正常显示');
  console.log('   3. Profile 配置是否正确\n');
  
  try {
    const browser = await chromium.launch({
      headless: false,
      slowMo: 200
    });
    
    console.log('✅ 浏览器已启动');
    console.log('正在加载 Facebook Marketplace...\n');
    
    let context;
    
    if (hasAuthFile) {
      console.log('使用 Auth 文件 (storageState)...');
      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        storageState: AUTH_FILE
      });
    } else {
      console.log('使用新 Context (无登录状态)...');
      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
    }
    
    const page = await context.newPage();
    
    // 打开 Facebook Marketplace
    await page.goto('https://www.facebook.com/marketplace/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log('✅ 页面已加载');
    console.log('请查看浏览器中的登录状态\n');
    console.log('按 Ctrl+C 关闭...');
    
    // 保持浏览器打开
    await new Promise(() => {});
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
  }
}

showFacebookConfig().catch(console.error);

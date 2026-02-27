/**
 * Facebook 浏览器登录测试
 * 验证是否正确使用系统 Edge 的登录状态
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testFacebookLogin() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🔐 Facebook 浏览器登录测试                   ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  // 配置路径
  const userDataDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  console.log('📁 用户数据目录:', userDataDir);
  console.log('🌐 Edge 路径:', edgePath);
  console.log('');
  
  // 检查 Edge 是否存在
  if (!fs.existsSync(edgePath)) {
    console.log('❌ 未找到 Microsoft Edge 浏览器');
    console.log('   请确保 Edge 已安装在默认位置\n');
    return;
  }
  
  if (!fs.existsSync(userDataDir)) {
    console.log('❌ 未找到 Edge 用户数据目录');
    console.log('   路径:', userDataDir, '\n');
    return;
  }
  
  console.log('✅ 找到 Edge 浏览器\n');
  console.log('🚀 启动浏览器并检查 Facebook 登录状态...\n');
  
  try {
    // 使用持久化上下文启动 Edge
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      executablePath: edgePath,
      viewport: { width: 1920, height: 1080 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--restore-last-session'  // 恢复上次会话
      ]
    });
    
    const page = await context.newPage();
    
    // 访问 Facebook
    console.log('⏳ 正在打开 Facebook Marketplace...');
    await page.goto('https://www.facebook.com/marketplace/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    
    // 检查登录状态
    const pageContent = await page.content();
    const pageTitle = await page.title();
    
    console.log('\n📄 页面标题:', pageTitle);
    
    // 多种方式检测登录状态
    const checks = await page.evaluate(() => {
      return {
        hasEmailInput: !!document.querySelector('input[name="email"], input#email'),
        hasLoginButton: !!document.querySelector('[data-testid="royal_login_button"]'),
        hasMarketplaceNav: !!document.querySelector('[aria-label="Marketplace"]'),
        hasProfilePic: !!document.querySelector('img[alt*="profile"], [role="img"]'),
        url: window.location.href
      };
    });
    
    console.log('\n📊 登录状态检测:');
    console.log('   - 发现邮箱输入框:', checks.hasEmailInput ? '❌ 是（未登录）' : '✅ 否');
    console.log('   - 发现登录按钮:', checks.hasLoginButton ? '❌ 是（未登录）' : '✅ 否');
    console.log('   - 发现 Marketplace 导航:', checks.hasMarketplaceNav ? '✅ 是' : '❌ 否');
    console.log('   - 发现用户头像:', checks.hasProfilePic ? '✅ 是' : '❌ 否');
    console.log('   - 当前 URL:', checks.url);
    
    const isLoggedIn = !checks.hasEmailInput && !checks.hasLoginButton;
    
    console.log('\n' + '═'.repeat(50));
    if (isLoggedIn) {
      console.log('✅ Facebook 已登录！可以正常使用');
    } else {
      console.log('⚠️ Facebook 未登录');
      console.log('   请在浏览器中手动登录 Facebook');
      console.log('   登录后关闭浏览器即可保存状态');
    }
    console.log('═'.repeat(50) + '\n');
    
    // 保持浏览器打开供用户操作
    console.log('💡 提示:');
    console.log('   - 浏览器将保持打开');
    console.log('   - 如需登录，请在浏览器中完成');
    console.log('   - 完成后关闭浏览器保存状态');
    console.log('   - 下次启动将自动使用已登录状态\n');
    
    console.log('按 Ctrl+C 关闭此测试...');
    
    // 保持运行
    await new Promise(() => {});
    
  } catch (err) {
    console.error('❌ 启动失败:', err.message);
    console.log('\n可能原因:');
    console.log('   1. Edge 正在运行，无法访问用户数据');
    console.log('   2. 权限不足');
    console.log('   3. 路径配置错误\n');
    console.log('解决方案:');
    console.log('   - 关闭所有 Edge 窗口后重试');
    console.log('   - 或改用 Chromium 模式\n');
  }
}

// 运行测试
testFacebookLogin().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});

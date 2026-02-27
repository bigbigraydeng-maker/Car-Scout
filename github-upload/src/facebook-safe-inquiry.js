/**
 * Car Scout - Facebook Safe Auto-Inquiry (测试版)
 * 限制发送数量，添加较长延迟，降低封号风险
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class FacebookSafeInquiry {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.authDir = path.join(__dirname, '..', 'auth');
    this.MAX_INQUIRIES = 2; // 最多发送2条
    this.inquiryCount = 0;
    this.inquiriesSent = [];
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚗 Facebook Safe Auto-Inquiry (测试版)       ║');
    console.log('║        限制: 最多2条 | 延迟: 5-10秒            ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const authFile = path.join(this.authDir, 'facebook_auth.json');
    if (!fs.existsSync(authFile)) {
      console.log('❌ 未找到登录状态文件:', authFile);
      return;
    }
    
    console.log('✅ 找到登录状态文件\n');
    
    // 使用系统 Edge 浏览器 (已登录)
    console.log('🌐 启动系统 Edge 浏览器...\n');
    
    let browser;
    
    try {
      browser = await chromium.launch({
        headless: false,
        slowMo: 300,
        channel: 'msedge'  // 使用系统 Edge 浏览器
      });
    } catch (err) {
      console.log('⚠️ Edge 启动失败，使用默认浏览器...\n');
      browser = await chromium.launch({
        headless: false,
        slowMo: 300
      });
    }
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: authFile
    });
    
    const page = await context.newPage();

    try {
      // 直接开始搜索，Edge 已登录
      console.log('🚀 直接开始搜索...\n');
      await this.testInquiry(page);
    } catch (err) {
      console.error('❌ 错误:', err.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    this.saveResults();
  }

  async testInquiry(page) {
    // 搜索 Toyota Vitz（更多卖家不写里程）
    const searchUrl = 'https://www.facebook.com/marketplace/auckland/search/?query=toyota%20vitz&minPrice=2000&maxPrice=5000';
    
    console.log('🔍 搜索: Toyota Corolla (Auckland)\n');
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    
    // 滚动加载
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(3000);
    }
    
    // 提取列表
    const listings = await page.evaluate(() => {
      const items = [];
      const seen = new Set();
      document.querySelectorAll('a[href*="/marketplace/item/"]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        let url = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
        url = url.split('?')[0];
        if (!seen.has(url)) {
          seen.add(url);
          items.push({ url });
        }
      });
      return items;
    });
    
    console.log(`📋 找到 ${listings.length} 个列表\n`);
    
    // 检查前5辆车
    for (let i = 0; i < Math.min(5, listings.length); i++) {
      if (this.inquiryCount >= this.MAX_INQUIRIES) {
        console.log(`⚠️ 已达到最大发送限制 (${this.MAX_INQUIRIES}条)，停止\n`);
        break;
      }
      
      const listing = listings[i];
      console.log(`[${i+1}/5] 检查车辆...`);
      
      try {
        // 打开详情页
        await page.goto(listing.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);
        
        // 提取信息
        const vehicle = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const title = h1 ? h1.innerText.trim() : '';
          
          const pageText = document.body.innerText || '';
          const priceMatch = pageText.match(/NZ\$\s*([\d,]+)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
          
          // 检查里程
          const fullText = pageText;
          const hasMileage = /\d{2,3}[KX]+|ODO|\d+\s*万公里|\d{1,3},\d{3}\s*km/i.test(fullText);
          
          const sellerLink = document.querySelector('a[href*="/marketplace/profile/"]');
          const sellerName = sellerLink ? sellerLink.innerText.trim() : '';
          
          return { title, price, hasMileage, sellerName };
        });
        
        console.log(`   标题: ${vehicle.title}`);
        console.log(`   价格: $${vehicle.price}`);
        console.log(`   卖家: ${vehicle.sellerName}`);
        console.log(`   里程: ${vehicle.hasMileage ? '✅ 已提供' : '❌ 未提供'}`);
        
        if (!vehicle.hasMileage && this.inquiryCount < this.MAX_INQUIRIES) {
          console.log(`   📧 准备发送询问...`);
          
          // 随机延迟 5-10秒
          const delay = 5000 + Math.random() * 5000;
          console.log(`   ⏳ 等待 ${(delay/1000).toFixed(1)} 秒...`);
          await page.waitForTimeout(delay);
          
          // 发送询问
          const sent = await this.sendInquiry(page, vehicle);
          if (sent) {
            this.inquiryCount++;
            this.inquiriesSent.push({
              title: vehicle.title,
              price: vehicle.price,
              seller: vehicle.sellerName,
              url: listing.url,
              sentTime: new Date().toISOString()
            });
            console.log(`   ✅ 已发送 (${this.inquiryCount}/${this.MAX_INQUIRIES})\n`);
          }
        } else {
          console.log(`   ${vehicle.hasMileage ? '✓ 跳过（有里程）' : '⚠️ 跳过（已达上限）'}\n`);
        }
        
      } catch (err) {
        console.log(`   ❌ 错误: ${err.message}\n`);
      }
    }
    
    console.log(`\n📊 总结:`);
    console.log(`   已发送询问: ${this.inquiryCount} 条`);
    console.log(`   下次检查时间: 4小时后\n`);
  }

  async sendInquiry(page, vehicle) {
    try {
      // 找到并点击"发消息"按钮
      const messageBtn = await page.$('button:has-text("发消息"), button:has-text("Message")');
      if (!messageBtn) {
        console.log(`   ⚠️ 未找到发消息按钮`);
        return false;
      }
      
      await messageBtn.click();
      await page.waitForTimeout(3000);
      
      // 个性化消息
      const messages = [
        `Hi ${vehicle.sellerName || 'there'}, I'm interested in your ${vehicle.title}. Could you please tell me the current odometer reading? Thanks!`,
        `Hi, I saw your ${vehicle.title} listing. It looks great! Could you share the current mileage/km? Thanks!`,
        `Hello! I'm interested in the ${vehicle.title}. Before I arrange a viewing, could you let me know the current odometer reading? Cheers!`
      ];
      
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // 找到输入框
      const inputSelectors = [
        'textarea[placeholder*="消息"]',
        'textarea[placeholder*="message"]',
        'div[contenteditable="true"]',
        '[role="textbox"]'
      ];
      
      let messageBox = null;
      for (const sel of inputSelectors) {
        messageBox = await page.$(sel);
        if (messageBox) break;
      }
      
      if (!messageBox) {
        console.log(`   ⚠️ 未找到消息输入框`);
        return false;
      }
      
      // 输入消息
      await messageBox.fill(message);
      await page.waitForTimeout(2000);
      
      // 找到发送按钮
      const sendBtn = await page.$('button:has-text("发送"), button:has-text("Send")');
      if (!sendBtn) {
        console.log(`   ⚠️ 未找到发送按钮`);
        return false;
      }
      
      // 发送
      await sendBtn.click();
      await page.waitForTimeout(3000);
      
      return true;
      
    } catch (err) {
      console.log(`   ❌ 发送失败: ${err.message}`);
      return false;
    }
  }

  saveResults() {
    const today = new Date().toISOString().split('T')[0];
    const data = {
      date: today,
      testType: 'Safe Auto-Inquiry',
      inquiriesSent: this.inquiryCount,
      vehicles: this.inquiriesSent
    };
    
    const filepath = path.join(this.dataDir, `facebook_inquiry_test_${today}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    console.log(`💾 结果已保存: ${filepath}\n`);
  }
}

if (require.main === module) {
  new FacebookSafeInquiry().run().catch(err => {
    console.error('致命错误:', err);
    process.exit(1);
  });
}

module.exports = FacebookSafeInquiry;

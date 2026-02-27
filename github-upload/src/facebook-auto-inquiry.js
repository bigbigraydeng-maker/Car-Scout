/**
 * Car Scout - Facebook Marketplace Auto-Inquiry Scraper
 * 当车辆没有里程信息时，自动发送站内信询问
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class FacebookAutoInquiryScraper {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.authDir = path.join(__dirname, '..', 'auth');
    this.pendingFile = path.join(this.dataDir, 'pending_inquiries.json');
    this.results = [];
    this.pendingInquiries = [];
    this.errors = [];
    
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.authDir)) fs.mkdirSync(this.authDir, { recursive: true });
    
    // 加载之前的待回复列表
    this.loadPendingInquiries();
  }

  loadPendingInquiries() {
    if (fs.existsSync(this.pendingFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.pendingFile, 'utf8'));
        this.pendingInquiries = data.inquiries || [];
        console.log(`📋 加载了 ${this.pendingInquiries.length} 个待回复询问`);
      } catch (e) {
        this.pendingInquiries = [];
      }
    }
  }

  savePendingInquiries() {
    const data = {
      lastUpdated: new Date().toISOString(),
      inquiries: this.pendingInquiries
    };
    fs.writeFileSync(this.pendingFile, JSON.stringify(data, null, 2));
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚗 Facebook Auto-Inquiry Scraper v1.0        ║');
    console.log('║        (无里程自动询问版)                      ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const authFile = path.join(this.authDir, 'facebook_auth.json');
    const hasAuth = fs.existsSync(authFile);
    
    if (!hasAuth) {
      console.log('❌ 未找到登录状态，请先手动登录');
      return;
    }
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 200
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: authFile
    });
    
    const page = await context.newPage();

    try {
      // 1. 首先检查之前待回复的询问
      await this.checkPreviousReplies(page);
      
      // 2. 执行新的搜索
      await this.executeSearches(page);
      
    } catch (err) {
      console.error('❌ 执行失败:', err.message);
    } finally {
      await browser.close();
    }

    this.savePendingInquiries();
    this.saveResults();
  }

  async checkPreviousReplies(page) {
    if (this.pendingInquiries.length === 0) return;
    
    console.log(`\n📧 检查 ${this.pendingInquiries.length} 个待回复询问...\n`);
    
    const updatedInquiries = [];
    
    for (const inquiry of this.pendingInquiries.slice(0, 5)) {
      try {
        console.log(`   检查: ${inquiry.title?.substring(0, 30)}...`);
        
        // 打开对话检查回复
        const hasReply = await this.checkInboxForReply(page, inquiry);
        
        if (hasReply) {
          console.log(`      ✅ 收到回复！`);
          // 保存到结果
          this.results.push({
            ...inquiry,
            hasReply: true,
            replyTime: new Date().toISOString()
          });
        } else {
          console.log(`      ⏳ 暂无回复`);
          // 保留在待回复列表
          updatedInquiries.push(inquiry);
        }
        
        await page.waitForTimeout(2000);
      } catch (err) {
        console.log(`      ❌ 检查失败: ${err.message}`);
        updatedInquiries.push(inquiry);
      }
    }
    
    this.pendingInquiries = updatedInquiries;
    console.log(`\n   剩余待回复: ${this.pendingInquiries.length} 个\n`);
  }

  async checkInboxForReply(page, inquiry) {
    // 简化的检查逻辑 - 实际实现需要访问 Facebook Messenger
    // 这里先返回 false，表示暂无回复
    return false;
  }

  async executeSearches(page) {
    const searches = [
      { location: 'auckland', brand: 'toyota', model: 'corolla', minPrice: 2000, maxPrice: 5000 },
      { location: 'auckland', brand: 'toyota', model: 'vitz', minPrice: 2000, maxPrice: 5000 },
      { location: 'waikato', brand: 'toyota', model: 'corolla', minPrice: 2000, maxPrice: 5000 },
    ];
    
    console.log(`📋 共 ${searches.length} 个搜索任务\n`);

    for (let i = 0; i < searches.length; i++) {
      const search = searches[i];
      console.log(`[${i+1}/${searches.length}] 🔍 ${search.location} - ${search.brand} ${search.model}`);
      
      try {
        await this.scrapeSearch(page, search);
      } catch (err) {
        console.error(`   ❌ 失败: ${err.message}`);
      }
      
      await page.waitForTimeout(3000);
    }
  }

  async scrapeSearch(page, config) {
    const url = `https://www.facebook.com/marketplace/${config.location}/search/?query=${config.brand}%20${config.model}&minPrice=${config.minPrice}&maxPrice=${config.maxPrice}`;
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    
    // 滚动加载
    await this.scrollPage(page);
    
    // 提取列表
    const listings = await this.extractListings(page);
    console.log(`   📋 找到 ${listings.length} 个列表`);
    
    if (listings.length === 0) {
      console.log(`   ℹ️ 无结果\n`);
      return;
    }
    
    // 处理每个列表
    let withMileage = 0;
    let withoutMileage = 0;
    let inquirySent = 0;
    
    for (const listing of listings.slice(0, 8)) {
      try {
        console.log(`      🔍 检查: ${listing.url.substring(-20)}`);
        
        const details = await this.scrapeListingDetails(page, listing.url);
        
        if (!details || !details.price) {
          console.log(`         ❌ 无法获取详情`);
          continue;
        }
        
        // 检查是否有里程
        if (details.mileage && details.mileage > 1000) {
          // 有里程，正常保存
          console.log(`         ✅ 有里程: ${details.mileage.toLocaleString()}km`);
          this.results.push({
            ...details,
            searchLocation: config.location,
            hasMileage: true
          });
          withMileage++;
        } else {
          // 无里程，发送询问
          console.log(`         ⚠️ 无里程信息`);
          withoutMileage++;
          
          // 询问卖家
          const inquirySent = await this.sendInquiry(page, details);
          
          if (inquirySent) {
            console.log(`         📧 已发送询问`);
            inquirySent++;
            
            // 添加到待回复列表
            this.pendingInquiries.push({
              ...details,
              inquiryTime: new Date().toISOString(),
              inquirySent: true
            });
          }
        }
      } catch (err) {
        console.log(`         ❌ 错误: ${err.message?.substring(0, 40)}`);
      }
      
      await page.waitForTimeout(1500);
    }
    
    console.log(`   ✅ 结果: ${withMileage}辆有里程, ${withoutMileage}辆无里程, ${inquirySent}条询问已发送\n`);
  }

  async sendInquiry(page, vehicle) {
    try {
      // 打开车辆页面
      await page.goto(vehicle.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // 找到并点击"发消息"按钮
      const messageButton = await page.$('button:has-text("发消息"), button:has-text("Message")');
      if (!messageButton) {
        console.log(`         ⚠️ 未找到发消息按钮`);
        return false;
      }
      
      await messageButton.click();
      await page.waitForTimeout(2000);
      
      // 找到消息输入框
      const messageBox = await page.$('textarea[placeholder*="消息"], textarea[placeholder*="message"], div[contenteditable="true"]');
      if (!messageBox) {
        console.log(`         ⚠️ 未找到消息输入框`);
        return false;
      }
      
      // 输入询问消息
      const inquiryMessage = `Hi, I'm interested in your ${vehicle.title}. Could you please tell me the current mileage/odometer reading? Thanks!`;
      await messageBox.fill(inquiryMessage);
      await page.waitForTimeout(1000);
      
      // 点击发送
      const sendButton = await page.$('button:has-text("发送"), button:has-text("Send")');
      if (sendButton) {
        await sendButton.click();
        await page.waitForTimeout(2000);
        console.log(`         ✅ 消息已发送`);
        return true;
      }
      
      return false;
    } catch (err) {
      console.log(`         ❌ 发送失败: ${err.message}`);
      return false;
    }
  }

  async scrollPage(page) {
    console.log('   📜 滚动加载...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(2000);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  async extractListings(page) {
    return await page.evaluate(() => {
      const items = [];
      const seen = new Set();
      
      const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        let url = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
        url = url.split('?')[0];
        
        if (seen.has(url)) return;
        seen.add(url);
        
        items.push({ url });
      });
      
      return items;
    });
  }

  async scrapeListingDetails(page, url) {
    const detailPage = await page.context().newPage();
    
    try {
      await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await detailPage.waitForTimeout(4000);
      
      const details = await detailPage.evaluate(() => {
        const data = {
          title: '',
          price: 0,
          year: 0,
          mileage: 0,
          location: '',
          description: '',
          url: window.location.href,
          seller: { name: '' }
        };
        
        const pageText = document.body.innerText || '';
        
        // 标题
        const h1 = document.querySelector('h1');
        if (h1) data.title = h1.innerText.trim();
        
        // 价格
        const priceMatch = pageText.match(/NZ\$\s*([\d,]+)/) || 
                          pageText.match(/\$\s*([\d,]+)/);
        if (priceMatch) data.price = parseInt(priceMatch[1].replace(/,/g, ''));
        
        // 年份
        const yearMatch = (data.title + ' ' + pageText).match(/\b(200[2-9]|201[0-9]|202[0-6])\b/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);
        
        // 描述
        const descDivs = document.querySelectorAll('div[dir="auto"]');
        for (const div of descDivs) {
          const text = div.innerText.trim();
          if (text.length > 30 && text.length < 2000) {
            data.description = text;
            break;
          }
        }
        
        // 尝试从描述中提取里程
        const fullText = (data.description || '') + ' ' + pageText;
        const kmPatterns = [
          /ODO\s*(\d{2,3})[KX]+/i,
          /ODO\s*(\d{2,3}),?\d{3}/i,
          /(\d{2,3})[KX]+\s*(?:km|kms)/i,
          /(\d{2,3}),?\d{3}\s*(?:kms?|kilometers?)/i,
          /(\d{2,3})\s*万公里/,
          /([\d,]+)\s*km/i,
          /([\d,]+)\s*公里/i,
          /里程[:\s]+([\d,]+)/i,
        ];
        
        for (const pattern of kmPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const num = match[1].replace(/,/g, '');
            if (match[0].includes('万')) {
              data.mileage = parseInt(num) * 10000;
            } else {
              data.mileage = parseInt(num);
            }
            break;
          }
        }
        
        // 位置
        const locMatch = pageText.match(/([A-Za-z\s]+)中的/);
        if (locMatch) data.location = locMatch[1].trim();
        
        // 卖家
        const sellerLink = document.querySelector('a[href*="/marketplace/profile/"]');
        if (sellerLink) data.seller.name = sellerLink.innerText.trim();
        
        return data;
      });
      
      await detailPage.close();
      return details;
    } catch (err) {
      await detailPage.close();
      throw err;
    }
  }

  saveResults() {
    const today = new Date().toISOString().split('T')[0];
    
    const data = {
      source: 'Facebook Marketplace (Auto-Inquiry)',
      date: today,
      scrapeTime: new Date().toISOString(),
      total: this.results.length,
      pendingInquiries: this.pendingInquiries.length,
      vehicles: this.results
    };

    const filepath = path.join(this.dataDir, `facebook_inquiry_${today}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║                 📊 抓取完成                    ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  有里程车辆: ${this.results.filter(r => r.hasMileage).length.toString().padStart(3)} 辆                    ║`);
    console.log(`║  待回复询问: ${this.pendingInquiries.length.toString().padStart(3)} 个                    ║`);
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`\n💾 数据已保存: ${filepath}`);
  }
}

if (require.main === module) {
  new FacebookAutoInquiryScraper().run().catch(err => {
    console.error('致命错误:', err);
    process.exit(1);
  });
}

module.exports = FacebookAutoInquiryScraper;

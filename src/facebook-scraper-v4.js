/**
 * Car Scout - Facebook Scraper with Database (v4.0)
 * 集成车辆管理和去重系统
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const VehicleDatabase = require('./vehicle-database');

class FacebookScraperWithDB {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.authDir = path.join(__dirname, '..', 'auth');
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.reportsDir = path.join(__dirname, '..', 'reports', 'daily');
    
    // 初始化数据库
    this.db = new VehicleDatabase();
    
    this.errors = [];
    this.browserClosed = false;
    this.businessKeywords = [
      'motors', 'cars', 'auto', 'dealer', 'sales', 
      'ltd', 'limited', 'trading', 'group', 'company',
      'dealership', 'yard', 'motor group', 'car sales',
      'garage', 'automotive'
    ];
    
    [this.dataDir, this.authDir, this.logsDir, this.reportsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚗 Facebook Scraper v4.0 (Database Edition)  ║');
    console.log('║        智能去重 · 状态追踪 · 增量报告          ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    // 显示数据库统计
    const stats = this.db.getStats();
    console.log('📊 数据库统计:');
    console.log(`   总车辆数: ${stats.total}`);
    console.log(`   状态分布: ${JSON.stringify(stats.statuses)}`);
    console.log(`   最后更新: ${stats.lastUpdate || '从未'}\n`);
    
    const authFile = path.join(this.authDir, 'facebook_auth.json');
    let hasValidAuth = false;
    
    if (fs.existsSync(authFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(authFile, 'utf8'));
        const hasCUser = state.cookies.some(c => c.name === 'c_user');
        const hasXs = state.cookies.some(c => c.name === 'xs');
        hasValidAuth = hasCUser && hasXs && state.cookies.length >= 5;
        
        if (!hasValidAuth) {
          console.log('⚠️ 检测到无效登录状态，清理旧文件...\n');
          fs.unlinkSync(authFile);
        }
      } catch (e) {
        hasValidAuth = false;
        try { fs.unlinkSync(authFile); } catch (err) {}
      }
    }
    
    console.log(hasValidAuth ? '✅ 发现有效登录状态' : '⚠️ 需要登录\n');
    
    let browser;
    try {
      browser = await chromium.launch({ 
        headless: false,
        slowMo: 150,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--disable-web-security',
          '--no-sandbox',
          '--window-size=1920,1080'
        ]
      });
      
      browser.on('disconnected', () => {
        console.log('\n⚠️ 浏览器已断开连接');
        this.browserClosed = true;
      });
      
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        storageState: hasValidAuth ? authFile : undefined,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
      });
      
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);

      await this.handleLogin(page, authFile);
      
      if (!this.browserClosed) {
        await this.executeSearches(page);
      }
    } catch (err) {
      console.error('\n❌ 执行失败:', err.message);
      this.errors.push({ type: 'execution', message: err.message });
    } finally {
      if (browser && !this.browserClosed) {
        try { await browser.close(); } catch (e) {}
      }
    }

    return this.generateReport();
  }

  async handleLogin(page, authFile) {
    console.log('🔐 检查登录状态...\n');
    
    try {
      await page.goto('https://www.facebook.com/marketplace/', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      await page.waitForTimeout(3000);
      
      if (this.browserClosed) return;
      
      const needsLogin = await page.evaluate(() => {
        return !!document.querySelector('input[name="email"], input#email');
      });
      
      if (needsLogin) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  需要手动登录 Facebook');
        console.log('   请在浏览器窗口中完成登录');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        await this.waitForLogin(page);
        
        if (this.browserClosed) return;
        
        console.log('✅ 登录成功！保存登录状态...\n');
        await page.context().storageState({ path: authFile });
        await page.waitForTimeout(2000);
      } else {
        console.log('✅ 已登录\n');
      }
    } catch (err) {
      if (!this.browserClosed) throw err;
    }
  }

  async waitForLogin(page) {
    const startTime = Date.now();
    while (Date.now() - startTime < 300000 && !this.browserClosed) {
      const isLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('[href="/marketplace/"]') && 
               !document.querySelector('input[name="email"]');
      });
      if (isLoggedIn) return true;
      await page.waitForTimeout(2000);
    }
    if (!this.browserClosed) throw new Error('登录超时');
  }

  getSearchConfigs() {
    return [
      { location: 'auckland', brand: 'toyota', model: 'corolla', minPrice: 2000, maxPrice: 5000 },
      { location: 'auckland', brand: 'toyota', model: 'vitz', minPrice: 2000, maxPrice: 5000 },
      { location: 'waikato', brand: 'toyota', model: 'corolla', minPrice: 2000, maxPrice: 5000 },
    ];
  }

  async executeSearches(page) {
    const searches = this.getSearchConfigs();
    console.log(`📋 共 ${searches.length} 个搜索任务\n`);

    for (let i = 0; i < searches.length && !this.browserClosed; i++) {
      const search = searches[i];
      console.log(`[${i+1}/${searches.length}] 🔍 ${search.location} - ${search.brand} ${search.model}`);
      
      try {
        await this.scrapeSearch(page, search);
      } catch (err) {
        if (!this.browserClosed) {
          console.error(`   ❌ 失败: ${err.message.substring(0, 60)}`);
        }
      }
      
      if (!this.browserClosed) {
        await page.waitForTimeout(3000);
      }
    }
    
    // 标记过期车辆
    console.log('\n🧹 清理过期车辆...');
    this.db.markExpiredVehicles();
  }

  async scrapeSearch(page, config) {
    if (this.browserClosed) return;
    
    const url = `https://www.facebook.com/marketplace/${config.location}/search/?query=${config.brand}%20${config.model}&minPrice=${config.minPrice}&maxPrice=${config.maxPrice}`;
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4000);
      
      if (this.browserClosed) return;
      
      // 滚动加载
      await this.scrollPage(page);
      
      const listings = await this.extractListings(page);
      console.log(`   📋 找到 ${listings.length} 个列表`);
      
      if (listings.length === 0) return;
      
      let processed = 0;
      let newCount = 0;
      let updatedCount = 0;
      
      for (const listing of listings.slice(0, 8)) {
        if (this.browserClosed) break;
        
        try {
          const details = await this.scrapeListingDetails(page, listing.url);
          
          if (!details || !this.isValidData(details)) continue;
          
          // 里程过滤
          if (details.mileage > 160000) {
            console.log(`      ⚠️ 里程超标: ${details.mileage.toLocaleString()}km`);
            continue;
          }
          
          // 检查是否个人卖家
          if (!this.isPrivateSeller(details.seller).isPrivate) continue;
          
          // 添加到数据库
          const result = this.db.addOrUpdateVehicle({
            ...details,
            searchLocation: config.location,
            searchBrand: config.brand,
            searchModel: config.model
          });
          
          if (result.action === 'new') newCount++;
          if (result.action === 'updated') updatedCount++;
          processed++;
          
        } catch (err) {}
        
        await page.waitForTimeout(1500);
      }
      
      console.log(`   📊 处理: ${processed} | 新增: ${newCount} | 更新: ${updatedCount}\n`);
    } catch (err) {
      if (!this.browserClosed) throw err;
    }
  }

  async scrollPage(page) {
    if (this.browserClosed) return;
    console.log('   📜 滚动加载...');
    for (let i = 0; i < 2; i++) {
      if (this.browserClosed) return;
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
  }

  async extractListings(page) {
    if (this.browserClosed) return [];
    
    return await page.evaluate(() => {
      const items = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/marketplace/item/"]').forEach(link => {
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
    let detailPage;
    try {
      detailPage = await page.context().newPage();
      
      await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await detailPage.waitForTimeout(2500);
      
      const details = await detailPage.evaluate(() => {
        const data = { title: '', price: 0, year: 0, mileage: 0, location: '', description: '', url: window.location.href, seller: { name: '' } };
        const pageText = document.body.innerText || '';
        
        // 标题
        const h1 = document.querySelector('h1');
        if (h1) data.title = h1.innerText.trim();
        
        // 价格
        const priceMatch = pageText.match(/\$\s*([\d,]+)/);
        if (priceMatch) data.price = parseInt(priceMatch[1].replace(/,/g, ''));
        
        // 描述
        const divs = document.querySelectorAll('div[dir="auto"]');
        for (const div of divs) {
          const text = div.innerText.trim();
          if (text.length > 50 && text.length < 3000) {
            data.description = text;
            break;
          }
        }
        
        // 年份
        const yearMatch = (data.title + ' ' + pageText).match(/\b(200[2-9]|201[0-9]|202[0-6])\b/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);
        
        // 里程 - 修复版
        const fullText = (data.description || '') + ' ' + pageText;
        
        // 尝试匹配完整数字格式 (如 281,000)
        const fullNumberMatch = fullText.match(/(\d{2,3})[,\s]*(\d{3})\s*(?:km|kms)/i);
        if (fullNumberMatch) {
          data.mileage = parseInt(fullNumberMatch[1] + fullNumberMatch[2]);
        } else {
          // 尝试匹配 ODO 格式 (ODO 281XXX)
          const odoMatch = fullText.match(/ODO\s*(\d{2,3})[KX]+/i);
          if (odoMatch) {
            data.mileage = parseInt(odoMatch[1]) * 1000;
          } else {
            // 尝试匹配简单格式
            const simpleMatch = fullText.match(/(\d{5,6})\s*(?:km|kms)/i);
            if (simpleMatch) data.mileage = parseInt(simpleMatch[1]);
          }
        }
        
        // 卖家
        const sellerLink = document.querySelector('a[href*="/marketplace/profile/"]');
        if (sellerLink) data.seller.name = sellerLink.innerText.trim();
        
        return data;
      });
      
      await detailPage.close();
      return details;
    } catch (err) {
      if (detailPage) try { await detailPage.close(); } catch (e) {}
      return null;
    }
  }

  isValidData(v) {
    if (!v) return false;
    if (!v.price || v.price < 1000 || v.price > 20000) return false;
    if (v.mileage > 500000) return false; // 异常高
    if (!v.title || v.title.length < 3) return false;
    return true;
  }

  isPrivateSeller(seller) {
    if (!seller || !seller.name) return { isPrivate: true };
    const name = seller.name.toLowerCase();
    for (const kw of this.businessKeywords) {
      if (name.includes(kw)) return { isPrivate: false };
    }
    return { isPrivate: true };
  }

  generateReport() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║              📊 生成每日报告                    ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const report = this.db.generateDailyReport();
    
    // 生成Markdown报告
    const md = this.generateMarkdownReport(report);
    const today = new Date().toISOString().split('T')[0];
    const reportFile = path.join(this.reportsDir, `report_${today}.md`);
    fs.writeFileSync(reportFile, md);
    
    console.log(`\n💾 报告已保存: ${reportFile}`);
    console.log(`\n📈 今日统计:`);
    console.log(`   🆕 新增: ${report.summary.new} 辆`);
    console.log(`   📝 更新: ${report.summary.updated} 辆`);
    console.log(`   ✅ 活跃: ${report.summary.active} 辆`);
    
    return report;
  }

  generateMarkdownReport(report) {
    const today = new Date().toISOString().split('T')[0];
    let md = `# 🚗 Car Scout 每日报告 | ${today}\n\n`;
    
    md += `## 📊 今日概览\n\n`;
    md += `- 🆕 **新增车辆**: ${report.summary.new} 辆\n`;
    md += `- 📝 **价格更新**: ${report.summary.updated} 辆\n`;
    md += `- ✅ **活跃车辆**: ${report.summary.active} 辆\n`;
    md += `- 📦 **数据库总计**: ${report.summary.total} 辆\n\n`;
    
    if (report.newVehicles.length > 0) {
      md += `## 🆕 今日新增车辆\n\n`;
      report.newVehicles.forEach((v, i) => {
        md += `### ${i + 1}. ${v.year} ${v.title}\n\n`;
        md += `- 💰 **价格**: $${v.price.toLocaleString()}\n`;
        md += `- 🚗 **里程**: ${v.mileage.toLocaleString()} km\n`;
        md += `- 📍 **位置**: ${v.location || v.searchLocation}\n`;
        md += `- 🔗 [查看链接](${v.url})\n`;
        md += `- ⭐ **优先级**: ${v.priority}/9\n`;
        md += `- 📝 **状态**: 新发现\n\n`;
        md += `---\n\n`;
      });
    }
    
    if (report.updatedVehicles.length > 0) {
      md += `## 📝 价格变动提醒\n\n`;
      report.updatedVehicles.forEach(v => {
        const lastChange = v.changes[v.changes.length - 1];
        md += `- **${v.title}**: $${lastChange.old} → $${lastChange.new}\n`;
      });
      md += `\n`;
    }
    
    if (report.topPicks.length > 0) {
      md += `## 🏆 重点推荐 (优先级≥5)\n\n`;
      report.topPicks.slice(0, 5).forEach((v, i) => {
        md += `${i + 1}. **${v.year} ${v.title.substring(0, 40)}** | $${v.price.toLocaleString()} | ⭐${v.priority}\n`;
      });
      md += `\n`;
    }
    
    md += `---\n\n`;
    md += `*报告生成时间: ${new Date().toLocaleString()}*\n`;
    
    return md;
  }
}

if (require.main === module) {
  new FacebookScraperWithDB().run().catch(err => {
    console.error('致命错误:', err);
    process.exit(1);
  });
}

module.exports = FacebookScraperWithDB;

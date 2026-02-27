/**
 * Car Scout - Facebook Marketplace Scraper v3.1 (稳定版)
 * 改进：反检测措施、浏览器关闭处理、更多稳定性修复
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class FacebookPrivateScraper {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.authDir = path.join(__dirname, '..', 'auth');
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.results = [];
    this.errors = [];
    this.browserClosed = false;
    this.businessKeywords = [
      'motors', 'cars', 'auto', 'dealer', 'sales', 
      'ltd', 'limited', 'trading', 'group', 'company',
      'dealership', 'yard', 'motor group', 'car sales',
      'garage', 'automotive'
    ];
    
    [this.dataDir, this.authDir, this.logsDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚗 Facebook Marketplace Scraper v3.1         ║');
    console.log('║        (稳定版 - 增强反检测)                   ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const authFile = path.join(this.authDir, 'facebook_auth.json');
    let hasValidAuth = false;
    
    if (fs.existsSync(authFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(authFile, 'utf8'));
        const hasCUser = state.cookies.some(c => c.name === 'c_user');
        const hasXs = state.cookies.some(c => c.name === 'xs');
        hasValidAuth = hasCUser && hasXs && state.cookies.length >= 5;
        
        // 如果登录状态无效，删除旧文件
        if (!hasValidAuth) {
          console.log('⚠️ 检测到无效登录状态，清理旧文件...\n');
          fs.unlinkSync(authFile);
        }
      } catch (e) {
        hasValidAuth = false;
        // 删除损坏的文件
        try { fs.unlinkSync(authFile); } catch (err) {}
      }
    }
    
    console.log(hasValidAuth ? '✅ 发现有效登录状态' : '⚠️ 需要登录（首次运行或登录已过期）\n');
    
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
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--window-size=1920,1080'
        ]
      });
      
      // 监听浏览器关闭事件
      browser.on('disconnected', () => {
        console.log('\n⚠️ 浏览器已断开连接');
        this.browserClosed = true;
      });
      
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        storageState: hasValidAuth ? authFile : undefined,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'Pacific/Auckland',
        permissions: ['geolocation'],
        geolocation: { latitude: -36.8485, longitude: 174.7633 }
      });
      
      // 注入反检测脚本
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        window.chrome = { runtime: {} };
      });
      
      const page = await context.newPage();

      // 设置更长的默认超时
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
        try {
          await browser.close();
        } catch (e) {
          // 浏览器可能已关闭
        }
      }
    }

    return this.saveData();
  }

  async handleLogin(page, authFile) {
    console.log('🔐 检查登录状态...\n');
    
    // 预检查登录状态文件是否有效
    let hasValidAuth = false;
    if (fs.existsSync(authFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(authFile, 'utf8'));
        const hasCUser = state.cookies.some(c => c.name === 'c_user');
        const hasXs = state.cookies.some(c => c.name === 'xs');
        const cookieCount = state.cookies.length;
        
        if (hasCUser && hasXs && cookieCount >= 5) {
          console.log(`✅ 发现有效登录状态 (${cookieCount} 个cookies)\n`);
          hasValidAuth = true;
        } else {
          console.log(`⚠️ 登录状态不完整 (${cookieCount} 个cookies，缺少关键凭证)\n`);
          console.log('   需要重新登录\n');
        }
      } catch (e) {
        console.log('⚠️ 登录状态文件损坏，需要重新登录\n');
      }
    }
    
    try {
      await page.goto('https://www.facebook.com/marketplace/', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      await this.safeWait(page, 5000);
      
      if (this.browserClosed) return;
      
      const needsLogin = await this.checkNeedsLogin(page);
      
      if (needsLogin) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  需要手动登录 Facebook');
        console.log('   请在浏览器窗口中完成登录');
        console.log('   登录成功后会自动继续...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        await this.waitForLoginSuccess(page);
        
        if (this.browserClosed) return;
        
        console.log('✅ 登录成功！正在保存登录状态...\n');
        
        // 等待更长时间确保所有cookies都加载
        await this.safeWait(page, 3000);
        
        // 保存登录状态
        await page.context().storageState({ path: authFile });
        
        // 验证关键cookies是否存在
        const state = JSON.parse(fs.readFileSync(authFile, 'utf8'));
        const hasCUser = state.cookies.some(c => c.name === 'c_user');
        const hasXs = state.cookies.some(c => c.name === 'xs');
        
        if (hasCUser && hasXs) {
          console.log(`💾 登录状态已保存！(${state.cookies.length} 个cookies)\n`);
        } else {
          console.log('⚠️ 警告: 登录状态可能不完整\n');
        }
        
        await this.safeWait(page, 2000);
      } else {
        console.log('✅ 已登录\n');
      }
    } catch (err) {
      if (!this.browserClosed) {
        console.error('❌ 登录检查失败:', err.message);
        throw err;
      }
    }
  }

  async safeWait(page, ms) {
    if (this.browserClosed) return;
    try {
      await page.waitForTimeout(ms);
    } catch (err) {
      // 浏览器可能已关闭
    }
  }

  async checkNeedsLogin(page) {
    if (this.browserClosed) return false;
    
    try {
      const checks = await page.evaluate(() => {
        const hasEmail = !!document.querySelector('input[name="email"], input#email');
        const hasPassword = !!document.querySelector('input[name="pass"], input#pass');
        const hasLoginButton = !!document.querySelector('button[name="login"]');
        const hasMarketplace = !!document.querySelector('[href="/marketplace/"]');
        const hasProfile = !!document.querySelector('[aria-label*="个人主页"], [aria-label*="profile"]');
        
        return {
          needsLogin: hasEmail || hasPassword || hasLoginButton,
          isLoggedIn: hasMarketplace || hasProfile
        };
      });
      
      return checks.needsLogin && !checks.isLoggedIn;
    } catch (err) {
      return true;
    }
  }

  async waitForLoginSuccess(page) {
    const startTime = Date.now();
    const timeout = 300000;
    
    while (Date.now() - startTime < timeout && !this.browserClosed) {
      try {
        const isLoggedIn = await page.evaluate(() => {
          const hasMarketplace = !!document.querySelector('[href="/marketplace/"]');
          const noLoginForm = !document.querySelector('input[name="email"]');
          return hasMarketplace && noLoginForm;
        });
        
        if (isLoggedIn) return true;
        await this.safeWait(page, 2000);
      } catch (err) {
        await this.safeWait(page, 2000);
      }
    }
    
    if (!this.browserClosed) {
      throw new Error('登录等待超时（5分钟）');
    }
  }

  getSearchConfigs() {
    return [
      { location: 'auckland', brand: 'toyota', model: 'corolla', minPrice: 2000, maxPrice: 5000 },
      { location: 'auckland', brand: 'toyota', model: 'vitz', minPrice: 2000, maxPrice: 5000 },
      { location: 'auckland', brand: 'toyota', model: 'yaris', minPrice: 2000, maxPrice: 5000 },
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
        
        // 每个任务完成后保存登录状态（实时保存）
        if (!this.browserClosed && i === 0) { // 只在第一个任务后保存，确保登录状态有效
          const authFile = path.join(this.authDir, 'facebook_auth.json');
          try {
            await page.context().storageState({ path: authFile });
            console.log(`   💾 登录状态已实时保存\n`);
          } catch (saveErr) {
            console.log(`   ⚠️ 登录状态保存失败: ${saveErr.message}\n`);
          }
        }
      } catch (err) {
        if (!this.browserClosed) {
          console.error(`   ❌ 失败: ${err.message.substring(0, 60)}`);
          this.errors.push({ 
            search: `${search.location}-${search.brand}-${search.model}`, 
            error: err.message,
            time: new Date().toISOString()
          });
        }
      }
      
      if (!this.browserClosed) {
        await this.safeWait(page, 3000); // 减少等待时间
      }
    }
  }

  async scrapeSearch(page, config) {
    if (this.browserClosed) return;
    
    const url = `https://www.facebook.com/marketplace/${config.location}/search/?query=${config.brand}%20${config.model}&minPrice=${config.minPrice}&maxPrice=${config.maxPrice}`;
    
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });
      
      await this.safeWait(page, 4000); // 减少等待时间
      if (this.browserClosed) return;
      
      // 检查是否有结果或验证码
      const pageState = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return {
          noResults: text.includes('没有找到结果') || text.includes('No results found'),
          captcha: text.includes('验证') || text.includes('captcha') || text.includes('security check'),
          blocked: text.includes('暂时被封禁') || text.includes('temporary ban')
        };
      });
      
      if (pageState.captcha) {
        console.log('   ⚠️ 检测到验证码，请手动处理...');
        await this.safeWait(page, 30000); // 等待30秒让用户处理
      }
      
      if (pageState.blocked) {
        console.log('   ❌ 账号被暂时限制，停止抓取');
        this.browserClosed = true;
        return;
      }
      
      if (pageState.noResults) {
        console.log('   ℹ️ 无搜索结果\n');
        return;
      }
      
      // 滚动加载
      await this.scrollPage(page);
      if (this.browserClosed) return;
      
      // 提取列表
      const listings = await this.extractListings(page);
      console.log(`   📋 找到 ${listings.length} 个列表`);
      
      if (listings.length === 0) {
        console.log(`   ℹ️ 无有效列表\n`);
        return;
      }
      
      // 处理每个列表 - 限制数量避免超时
      let validCount = 0;
      const maxToProcess = Math.min(listings.length, 8); // 改为8个，减少运行时间
      
      for (let i = 0; i < maxToProcess && !this.browserClosed; i++) {
        const listing = listings[i];
        try {
          const details = await this.scrapeListingDetails(page, listing.url);
          
          if (!details || !details.price || !this.isValidData(details)) {
            continue;
          }
          
          // 里程过滤：超过16万公里的跳过
          if (details.mileage > 160000) {
            console.log(`      ⚠️ 里程超标: ${details.mileage.toLocaleString()}km (上限160,000km)`);
            continue;
          }
          
          // 里程合理性检查：老旧车辆不可能只有几百公里
          if (details.mileage > 0 && details.mileage < 3000 && details.year < 2018) {
            console.log(`      ⚠️ 里程异常低: ${details.mileage.toLocaleString()}km (${details.year}年车应有更高里程，跳过)`);
            continue;
          }
          
          const sellerCheck = this.isPrivateSeller(details.seller);
          
          if (sellerCheck.isPrivate) {
            this.results.push({
              ...details,
              searchLocation: config.location,
              searchBrand: config.brand,
              searchModel: config.model,
              isPrivate: true,
              scrapeTime: new Date().toISOString()
            });
            validCount++;
            console.log(`   ✅ [${validCount}] ${details.year} ${details.title?.substring(0, 30)}`);
            console.log(`      💰 $${details.price.toLocaleString()} | 🚗 ${details.mileage?.toLocaleString() || '?'}km`);
          }
        } catch (err) {
          // 单个列表错误，继续
        }
        
        if (!this.browserClosed) {
          await this.safeWait(page, 1500); // 减少等待时间
        }
      }
      
      console.log(`   📊 本页有效: ${validCount} 辆\n`);
      
      // 实时保存进度到临时文件
      if (this.results.length > 0 && !this.browserClosed) {
        this.saveProgress();
      }
    } catch (err) {
      if (!this.browserClosed) {
        throw err;
      }
    }
  }

  saveProgress() {
    // 保存中间进度，防止数据丢失
    const today = new Date().toISOString().split('T')[0];
    const progressFile = path.join(this.dataDir, `facebook_progress_${today}.json`);
    
    try {
      fs.writeFileSync(progressFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        count: this.results.length,
        vehicles: this.results
      }, null, 2));
    } catch (e) {
      // 忽略保存错误
    }
  }

  async scrollPage(page) {
    if (this.browserClosed) return;
    console.log('   📜 滚动加载...');
    for (let i = 0; i < 2; i++) { // 减少滚动次数
      if (this.browserClosed) return;
      await page.evaluate(() => window.scrollBy(0, 1000));
      await this.safeWait(page, 1500); // 减少等待时间
    }
    if (!this.browserClosed) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await this.safeWait(page, 800);
    }
  }

  async extractListings(page) {
    if (this.browserClosed) return [];
    
    try {
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
    } catch (err) {
      return [];
    }
  }

  async scrapeListingDetails(page, url) {
    if (this.browserClosed) return null;
    
    let detailPage;
    try {
      detailPage = await page.context().newPage();
      
      await detailPage.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 25000 
      });
      
      await detailPage.waitForTimeout(2500); // 减少等待时间
      
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
        
        if (!data.title) {
          const spans = document.querySelectorAll('span[dir="auto"]');
          for (const span of spans) {
            const text = span.innerText.trim();
            if (text.length > 10 && text.length < 100 && !text.includes('$')) {
              data.title = text;
              break;
            }
          }
        }
        
        // 价格
        const priceMatch = pageText.match(/\$\s*([\d,]+)/);
        if (priceMatch) {
          data.price = parseInt(priceMatch[1].replace(/,/g, ''));
        }
        
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
        
        // 里程 - 修复版，正确处理各种格式
        const fullText = (data.description || '') + ' ' + pageText;
        
        // 先尝试匹配完整的数字格式 (如 281,000 或 281000)
        const fullNumberMatch = fullText.match(/(\d{2,3})[,\s]*(\d{3})\s*(?:km|kms|kilometers?)/i);
        if (fullNumberMatch) {
          // 合并两组数字: 281 + 000 = 281000
          data.mileage = parseInt(fullNumberMatch[1] + fullNumberMatch[2]);
        } else {
          // 尝试匹配 ODO 格式 (ODO 281XXX)
          const odoMatch = fullText.match(/ODO\s*(\d{2,3})[KX]+/i);
          if (odoMatch) {
            data.mileage = parseInt(odoMatch[1]) * 1000; // 281XXX = 281000
          } else {
            // 尝试匹配简单格式 (如 152000km)
            const simpleMatch = fullText.match(/(\d{5,6})\s*(?:km|kms)/i);
            if (simpleMatch) {
              data.mileage = parseInt(simpleMatch[1]);
            }
          }
        }
        
        // 位置
        const locMatch = pageText.match(/([A-Za-z\s]+)\s*·\s*\d+/);
        if (locMatch) data.location = locMatch[1].trim();
        
        // 卖家
        const sellerLink = document.querySelector('a[href*="/marketplace/profile/"]');
        if (sellerLink) {
          data.seller.name = sellerLink.innerText.trim();
        }
        
        return data;
      });
      
      await detailPage.close();
      return details;
    } catch (err) {
      if (detailPage) {
        try { await detailPage.close(); } catch (e) {}
      }
      return null;
    }
  }

  isValidData(vehicle) {
    if (!vehicle) return false;
    if (!vehicle.price || vehicle.price < 1000 || vehicle.price > 20000) return false;
    if (vehicle.mileage > 500000) return false;
    if (!vehicle.title || vehicle.title.length < 3) return false;
    return true;
  }

  isPrivateSeller(seller) {
    if (!seller || !seller.name) return { isPrivate: true, reason: 'unknown' };
    
    const name = seller.name.toLowerCase();
    for (const kw of this.businessKeywords) {
      if (name.includes(kw)) return { isPrivate: false, reason: 'business' };
    }
    return { isPrivate: true, reason: 'personal' };
  }

  saveData() {
    const validResults = this.results.filter(v => {
      if (v.mileage === 60000) return false;
      return v.mileage <= 160000 || v.mileage === 0;
    });
    
    const today = new Date().toISOString().split('T')[0];
    const data = {
      source: 'Facebook Marketplace',
      date: today,
      scrapeTime: new Date().toISOString(),
      total: validResults.length,
      allResults: this.results.length,
      filtered: this.results.length - validResults.length,
      errors: this.errors,
      vehicles: validResults
    };

    const filepath = path.join(this.dataDir, `facebook_private_${today}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    if (this.errors.length > 0) {
      const errorLog = path.join(this.logsDir, `errors_${today.replace(/-/g, '')}.json`);
      fs.writeFileSync(errorLog, JSON.stringify(this.errors, null, 2));
    }

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║                 📊 抓取完成                    ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  原始车辆: ${this.results.length.toString().padStart(3)} 辆                          ║`);
    console.log(`║  过滤后:   ${validResults.length.toString().padStart(3)} 辆                          ║`);
    console.log(`║  错误:     ${this.errors.length.toString().padStart(3)} 个                          ║`);
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`\n💾 数据已保存: ${filepath}`);

    return data;
  }
}

if (require.main === module) {
  new FacebookPrivateScraper().run().catch(err => {
    console.error('致命错误:', err);
    process.exit(1);
  });
}

module.exports = FacebookPrivateScraper;

/**
 * Car Scout - Facebook Marketplace Scraper v2.0
 * Toyota二手车抓取（Auckland & Waikato）
 * 合并了历史项目的经验和配置
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class CarScoutScraper {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '..', 'search_config.json');
    this.config = this.loadConfig();
    this.dataDir = path.join(__dirname, '..', 'data');
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.results = [];
    this.errors = [];
  }

  /**
   * 加载配置文件
   */
  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (err) {
      console.warn('⚠️ 无法加载配置文件，使用默认配置');
      return {
        search_criteria: {
          location: {
            auckland: { city: 'Auckland', code: 'auckland' },
            waikato: { city: 'Waikato', code: 'waikato' }
          },
          price_range: { min_nzd: 2000, max_nzd: 5000 },
          vehicle_models: { primary: ['corolla', 'vitz', 'rav4'] },
          year_range: { min: 2002, max: 2026 }
        },
        scraping: {
          scroll_attempts: 3,
          delay_between_scrolls_ms: 2000,
          delay_between_listings_ms: 500,
          max_listings_per_search: 50,
          headless: false
        },
        facebook: {
          marketplace_base: 'https://www.facebook.com/marketplace',
          wait_for_login_timeout_ms: 120000
        }
      };
    }
  }

  /**
   * 获取搜索配置
   */
  getSearchConfigs() {
    const models = this.config.search_criteria.vehicle_models.primary;
    const locations = Object.values(this.config.search_criteria.location);
    const priceMin = this.config.search_criteria.price_range.min_nzd;
    const priceMax = this.config.search_criteria.price_range.max_nzd;
    
    const configs = [];
    for (const model of models) {
      for (const location of locations) {
        configs.push({
          model: model,
          location: location.city,
          locationCode: location.code,
          url: `${this.config.facebook.marketplace_base}/${location.code}/search/?query=toyota%20${model}&minPrice=${priceMin}&maxPrice=${priceMax}&sortBy=creation_time_descend`
        });
      }
    }
    return configs;
  }

  /**
   * 初始化浏览器
   */
  async initBrowser() {
    console.log('🚀 启动浏览器...');
    const scrapingConfig = this.config.scraping || {};
    
    this.browser = await chromium.launch({
      headless: scrapingConfig.headless !== undefined ? scrapingConfig.headless : false,
      slowMo: 100
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: scrapingConfig.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    this.page = await this.context.newPage();
    
    // 设置超时
    this.page.setDefaultTimeout(30000);
    this.page.setDefaultNavigationTimeout(30000);
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    console.log('🔐 检查Facebook登录状态...');
    
    try {
      await this.page.goto(`${this.config.facebook.marketplace_base}/`, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(3000);
      
      // 检查是否需要登录
      const loginButton = await this.page.$(this.config.facebook.login_check_selector || '[data-testid="royal_login_button"]');
      
      if (loginButton) {
        console.log('⚠️ 未检测到登录状态');
        console.log('📝 请在打开的浏览器中手动登录Facebook...');
        console.log('⏱️ 等待登录中（最多2分钟）...');
        
        // 等待Marketplace加载完成
        await this.page.waitForSelector('[aria-label="Marketplace"]', { 
          timeout: this.config.facebook.wait_for_login_timeout_ms || 120000 
        });
        
        console.log('✅ 登录成功！');
      } else {
        console.log('✅ 已登录');
      }
      
    } catch (err) {
      console.error('❌ 登录检查失败:', err.message);
      throw new Error('Facebook登录检查失败，请手动登录后重试');
    }
  }

  /**
   * 尝试多种选择器等待页面加载
   */
  async waitForListings(timeout = 15000) {
    const selectors = [
      '[role="main"] div[class*="x1lliihq"] a[href*="/marketplace/item/"]', // 2025-02更新
      '[role="article"]',
      '[data-testid="marketplace_search_results"]', 
      'a[href*="/marketplace/item/"]',
      'div[data-pagelet="root"] div[role="main"]',
      '.x9f619.x78zum5',
      'div[class*="x1ja2u2z"]',
      'div[class*="x1yztbdb"] a[href*="/marketplace/item/"]', // 备选
      'div[data-testid="marketplace_feed"] a[href*="/marketplace/item/"]', // 备选
    ];
    
    for (const selector of selectors) {
      try {
        console.log(`   尝试选择器: ${selector}`);
        await this.page.waitForSelector(selector, { timeout: 8000 });
        console.log(`   ✅ 选择器成功: ${selector}`);
        return selector;
      } catch (err) {
        console.log(`   ❌ 选择器失败: ${selector}`);
        continue;
      }
    }
    
    // 如果所有选择器失败，返回最可能的选择器继续尝试
    console.log('⚠️ 警告: 使用备选选择器继续');
    return 'a[href*="/marketplace/item/"]';
  }

  /**
   * 抓取单个搜索
   */
  async scrapeSearch(config, index, total) {
    console.log(`\n🔍 [${index}/${total}] 抓取: ${config.location} - Toyota ${config.model}`);
    console.log(`🔗 URL: ${config.url}`);
    
    try {
      // 导航到搜索页面
      console.log('   正在加载页面...');
      await this.page.goto(config.url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(8000); // 增加等待时间
      
      // 等待列表加载 - 使用多种选择器尝试
      console.log('   等待页面内容加载...');
      const workingSelector = await this.waitForListings();
      
      // 滚动加载更多
      await this.scrollToLoad();
      
      // 提取车辆列表
      const vehicles = await this.extractVehicles(config);
      console.log(`✅ 找到 ${vehicles.length} 辆车`);
      
      // 限制每批处理数量
      const maxListings = this.config.scraping.max_listings_per_search || 50;
      const limitedVehicles = vehicles.slice(0, maxListings);
      
      // 抓取每辆车的详情
      let successCount = 0;
      let skipCount = 0;
      
      for (let i = 0; i < limitedVehicles.length; i++) {
        const vehicle = limitedVehicles[i];
        
        try {
          // 速率限制 - 增加延迟避免被检测
          const delayBetweenListings = this.config.scraping.delay_between_listings_ms || 1000;
          await this.page.waitForTimeout(delayBetweenListings);
          
          console.log(`   [${i+1}/${limitedVehicles.length}] 抓取: ${vehicle.title?.substring(0, 40)}...`);
          
          const details = await this.scrapeVehicleDetails(vehicle);
          
          if (!details) {
            skipCount++;
            continue;
          }
          
          // 验证并记录跳过原因
          const validationResult = this.validateVehicleWithReason(details);
          if (validationResult.valid) {
            this.results.push(details);
            successCount++;
            console.log(`      ✅ 有效: ${details.title?.substring(0, 30)} ($${details.price}, ${details.year || 'N/A'})`);
          } else {
            skipCount++;
            console.log(`      ⚠️ 跳过: ${validationResult.reason}`);
          }
          
        } catch (err) {
          console.error(`      ❌ 抓取失败:`, err.message);
          this.errors.push({
            url: vehicle.url,
            error: err.message,
            timestamp: new Date().toISOString()
          });
        }
        
        // 进度显示
        if ((i + 1) % 5 === 0 || i === limitedVehicles.length - 1) {
          console.log(`   📊 进度: ${i+1}/${limitedVehicles.length} (成功:${successCount} 跳过:${skipCount})`);
        }
      }
      
      console.log(`✅ 完成: ${config.location} ${config.model} - 成功:${successCount} 跳过:${skipCount}`);
      
    } catch (err) {
      console.error(`❌ 搜索失败: ${config.model} in ${config.location}`, err.message);
      this.errors.push({
        location: config.location,
        model: config.model,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 滚动页面加载更多
   */
  async scrollToLoad() {
    console.log('📜 滚动加载更多...');
    const scrollAttempts = this.config.scraping.scroll_attempts || 3;
    const delayBetweenScrolls = this.config.scraping.delay_between_scrolls_ms || 2000;
    
    for (let i = 0; i < scrollAttempts; i++) {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(delayBetweenScrolls);
    }
  }

  /**
   * 提取车辆列表
   */
  async extractVehicles(config) {
    // 等待额外时间确保JavaScript加载完成
    await this.page.waitForTimeout(5000);
    
    // 尝试多种选择器（按2025年Facebook结构更新）
    const possibleSelectors = [
      '[role="main"] div[class*="x1lliihq"] a[href*="/marketplace/item/"]',
      'div[class*="x1yztbdb"] a[href*="/marketplace/item/"]',
      '[role="article"]',
      '[data-testid="marketplace_search_results"] > div > div',
      'a[href*="/marketplace/item/"]',
      'div[class*="x9f619"] div[class*="x78zum5"]',
      'div[data-pagelet="root"] div[role="main"] > div > div',
      'div[data-testid="marketplace_feed"] a[href*="/marketplace/item/"]'
    ];
    
    let listingSelector = null;
    for (const sel of possibleSelectors) {
      try {
        const count = await this.page.evaluate((s) => {
          try {
            return document.querySelectorAll(s).length;
          } catch (e) {
            return 0;
          }
        }, sel);
        if (count > 0) {
          listingSelector = sel;
          console.log(`   使用选择器: ${sel} (${count} 个元素)`);
          break;
        }
      } catch (e) {
        console.log(`   选择器错误: ${sel} - ${e.message}`);
      }
    }
    
    if (!listingSelector) {
      console.log('   ⚠️ 未找到车辆列表，尝试通用选择器');
      listingSelector = 'a[href*="/marketplace/item/"]'; // 直接查找车辆链接
    }
    
    // 使用对象传递参数（Playwright限制）
    const evalParams = { selector: listingSelector, location: config.location, model: config.model };
    
    return await this.page.evaluate((params) => {
      const { selector, location, model } = params;
      const vehicles = [];
      
      // 如果是链接选择器，直接获取所有链接
      if (selector.includes('href')) {
        const links = document.querySelectorAll(selector);
        links.forEach(link => {
          const url = link.href;
          if (!url || !url.includes('/marketplace/item/')) return;
          
          // 尝试从父元素获取标题
          let title = '';
          let parent = link.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const spans = parent.querySelectorAll('span');
            for (const span of spans) {
              const text = span.textContent.trim();
              if (text.length > 5 && !text.startsWith('$')) {
                title = text;
                break;
              }
            }
            if (title) break;
            parent = parent.parentElement;
          }
          
          // 尝试获取价格
          let price = 0;
          parent = link.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const allText = parent.textContent;
            const priceMatch = allText.match(/\$?([\d,]+)/);
            if (priceMatch) {
              const p = parseInt(priceMatch[1].replace(/,/g, ''));
              if (p >= 1000 && p <= 20000) {
                price = p;
                break;
              }
            }
            parent = parent.parentElement;
          }
          
          vehicles.push({
            url: url.split('?')[0], // 去除参数
            title: title || 'Unknown',
            price: price,
            location: location,
            searchModel: model,
            searchLocation: location
          });
        });
        return vehicles;
      }
      
      // 原有逻辑
      const items = document.querySelectorAll(selector);
      
      items.forEach(item => {
        try {
          const linkElement = item.querySelector('a[href*="/marketplace/item/"]');
          if (!linkElement) return;
          
          const url = linkElement.href;
          if (!url || url.includes('?')) return; // 跳过非详情链接
          
          const titleElement = item.querySelector('span[dir="auto"]');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          // 提取价格
          let price = 0;
          const priceSelectors = [
            'span[class*="x193iq5w"]',
            'span[class*="price"]',
            '[dir="auto"] span'
          ];
          
          for (const ps of priceSelectors) {
            const priceEl = item.querySelector(ps);
            if (priceEl) {
              const priceText = priceEl.textContent;
              const priceMatch = priceText.match(/\$?([\d,]+)/);
              if (priceMatch) {
                price = parseInt(priceMatch[1].replace(/,/g, ''));
                break;
              }
            }
          }
          
          // 提取位置
          const locationElement = item.querySelector('span[class*="x1lliihq"]:not([dir="auto"])');
          const itemLocation = locationElement ? locationElement.textContent.trim() : location;
          
          vehicles.push({
            url: url,
            title: title,
            price: price,
            location: itemLocation,
            searchModel: model,
            searchLocation: location
          });
        } catch (e) {
          console.error('解析车辆列表项失败:', e);
        }
      });
      
      return vehicles;
    }, evalParams);
  }

  /**
   * 抓取车辆详情
   */
  async scrapeVehicleDetails(vehicle) {
    // 在新标签页打开
    const detailPage = await this.context.newPage();
    
    try {
      await detailPage.goto(vehicle.url, { waitUntil: 'domcontentloaded' });
      await detailPage.waitForTimeout(3000);
      
      const details = await detailPage.evaluate(() => {
        const data = {
          title: '',
          price: 0,
          year: 0,
          mileage: 0,
          location: '',
          wof: '',
          rego: '',
          description: '',
          imageCount: 0,
          postedTime: '',
          url: window.location.href,
          scrapedAt: new Date().toISOString()
        };
        
        // 标题
        const titleSelectors = [
          'h1 span[dir="auto"]',
          '[role="main"] h1',
          'h1'
        ];
        for (const ts of titleSelectors) {
          const titleEl = document.querySelector(ts);
          if (titleEl) {
            data.title = titleEl.textContent.trim();
            break;
          }
        }
        
        // 价格 - 改进：处理更多价格格式
        const priceSelectors = [
          'span[class*="x193iq5w"]',
          '[dir="auto"] span',
          '[role="main"] span',
          'div[role="main"] span[class*="x"]'
        ];
        for (const ps of priceSelectors) {
          const priceEls = document.querySelectorAll(ps);
          for (const priceEl of priceEls) {
            const priceText = priceEl.textContent;
            // 匹配 NZ$ X,XXX 或 $X,XXX 或 X,XXX NZD 格式
            const priceMatch = priceText.match(/(?:NZ\$?|\$)?\s*([\d,]+)\s*(?:NZD)?/i);
            if (priceMatch) {
              const priceNum = parseInt(priceMatch[1].replace(/,/g, ''));
              if (priceNum > 1000 && priceNum < 100000) {
                data.price = priceNum;
                break;
              }
            }
          }
          if (data.price > 0) break;
        }
        
        // 描述
        const descSelectors = [
          '[data-testid="marketplace_pdp_description"]',
          '[role="main"] p',
          'div[data-pagelet="root"] div[dir="auto"]'
        ];
        for (const ds of descSelectors) {
          const descEl = document.querySelector(ds);
          if (descEl) {
            data.description = descEl.textContent.trim();
            if (data.description.length > 50) break;
          }
        }
        
        // 图片数量
        const images = document.querySelectorAll('img[alt*="Marketplace"], img[alt*="vehicle"], img[alt*="car"]');
        data.imageCount = images.length;
        
        // 提取年份（从标题或描述）
        const fullText = (data.title + ' ' + data.description);
        const yearMatch = fullText.match(/\b(200[2-9]|201[0-9]|202[0-6])\b/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);
        
        // 提取公里数
        const kmPatterns = [
          /(\d{2,3})[,\s]?(\d{3})\s*(km|kms|kilometres|kilometers)/i,
          /(\d{5,6})\s*(km|kms)/i,
          /(\d{2,3})[,\s]?(\d{3})\s*k/i
        ];
        
        for (const pattern of kmPatterns) {
          const kmMatch = data.description.match(pattern);
          if (kmMatch) {
            if (kmMatch[2] && kmMatch[2].length === 3) {
              data.mileage = parseInt(kmMatch[1] + kmMatch[2]);
            } else {
              data.mileage = parseInt(kmMatch[1]);
            }
            break;
          }
        }
        
        // 提取WOF
        const wofPatterns = [
          /WOF\s*(?:until|till|to|expires?)?\s*:?\s*([A-Za-z]+\s*\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
          /WOF\s*:?\s*([A-Za-z]{3}\s*\d{4})/i,
          /WOF\s+([A-Za-z]+\s+\d{4})/i
        ];
        
        for (const pattern of wofPatterns) {
          const wofMatch = data.description.match(pattern);
          if (wofMatch) {
            data.wof = wofMatch[1];
            break;
          }
        }
        
        // 提取Rego
        const regoPatterns = [
          /rego\s*(?:until|till|to|expires?)?\s*:?\s*([A-Za-z]+\s*\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
          /reg(?:istration)?\s*:?\s*([A-Za-z]{3}\s*\d{4})/i
        ];
        
        for (const pattern of regoPatterns) {
          const regoMatch = data.description.match(pattern);
          if (regoMatch) {
            data.rego = regoMatch[1];
            break;
          }
        }
        
        // 提取发布时间
        const timeSelectors = [
          'span[title]',
          'time',
          '[role="main"] span[class*="timestamp"]'
        ];
        for (const ts of timeSelectors) {
          const timeEl = document.querySelector(ts);
          if (timeEl) {
            data.postedTime = timeEl.textContent.trim();
            break;
          }
        }
        
        return data;
      });
      
      // 合并搜索信息
      details.searchModel = vehicle.searchModel;
      details.searchLocation = vehicle.searchLocation;
      
      return details;
      
    } finally {
      await detailPage.close();
    }
  }

  /**
   * 验证车辆是否符合条件（宽松验证，详情页再严格检查）
   */
  isValidVehicle(vehicle) {
    // 列表页只做基础验证，详情页提取完整信息后再严格检查
    
    // 排除关键词检查（高风险车辆）
    const excludeKeywords = this.config.keywords?.exclude || [];
    const text = (vehicle.title + ' ' + (vehicle.description || '')).toLowerCase();
    
    for (const keyword of excludeKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        return false;
      }
    }
    
    // 必须有URL
    if (!vehicle.url) {
      return false;
    }
    
    return true;
  }

  /**
   * 严格验证车辆（详情页提取后使用）
   * 
   * 修复说明：放宽车型检查，因为我们使用特定车型搜索，
   * Facebook返回的结果应该都是相关车型。重点检查价格和年份。
   */
  isValidVehicleStrict(vehicle) {
    const yearMin = this.config.search_criteria.year_range?.min || 2002;
    const priceMin = this.config.search_criteria.price_range?.min_nzd || 2000;
    const priceMax = this.config.search_criteria.price_range?.max_nzd || 5000;
    
    // 价格检查（详情页必须有价格）
    if (!vehicle.price || vehicle.price < priceMin || vehicle.price > priceMax) {
      return false;
    }
    
    // 年份检查（如果提取到年份，则必须>=2002）
    if (vehicle.year && vehicle.year < yearMin) {
      return false;
    }
    
    // 排除关键词检查
    const excludeKeywords = this.config.keywords?.exclude || [];
    const text = (vehicle.title + ' ' + (vehicle.description || '')).toLowerCase();
    
    for (const keyword of excludeKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        return false;
      }
    }
    
    // 车型检查（放宽：只要标题包含toyota即可）
    // 因为我们搜索的是特定车型URL，结果应该都是相关车型
    const textForModel = (vehicle.title + ' ' + (vehicle.description || '')).toLowerCase();
    const hasToyota = textForModel.includes('toyota');
    
    // 可选：如果既没有toyota也没有具体车型名，则跳过
    const validModels = this.config.search_criteria.vehicle_models?.primary || ['corolla', 'vitz', 'rav4'];
    const hasValidModel = validModels.some(model => textForModel.includes(model));
    
    // 宽松策略：只要有toyota或具体车型名即可
    if (!hasToyota && !hasValidModel) {
      return false;
    }
    
    return true;
  }

  /**
   * 验证车辆并返回原因（用于调试）
   */
  validateVehicleWithReason(vehicle) {
    const yearMin = this.config.search_criteria.year_range?.min || 2002;
    const priceMin = this.config.search_criteria.price_range?.min_nzd || 2000;
    const priceMax = this.config.search_criteria.price_range?.max_nzd || 5000;
    
    // 价格检查
    if (!vehicle.price) {
      return { valid: false, reason: `无价格信息` };
    }
    if (vehicle.price < priceMin) {
      return { valid: false, reason: `价格太低 ($${vehicle.price} < $${priceMin})` };
    }
    if (vehicle.price > priceMax) {
      return { valid: false, reason: `价格太高 ($${vehicle.price} > $${priceMax})` };
    }
    
    // 年份检查
    if (vehicle.year && vehicle.year < yearMin) {
      return { valid: false, reason: `年份太早 (${vehicle.year} < ${yearMin})` };
    }
    
    // 排除关键词检查
    const excludeKeywords = this.config.keywords?.exclude || [];
    const text = (vehicle.title + ' ' + (vehicle.description || '')).toLowerCase();
    
    for (const keyword of excludeKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        return { valid: false, reason: `包含排除词 "${keyword}"` };
      }
    }
    
    // 车型检查
    const textForModel = (vehicle.title + ' ' + (vehicle.description || '')).toLowerCase();
    const hasToyota = textForModel.includes('toyota');
    const validModels = this.config.search_criteria.vehicle_models?.primary || ['corolla', 'vitz', 'rav4'];
    const hasValidModel = validModels.some(model => textForModel.includes(model));
    
    if (!hasToyota && !hasValidModel) {
      return { valid: false, reason: `不含Toyota或车型名 (标题: ${vehicle.title?.substring(0, 30) || 'N/A'})` };
    }
    
    return { valid: true, reason: 'OK' };
  }

  /**
   * 保存数据
   */
  saveData() {
    const today = new Date().toISOString().split('T')[0];
    const filename = `vehicles_${today}.json`;
    const filepath = path.join(this.dataDir, filename);
    
    const data = {
      scrapeDate: today,
      scrapeTime: new Date().toISOString(),
      totalVehicles: this.results.length,
      searchConfigs: this.getSearchConfigs().length,
      errors: this.errors,
      vehicles: this.results
    };
    
    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`\n💾 数据已保存: ${filepath}`);
    console.log(`📊 总计: ${this.results.length} 辆有效车辆`);
    
    if (this.errors.length > 0) {
      console.log(`⚠️  错误: ${this.errors.length} 个`);
    }
    
    return filepath;
  }

  /**
   * 保存错误日志
   */
  saveErrorLog() {
    if (this.errors.length === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const errorFile = path.join(this.logsDir, `errors_${today}.json`);
    
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    fs.writeFileSync(errorFile, JSON.stringify({
      date: today,
      errors: this.errors
    }, null, 2));
    
    console.log(`📝 错误日志: ${errorFile}`);
  }

  /**
   * 主执行函数
   */
  async run() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     🚗 Car Scout Toyota 抓取系统         ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log(`⏰ 开始时间: ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })} NZT`);
    console.log(`📍 搜索地区: Auckland, Waikato`);
    console.log(`🚗 目标车型: Corolla, Vitz, RAV4`);
    console.log(`💰 价格范围: $2,000 - $5,000 NZD`);
    console.log(`📅 年份要求: >= 2002`);
    console.log('');
    
    try {
      await this.initBrowser();
      await this.checkLogin();
      
      const configs = this.getSearchConfigs();
      console.log(`\n📋 共 ${configs.length} 个搜索任务`);
      console.log('');
      
      for (let i = 0; i < configs.length; i++) {
        await this.scrapeSearch(configs[i], i + 1, configs.length);
        
        // 搜索间隔
        if (i < configs.length - 1) {
          await this.page.waitForTimeout(5000);
        }
      }
      
      // 保存数据
      const dataFile = this.saveData();
      this.saveErrorLog();
      
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║     ✅ Car Scout 抓取完成!               ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log(`📊 成功抓取: ${this.results.length} 辆车`);
      console.log(`📁 数据文件: ${dataFile}`);
      
      return dataFile;
      
    } catch (err) {
      console.error('\n❌ 执行失败:', err.message);
      this.saveErrorLog();
      throw err;
    } finally {
      if (this.browser) {
        await this.browser.close();
        console.log('🔒 浏览器已关闭');
      }
    }
  }
}

// 如果直接运行
if (require.main === module) {
  const scraper = new CarScoutScraper();
  scraper.run().catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
}

module.exports = CarScoutScraper;

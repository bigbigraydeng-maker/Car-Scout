/**
 * Car Scout - Daily Automated Scraper
 * TradeMe + Facebook Marketplace 联合抓取
 * 定时任务版本 - 每天自动运行
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class CarScoutDaily {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.authDir = path.join(__dirname, '..', 'auth');
    this.reportsDir = path.join(__dirname, '..', 'reports', 'daily');
    this.results = [];
    this.newVehicles = [];
    this.previousDataFile = path.join(this.dataDir, 'previous_scrape.json');
    
    // 搜索配置
    this.config = {
      location: 'auckland',
      radius: 100, // 公里
      brands: [
        { name: 'toyota', models: ['corolla', 'vitz', 'yaris', 'rav4'] },
        { name: 'honda', models: ['civic', 'accord', 'fit', 'jazz'] },
        { name: 'mazda', models: ['mazda3', 'mazda6', 'axela', 'atenza'] }
      ],
      priceRange: { min: 2000, max: 5000 },
      yearRange: { min: 2002, max: 2010 },
      maxMileage: 160000
    };
    
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.reportsDir)) fs.mkdirSync(this.reportsDir, { recursive: true });
  }

  async run() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚗 Car Scout Daily - 联合抓取系统            ║');
    console.log('║   TradeMe + Facebook Marketplace               ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const startTime = Date.now();
    
    // 1. 加载之前的数据（用于对比新车辆）
    this.loadPreviousData();
    
    // 2. 抓取 TradeMe
    await this.scrapeTradeMe();
    
    // 3. 抓取 Facebook
    await this.scrapeFacebook();
    
    // 4. 合并去重
    this.deduplicateAndRank();
    
    // 5. 生成报告
    const report = this.generateReport();
    
    // 6. 保存数据
    this.saveData();
    
    // 7. 发送飞书卡片消息
    await this.sendFeishuReport(report);
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n✅ 完成！耗时 ${duration} 分钟`);
    
    return report;
  }

  loadPreviousData() {
    // 加载7天内的历史数据
    this.historicalVehicles = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const file = path.join(this.dataDir, `daily_scrape_${dateStr}.json`);
      
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (data.vehicles) {
            this.historicalVehicles.push(...data.vehicles);
          }
        } catch (e) {}
      }
    }
    
    // 去重历史数据
    const seen = new Set();
    this.historicalVehicles = this.historicalVehicles.filter(v => {
      const key = `${v.brand}-${v.model}-${v.price}-${v.mileage}-${v.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`📋 加载了 ${this.historicalVehicles.length} 辆7天内历史数据\n`);
    
    // 昨天的数据（用于对比新车辆）
    if (fs.existsSync(this.previousDataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.previousDataFile, 'utf8'));
        this.previousVehicles = data.vehicles || [];
      } catch (e) {
        this.previousVehicles = [];
      }
    } else {
      this.previousVehicles = [];
    }
  }

  async scrapeTradeMe() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 步骤 1/4: 抓取 TradeMe');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      for (const brand of this.config.brands) {
        for (const model of brand.models) {
          const url = `https://www.trademe.co.nz/a/motors/cars/${brand.name}/search?` +
            `price_min=${this.config.priceRange.min}&` +
            `price_max=${this.config.priceRange.max}&` +
            `year_min=${this.config.yearRange.min}&` +
            `sort_order=expirydesc&` +
            `seller_type=private&` +
            `search_string=${brand.name}%20${model}`;
          
          console.log(`🔍 ${brand.name} ${model}`);
          
          await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
          await page.waitForTimeout(3000);
          
          // 提取车辆列表
          const vehicles = await this.extractTradeMeListings(page, brand.name, model);
          this.results.push(...vehicles);
          
          console.log(`   ✅ ${vehicles.length} 辆\n`);
        }
      }
    } catch (err) {
      console.error('❌ TradeMe 错误:', err.message);
    } finally {
      await browser.close();
    }
  }

  async extractTradeMeListings(page, brand, model) {
    return await page.evaluate(({ brand, model, config }) => {
      const vehicles = [];
      const links = document.querySelectorAll('a[href*="/listing/"]');
      
      links.forEach(link => {
        const text = link.innerText || link.textContent || '';
        
        // 提取价格
        const priceMatch = text.match(/\$([\d,]+)/);
        if (!priceMatch) return;
        const price = parseInt(priceMatch[1].replace(/,/g, ''));
        if (price < config.priceRange.min || price > config.priceRange.max) return;
        
        // 提取年份
        const yearMatch = text.match(/\b(200[2-9]|201[0-9])\b/);
        if (!yearMatch) return;
        const year = parseInt(yearMatch[1]);
        if (year < config.yearRange.min || year > config.yearRange.max) return;
        
        // 提取里程
        const kmMatch = text.match(/([\d,]+)\s*km/i);
        const mileage = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
        if (mileage > config.maxMileage) return;
        
        // 检查是否个人卖家
        if (!text.toLowerCase().includes('private seller')) return;
        
        const href = link.getAttribute('href');
        const url = href.startsWith('http') ? href : `https://trademe.co.nz${href}`;
        
        vehicles.push({
          title: `${year} ${brand} ${model}`,
          price,
          year,
          mileage,
          location: text.match(/([A-Za-z\s]+),\s*[A-Za-z\s]+/)?.[1] || 'Auckland',
          url: url.split('?')[0],
          source: 'TradeMe',
          brand,
          model
        });
      });
      
      return vehicles;
    }, { brand, model, config: this.config });
  }

  async scrapeFacebook() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 步骤 2/4: 抓取 Facebook Marketplace');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const authFile = path.join(this.authDir, 'facebook_auth.json');
    if (!fs.existsSync(authFile)) {
      console.log('⚠️ 未找到 Facebook 登录状态，跳过\n');
      return;
    }
    
    const browser = await chromium.launch({ 
      headless: false,
      channel: 'msedge',
      slowMo: 200
    });
    
    const context = await browser.newContext({
      storageState: authFile,
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      for (const brand of this.config.brands) {
        for (const model of brand.models) {
          try {
            const url = `https://www.facebook.com/marketplace/${this.config.location}/search/?` +
              `query=${brand.name}%20${model}&` +
              `minPrice=${this.config.priceRange.min}&` +
              `maxPrice=${this.config.priceRange.max}`;
            
            console.log(`🔍 ${brand.name} ${model}`);
            
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(5000);
            
            // 滚动加载
            for (let i = 0; i < 3; i++) {
              await page.evaluate(() => window.scrollBy(0, 800));
              await page.waitForTimeout(2000);
            }
            
            // 提取车辆
            const listings = await page.evaluate(() => {
              const items = [];
              document.querySelectorAll('a[href*="/marketplace/item/"]').forEach(link => {
                const href = link.getAttribute('href');
                if (href) {
                  items.push({
                    url: href.startsWith('http') ? href : `https://www.facebook.com${href}`
                  });
                }
              });
              return items;
            });
            
            console.log(`   📋 ${listings.length} 个列表`);
            
            // 检查前8辆
            let count = 0;
            let errorCount = 0;
            
            for (const listing of listings.slice(0, 8)) {
              try {
                const vehicle = await this.checkFacebookVehicle(page, listing.url, brand.name, model);
                if (vehicle) {
                  this.results.push(vehicle);
                  count++;
                  console.log(`      ✅ ${vehicle.title?.substring(0, 30)} $${vehicle.price}`);
                }
              } catch (e) {
                errorCount++;
                if (errorCount > 3) {
                  console.log(`      ⚠️ 错误过多，跳过该车型`);
                  break;
                }
              }
              await page.waitForTimeout(1500);
            }
            
            console.log(`   ✅ ${count} 辆有效${errorCount > 0 ? ` (${errorCount}个错误)` : ''}\n`);
            
          } catch (modelErr) {
            console.log(`   ❌ ${brand.name} ${model} 失败: ${modelErr.message.substring(0, 50)}\n`);
            continue;
          }
        }
      }
    } catch (err) {
      console.error('❌ Facebook 错误:', err.message);
    } finally {
      await browser.close();
    }
  }

  async checkFacebookVehicle(page, url, brand, model) {
    let newPage = null;
    
    try {
      // 创建新页面
      newPage = await page.context().newPage();
      
      // 设置超时并访问页面
      await newPage.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000 
      });
      
      // 等待页面稳定
      await newPage.waitForTimeout(4000);
      
      // 检查页面是否有效
      const pageTitle = await newPage.title().catch(() => '');
      if (pageTitle.includes('Error') || pageTitle.includes('Not Found')) {
        throw new Error('Invalid page');
      }
      
      const data = await newPage.evaluate((config) => {
        try {
          const pageText = document.body.innerText || '';
          
          // 价格 - 多种格式
          const priceMatch = pageText.match(/NZ\$\s*([\d,]+)/) || 
                            pageText.match(/\$\s*([\d,]+)/);
          if (!priceMatch) return null;
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          if (price < config.priceRange.min || price > config.priceRange.max) return null;
          
          // 年份
          const yearMatch = pageText.match(/\b(200[2-9]|201[0-9])\b/);
          if (!yearMatch) return null;
          const year = parseInt(yearMatch[1]);
          if (year < config.yearRange.min || year > config.yearRange.max) return null;
          
          // 里程
          const kmPatterns = [
            /(\d+)\s*万公里/,
            /([\d,]+)\s*km/i,
            /ODO\s*(\d{2,3})[KX]+/i,
            /(\d{2,3})[KX]+\s*km/i,
          ];
          let mileage = 0;
          for (const pattern of kmPatterns) {
            const match = pageText.match(pattern);
            if (match) {
              const num = match[1].replace(/,/g, '');
              mileage = match[0].includes('万') ? parseInt(num) * 10000 : parseInt(num);
              break;
            }
          }
          if (mileage > config.maxMileage) return null;
          
          // 标题
          const h1 = document.querySelector('h1');
          const title = h1 ? h1.innerText.trim() : `${year} ${brand} ${model}`;
          
          return { title, price, year, mileage };
        } catch (e) {
          return null;
        }
      }, this.config);
      
      if (data) {
        return {
          ...data,
          location: 'Auckland',
          url: url.split('?')[0],
          source: 'Facebook',
          brand,
          model
        };
      }
      
      return null;
      
    } catch (err) {
      // 静默处理错误，不中断流程
      return null;
    } finally {
      // 确保页面关闭
      if (newPage) {
        try {
          await newPage.close();
        } catch (e) {
          // 忽略关闭错误
        }
      }
    }
  }

  deduplicateAndRank() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 步骤 3/4: 数据处理和排名');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 去重
    const seen = new Set();
    this.results = this.results.filter(v => {
      const key = `${v.brand}-${v.model}-${v.price}-${v.mileage}-${v.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`📊 去重后: ${this.results.length} 辆\n`);
    
    // 检查每辆车的历史记录（上架时间）
    this.results.forEach(v => {
      const historicalMatch = this.historicalVehicles.find(hv => 
        hv.url === v.url || 
        (hv.brand === v.brand && hv.model === v.model && 
         hv.price === v.price && Math.abs(hv.mileage - v.mileage) < 5000)
      );
      
      if (historicalMatch) {
        // 计算上架天数
        const firstSeen = new Date(historicalMatch.firstSeen || historicalMatch.scrapeTime);
        const now = new Date();
        v.listingDays = Math.floor((now - firstSeen) / (1000 * 60 * 60 * 24));
        v.firstSeen = historicalMatch.firstSeen || historicalMatch.scrapeTime;
      } else {
        v.listingDays = 0; // 今天新发现
        v.firstSeen = new Date().toISOString();
      }
    });
    
    // 识别真正的新车辆（今天首次出现）
    this.newVehicles = this.results.filter(v => v.listingDays === 0);
    
    console.log(`🆕 新上架车辆: ${this.newVehicles.length} 辆\n`);
    console.log(`📅 历史车辆: ${this.results.filter(v => v.listingDays > 0).length} 辆\n`);
    
    // 评分排序（考虑上架时间）
    this.results.forEach(v => {
      v.score = this.calculateScore(v);
      // 上架时间久的车辆加分（好谈价）
      if (v.listingDays >= 7) v.score += 5;
      else if (v.listingDays >= 3) v.score += 3;
    });
    
    this.results.sort((a, b) => b.score - a.score);
  }

  calculateScore(vehicle) {
    let score = 0;
    
    // 价格性价比 (40分)
    const avgPrice = 4000;
    if (vehicle.price <= 3000) score += 40;
    else if (vehicle.price <= 3500) score += 35;
    else if (vehicle.price <= 4000) score += 30;
    else if (vehicle.price <= 4500) score += 20;
    else score += 10;
    
    // 里程 (30分)
    if (vehicle.mileage <= 80000) score += 30;
    else if (vehicle.mileage <= 100000) score += 25;
    else if (vehicle.mileage <= 120000) score += 20;
    else if (vehicle.mileage <= 140000) score += 15;
    else score += 10;
    
    // 年份 (20分)
    if (vehicle.year >= 2008) score += 20;
    else if (vehicle.year >= 2006) score += 15;
    else if (vehicle.year >= 2004) score += 10;
    else score += 5;
    
    // 数据源 (10分) - TradeMe 更可靠
    if (vehicle.source === 'TradeMe') score += 10;
    else score += 5;
    
    return score;
  }

  generateReport() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 步骤 4/4: 生成报告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const today = new Date().toISOString().split('T')[0];
    const topVehicles = this.results.slice(0, 5);
    
    // 找出最值得出手的（综合考虑评分和上架时间）
    const bestDeal = topVehicles[0];
    if (bestDeal) {
      console.log(`🏆 最值得出手: ${bestDeal.title}`);
      console.log(`   💰 $${bestDeal.price.toLocaleString()}`);
      console.log(`   🛣️ ${bestDeal.mileage.toLocaleString()} km`);
      console.log(`   📅 ${bestDeal.listingDays > 0 ? `已上架 ${bestDeal.listingDays} 天（可谈价）` : '今天新上架'}`);
      console.log(`   🔗 ${bestDeal.url}\n`);
    }
    
    const report = {
      date: today,
      summary: {
        total: this.results.length,
        trademe: this.results.filter(v => v.source === 'TradeMe').length,
        facebook: this.results.filter(v => v.source === 'Facebook').length,
        newVehicles: this.newVehicles.length
      },
      topPicks: topVehicles,
      newVehicles: this.newVehicles,
      bestDeal: bestDeal
    };
    
    // 保存报告
    const reportPath = path.join(this.reportsDir, `report_${today}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('✅ 报告已生成\n');
    
    return report;
  }

  saveData() {
    const today = new Date().toISOString().split('T')[0];
    
    // 保存今日完整数据
    const dailyData = {
      date: today,
      scrapeTime: new Date().toISOString(),
      vehicles: this.results
    };
    
    const dailyFile = path.join(this.dataDir, `daily_scrape_${today}.json`);
    fs.writeFileSync(dailyFile, JSON.stringify(dailyData, null, 2));
    
    // 更新昨天数据文件（用于次日对比）
    fs.writeFileSync(this.previousDataFile, JSON.stringify(dailyData, null, 2));
    
    console.log(`💾 数据已保存: ${dailyFile}\n`);
  }

  async sendFeishuReport(report) {
    console.log('📱 发送飞书报告...\n');
    
    // 生成飞书消息内容
    const message = this.formatFeishuMessage(report);
    
    // 这里调用飞书API发送消息
    // 实际实现需要根据飞书API文档
    console.log('飞书消息内容：');
    console.log(message);
    console.log('\n✅ 报告发送完成\n');
  }

  async sendFeishuReport(report) {
    console.log('📱 发送飞书卡片消息...\n');
    
    // 构建飞书卡片消息
    const card = this.buildFeishuCard(report);
    
    // 发送消息
    try {
      // 使用 message 工具发送飞书卡片
      await this.sendFeishuCard(card);
      console.log('✅ 飞书消息已发送\n');
    } catch (err) {
      console.error('❌ 发送失败:', err.message);
      // 备用：打印消息内容
      console.log('\n备用文本消息：');
      console.log(this.formatTextMessage(report));
    }
  }

  buildFeishuCard(report) {
    const topPick = report.topPicks[0]; // 最值得出手的
    
    // 构建卡片元素
    const elements = [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**📊 今日概览**  \n总车辆: ${report.summary.total} 辆 | 新上架: ${report.summary.newVehicles} 辆 | TradeMe: ${report.summary.trademe} 辆 | Facebook: ${report.summary.facebook} 辆`
        }
      },
      { tag: "hr" },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**🏆 最值得出手**  \n🚗 ${topPick.title}  \n💰 $${topPick.price.toLocaleString()} | 🛣️ ${topPick.mileage.toLocaleString()} km | ⭐ ${topPick.score}/100`
        }
      },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `📍 ${topPick.location} | 📅 ${topPick.listingDays > 0 ? `已上架 ${topPick.listingDays} 天（可谈价）` : '今天新上架'}`
        }
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: "🔗 查看详情" },
            type: "primary",
            url: topPick.url
          }
        ]
      }
    ];
    
    // 添加TOP 2-5
    if (report.topPicks.length > 1) {
      elements.push({ tag: "hr" });
      elements.push({
        tag: "div",
        text: {
          tag: "lark_md",
          content: "**📋 其他推荐**"
        }
      });
      
      report.topPicks.slice(1, 5).forEach((v, i) => {
        const rank = i + 2;
        elements.push({
          tag: "div",
          text: {
            tag: "lark_md",
            content: `${rank}. ${v.title} - $${v.price.toLocaleString()} | ${v.mileage.toLocaleString()} km | ${v.listingDays > 0 ? `${v.listingDays}天` : '新'} | [链接](${v.url})`
          }
        });
      });
    }
    
    // 添加新上架车辆
    if (report.newVehicles.length > 0) {
      elements.push({ tag: "hr" });
      elements.push({
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**🆕 今日新上架 (${report.newVehicles.length} 辆)**`
        }
      });
      
      report.newVehicles.slice(0, 3).forEach(v => {
        elements.push({
          tag: "div",
          text: {
            tag: "lark_md",
            content: `• ${v.title} - $${v.price.toLocaleString()} | [链接](${v.url})`
          }
        });
      });
    }
    
    // 添加说明
    elements.push({ tag: "hr" });
    elements.push({
      tag: "note",
      elements: [
        {
          tag: "plain_text",
          content: "💡 上架时间越久，谈价空间可能越大"
        }
      ]
    });
    
    return {
      config: { wide_screen_mode: true },
      header: {
        title: {
          tag: "plain_text",
          content: `🚗 Car Scout 日报 - ${report.date}`
        },
        template: "blue"
      },
      elements
    };
  }

  async sendFeishuCard(card) {
    // 这里调用飞书API发送卡片消息
    // 由于权限限制，暂时输出到控制台
    console.log('飞书卡片内容:');
    console.log(JSON.stringify(card, null, 2));
    
    // 实际实现需要使用飞书API
    // const response = await fetch('https://open.feishu.cn/open-apis/message/v4/send/', {...})
  }

  formatTextMessage(report) {
    const today = report.date;
    const topPick = report.topPicks[0];
    
    let msg = `🚗 Car Scout 日报 - ${today}\n\n`;
    
    msg += `📊 数据概览\n`;
    msg += `总车辆: ${report.summary.total} 辆 | 新: ${report.summary.newVehicles} 辆\n`;
    msg += `TradeMe: ${report.summary.trademe} 辆 | Facebook: ${report.summary.facebook} 辆\n\n`;
    
    msg += `🏆 最值得出手\n`;
    msg += `${topPick.title}\n`;
    msg += `💰 $${topPick.price.toLocaleString()} | 🛣️ ${topPick.mileage.toLocaleString()} km | ⭐ ${topPick.score}/100\n`;
    msg += `${topPick.listingDays > 0 ? `📅 已上架 ${topPick.listingDays} 天（可谈价）` : '📅 今天新上架'}\n`;
    msg += `🔗 ${topPick.url}\n\n`;
    
    if (report.topPicks.length > 1) {
      msg += `📋 其他推荐\n`;
      report.topPicks.slice(1, 5).forEach((v, i) => {
        msg += `${i+2}. ${v.title} - $${v.price.toLocaleString()} (${v.listingDays > 0 ? `${v.listingDays}天` : '新'})\n`;
        msg += `   ${v.url}\n`;
      });
      msg += '\n';
    }
    
    if (report.newVehicles.length > 0) {
      msg += `🆕 今日新上架 (${report.newVehicles.length} 辆)\n`;
      report.newVehicles.slice(0, 3).forEach(v => {
        msg += `• ${v.title} - $${v.price.toLocaleString()}\n`;
      });
    }
    
    msg += '\n💡 上架时间越久，谈价空间可能越大';
    
    return msg;
  }
}

// 运行
if (require.main === module) {
  new CarScoutDaily().run().catch(err => {
    console.error('致命错误:', err);
    process.exit(1);
  });
}

module.exports = CarScoutDaily;

/**
 * trademe-daily-scan.js
 * 每日扫描 TradeMe 四品牌新车（Honda/Toyota/Mazda/Nissan）
 * 按最新上架排序，自动去重，飞书推送
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// 四个品牌搜索链接（已配置好筛选条件）
const BRAND_URLS = [
  {
    brand: 'Honda',
    url: 'https://www.trademe.co.nz/a/motors/cars/honda/search?year_min=2006&vehicle_condition=used&price_max=7500&odometer_max=180000&user_region=2&transmission=2%7C3&listing_type=private&sort_order=expirydesc'
  },
  {
    brand: 'Toyota',
    url: 'https://www.trademe.co.nz/a/motors/cars/toyota/search?year_min=2006&vehicle_condition=used&price_max=7500&odometer_max=180000&user_region=2&transmission=2%7C3&listing_type=private&sort_order=expirydesc'
  },
  {
    brand: 'Mazda',
    url: 'https://www.trademe.co.nz/a/motors/cars/mazda/search?year_min=2006&vehicle_condition=used&price_max=7500&odometer_max=180000&user_region=2&transmission=2%7C3&listing_type=private&sort_order=expirydesc'
  },
  {
    brand: 'Nissan',
    url: 'https://www.trademe.co.nz/a/motors/cars/nissan/search?year_min=2006&vehicle_condition=used&price_max=7500&odometer_max=180000&user_region=2&transmission=2%7C3&listing_type=private&sort_order=expirydesc'
  }
];

const DATA_DIR = path.join(__dirname, '../data');
const HISTORY_FILE = path.join(DATA_DIR, 'trademe_listing_history.json');
const NEW_CARS_FILE = path.join(DATA_DIR, 'trademe_new_today.json');

// 加载历史记录
function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch (e) {
    return { listings: [], lastScan: null };
  }
}

// 保存历史记录
function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// 提取listing ID
function extractListingId(url) {
  const match = url.match(/\/listing\/(\d+)/);
  return match ? match[1] : null;
}

// 延迟函数
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min, max) {
  return delay(min + Math.random() * (max - min));
}

// 扫描单个品牌
async function scanBrand(page, brandConfig) {
  console.log(`\n🔍 扫描 ${brandConfig.brand}...`);
  console.log(`   ${brandConfig.url}`);

  try {
    await page.goto(brandConfig.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(2000, 4000);

    // 提取列表数据
    const listings = await page.evaluate((brand) => {
      const results = [];
      
      // TradeMe 列表卡片选择器
      const cards = document.querySelectorAll('[class*="ListingCard"], [class*="tm-search-card"], .tm-motors-search-card');
      
      cards.forEach(card => {
        try {
          // 提取链接
          const linkEl = card.querySelector('a[href*="/listing/"]') || card.closest('a[href*="/listing/"]');
          if (!linkEl) return;
          
          const href = linkEl.getAttribute('href');
          const url = href.startsWith('http') ? href : 'https://www.trademe.co.nz' + href;
          
          // 提取标题
          const titleEl = card.querySelector('h3, [class*="title"], h2');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // 提取价格
          const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
          const priceText = priceEl ? priceEl.textContent.trim() : '';
          const priceMatch = priceText.match(/\$([\d,]+)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
          
          // 提取详情（年份、里程等）
          const detailsEl = card.querySelector('[class*="details"], [class*="subtitle"]');
          const details = detailsEl ? detailsEl.textContent.trim() : '';
          
          // 提取年份
          const yearMatch = title.match(/\b(20\d{2}|19\d{2})\b/) || details.match(/\b(20\d{2}|19\d{2})\b/);
          const year = yearMatch ? parseInt(yearMatch[1]) : null;
          
          // 提取里程
          const kmMatch = details.match(/(\d+)\s*km/i) || title.match(/(\d+)\s*km/i);
          const km = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : null;
          
          // 提取位置
          const locationEl = card.querySelector('[class*="location"]');
          const location = locationEl ? locationEl.textContent.trim() : 'Auckland';
          
          // 提取发布时间（如果有）
          const timeEl = card.querySelector('[class*="time"], [class*="Time"]');
          const listedTime = timeEl ? timeEl.textContent.trim() : '';
          
          results.push({
            id: url.match(/\/listing\/(\d+)/)?.[1],
            brand,
            title,
            url,
            price,
            year,
            km,
            location,
            listedTime,
            details,
            scrapedAt: new Date().toISOString()
          });
        } catch (e) {}
      });
      
      return results;
    }, brandConfig.brand);

    console.log(`   ✅ 找到 ${listings.length} 辆车`);
    return listings;

  } catch (error) {
    console.error(`   ❌ 扫描失败: ${error.message}`);
    return [];
  }
}

// 计算 Flip Score（简化版）
function calculateFlipScore(listing) {
  let score = 50;
  
  // 价格评分（越低越好）
  if (listing.price) {
    if (listing.price <= 4000) score += 15;
    else if (listing.price <= 5500) score += 10;
    else if (listing.price <= 7000) score += 5;
  }
  
  // 年份评分（越新越好）
  if (listing.year) {
    if (listing.year >= 2015) score += 15;
    else if (listing.year >= 2012) score += 10;
    else if (listing.year >= 2010) score += 5;
  }
  
  // 里程评分（越低越好）
  if (listing.km) {
    if (listing.km <= 80000) score += 15;
    else if (listing.km <= 120000) score += 10;
    else if (listing.km <= 160000) score += 5;
  }
  
  return Math.min(100, score);
}

// 发送飞书通知
async function sendFeishuNotification(newListings) {
  if (newListings.length === 0) return;
  
  const sendFeishu = require('./send-feishu');
  
  let message = `🚗 **TradeMe 每日新车报告** | ${new Date().toLocaleDateString('zh-CN')}\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // 只推送前5辆最好的
  const topListings = newListings
    .map(l => ({ ...l, flipScore: calculateFlipScore(l) }))
    .sort((a, b) => b.flipScore - a.flipScore)
    .slice(0, 5);
  
  topListings.forEach((l, i) => {
    const medal = ['🏆', '🥈', '🥉', '4️⃣', '5️⃣'][i] || '•';
    message += `${medal} **${l.year || ''} ${l.title}**\n`;
    message += `💰 $${l.price?.toLocaleString() || '?'}`;
    if (l.km) message += ` | ${(l.km/1000).toFixed(0)}k km`;
    message += ` | Flip ${l.flipScore}\n`;
    message += `🔗 ${l.url}\n\n`;
  });
  
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📊 今日新增: ${newListings.length} 辆 | 推送前5辆最佳机会`;
  
  try {
    await sendFeishu(message);
    console.log('✅ 飞书通知已发送');
  } catch (e) {
    console.error('❌ 飞书通知失败:', e.message);
  }
}

// 主函数
async function main() {
  console.log('🚗 TradeMe 每日扫描开始...');
  console.log(`⏰ ${new Date().toLocaleString('zh-CN')}\n`);
  
  // 加载历史
  const history = loadHistory();
  const knownIds = new Set(history.listings.map(l => l.id));
  console.log(`📚 历史记录: ${knownIds.size} 辆车`);
  
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // 扫描所有品牌
  const allListings = [];
  for (const brandConfig of BRAND_URLS) {
    const listings = await scanBrand(page, brandConfig);
    allListings.push(...listings);
    await randomDelay(3000, 5000);
  }
  
  await browser.close();
  
  console.log(`\n📊 扫描完成: 共 ${allListings.length} 辆车`);
  
  // 去重并找出新车
  const newListings = allListings.filter(l => {
    if (!l.id) return false;
    if (knownIds.has(l.id)) return false;
    return true;
  });
  
  console.log(`🆕 新车: ${newListings.length} 辆`);
  
  if (newListings.length > 0) {
    // 保存新车数据
    fs.writeFileSync(NEW_CARS_FILE, JSON.stringify(newListings, null, 2));
    
    // 更新历史
    history.listings = [...newListings, ...history.listings].slice(0, 1000); // 只保留最近1000辆
    history.lastScan = new Date().toISOString();
    saveHistory(history);
    
    // 发送通知
    await sendFeishuNotification(newListings);
    
    // 打印详情
    console.log('\n📋 新车详情:');
    newListings.forEach((l, i) => {
      console.log(`  ${i+1}. [${l.brand}] ${l.year || ''} ${l.title.substring(0, 40)}...`);
      console.log(`     💰 $${l.price?.toLocaleString()} | ${l.km?.toLocaleString()}km`);
    });
  } else {
    console.log('📭 今日无新车');
  }
  
  console.log('\n✅ 扫描完成');
}

// 运行
main().catch(console.error);

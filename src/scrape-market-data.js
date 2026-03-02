/**
 * Car Scout - Market Valuation Data Scraper
 * 从 TradeMe 搜索页面采集真实市场定价数据
 *
 * 策略:
 *   - $3K-$15K Buy Now only (排除 Auction/$1 Reserve)
 *   - 12 车型 × Auckland × 2 页 = ~480 条数据
 *   - 仅读取搜索卡片 (不访问详情页) → ~5 分钟
 *   - 提取: model, year, km, price, sellerType
 *
 * 使用: node src/scrape-market-data.js
 * Cron: 每周日 3:00 AM NZT
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// ─── 车型配置 (同 scrape-trademe-real.js) ───
const MODELS = [
  { name: 'Corolla', path: 'toyota/corolla', yearMin: 2005 },
  { name: 'Vitz',    path: 'toyota/vitz',    yearMin: 2005 },
  { name: 'Wish',    path: 'toyota/wish',    yearMin: 2005 },
  { name: 'RAV4',    path: 'toyota/rav4',    yearMin: 2005 },
  { name: 'Honda Fit', path: 'honda/fit',    yearMin: 2006 },
  { name: 'Demio',   path: 'mazda/demio',    yearMin: 2006 },
  { name: 'Aqua',    path: 'toyota/aqua',    yearMin: 2012 },
  { name: 'Swift',   path: 'suzuki/swift',   yearMin: 2005 },
  { name: 'Prius',   path: 'toyota/prius',   yearMin: 2005 },
  { name: 'Axela',   path: 'mazda/axela',    yearMin: 2005 },
  { name: 'Civic',   path: 'honda/civic',    yearMin: 2006 },
  { name: 'Tiida',   path: 'nissan/tiida',   yearMin: 2005 },
];

const REGION_CODE = '100003'; // Auckland
const PRICE_MIN = 3000;
const PRICE_MAX = 15000;
const MAX_PAGES = 2;

// ─── 价格类型说明 ───
// TM 搜索卡片有 3 种价格格式:
//   "Asking price  $8,979"     → 固定售价 (Classified) ✓ 使用
//   "Buy now $4,200"           → 立即购买价 ✓ 使用
//   "$4,200" (无 Asking/BuyNow) → 可能是拍卖当前出价 ✗ 跳过
// 只提取 "Asking price" 或 "Buy now" 后面的价格，纯拍卖自动被排除

// ─── Helpers ───
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay(min, max) { return delay(min + Math.random() * (max - min)); }

function buildURL(model, page) {
  const params = new URLSearchParams({
    price_min: PRICE_MIN,
    price_max: PRICE_MAX,
    year_min: model.yearMin,
    odometer_max: 200000,
    region: REGION_CODE,
    transmission: 'automatic',
  });
  if (page > 1) params.set('page', page);
  return `https://www.trademe.co.nz/a/motors/cars/${model.path}/search?${params}`;
}

// ─── 搜索页数据提取 ───
async function scrapeSearchCards(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await randomDelay(2000, 3500);

  return await page.evaluate(() => {
    const results = [];
    const seen = new Set();
    const links = document.querySelectorAll('a[href*="/listing/"]');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || seen.has(href)) return;
      seen.add(href);

      const container = link.closest('[class*="Card"], [class*="card"], [class*="Listing"], li') || link.parentElement;
      const text = (container || link).textContent || '';

      // Price: 只提取 "Asking price $X" 或 "Buy now $X"
      // 纯拍卖（无固定价格）自动被跳过
      let price = 0;
      const askingMatch = text.match(/Asking price\s+\$?([\d,]+)/i);
      const buyNowMatch = text.match(/Buy now\s+\$?([\d,]+)/i);
      if (askingMatch) {
        price = parseInt(askingMatch[1].replace(/,/g, ''));
      } else if (buyNowMatch) {
        price = parseInt(buyNowMatch[1].replace(/,/g, ''));
      }
      if (price <= 0) return;

      // Year
      const yearMatch = text.match(/\b(20(?:0[5-9]|1[0-9]|2[0-6]))\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 0;

      // Mileage (km) - avoid matching cc values
      // TM cards show: "102,683 km" separate from "1,240 cc"
      const kmMatch = text.match(/([\d,]+)\s*km\b/i);
      let km = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
      if (km > 0 && km < 500) km = 0;  // cc values误匹配 (e.g. "1,240 cc" 后跟 "km")

      // Seller type: "Private seller" badge or dealer signals
      const isPrivate = /Private seller/i.test(text);
      const isDealer = !isPrivate && /\bdealer\b/i.test(text);

      // Listing ID
      const idMatch = href.match(/listing\/(\d+)/);
      const listingId = idMatch ? idMatch[1] : '';

      results.push({
        price,
        year,
        km,
        isDealer,
        listingId,
      });
    });

    return results;
  });
}

// ─── Main ───
async function main() {
  const startTime = Date.now();
  console.log('📊 Car Scout - Market Valuation Data Scraper');
  console.log('=============================================');
  console.log(`Price range: $${PRICE_MIN}-$${PRICE_MAX} | Buy Now only | Auckland\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  const allListings = [];
  const stats = {};
  let noYearFiltered = 0;
  let duplicates = 0;
  const seenIds = new Set();

  for (const model of MODELS) {
    stats[model.name] = { total: 0, private: 0, dealer: 0 };
    console.log(`\n🔍 ${model.name}`);

    for (let pg = 1; pg <= MAX_PAGES; pg++) {
      try {
        const url = buildURL(model, pg);
        const cards = await scrapeSearchCards(page, url);

        let pageCount = 0;
        for (const card of cards) {
          // Dedup
          if (card.listingId && seenIds.has(card.listingId)) {
            duplicates++;
            continue;
          }
          if (card.listingId) seenIds.add(card.listingId);

          // Must have year
          if (card.year === 0) {
            noYearFiltered++;
            continue;
          }

          // Price sanity
          if (card.price < PRICE_MIN || card.price > PRICE_MAX) continue;

          const listing = {
            model: model.name,
            year: card.year,
            km: card.km,           // 0 = unknown
            price: card.price,
            sellerType: card.isDealer ? 'dealer' : 'private',
            listingId: `tm_${card.listingId}`,
          };

          allListings.push(listing);
          stats[model.name].total++;
          stats[model.name][listing.sellerType]++;
          pageCount++;
        }

        console.log(`  Page ${pg}: ${cards.length} cards → ${pageCount} valid`);

        // If page 1 had very few results, skip page 2
        if (pg === 1 && cards.length < 5) {
          console.log(`  (Few results, skipping page 2)`);
          break;
        }

        await randomDelay(2000, 4000);
      } catch (e) {
        console.log(`  ❌ Page ${pg}: ${e.message}`);
      }
    }

    console.log(`  → ${stats[model.name].total} listings (${stats[model.name].private} private, ${stats[model.name].dealer} dealer)`);
    await randomDelay(1500, 3000);
  }

  await browser.close();

  // ─── Save data ───
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const dataDir = path.join(__dirname, '..', 'data');
  const outPath = path.join(dataDir, `market_valuation_${dateStr}.json`);

  const output = {
    scrapeDate: new Date().toISOString(),
    totalListings: allListings.length,
    filtered: {
      noYear: noYearFiltered,
      duplicates,
    },
    stats,
    listings: allListings,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n✅ Done in ${elapsed}s`);
  console.log(`📁 Saved: ${outPath}`);
  console.log(`📊 Total: ${allListings.length} listings`);
  console.log(`🚫 Filtered: ${noYearFiltered} no-year, ${duplicates} duplicates`);

  // Per-model summary
  console.log('\n── Per-model breakdown ──');
  for (const [name, s] of Object.entries(stats)) {
    console.log(`  ${name.padEnd(12)} ${String(s.total).padStart(3)} total | ${String(s.private).padStart(3)} private | ${String(s.dealer).padStart(3)} dealer`);
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

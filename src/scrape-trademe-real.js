/**
 * Car Scout - TradeMe REAL Scraper
 * 使用 Puppeteer + Stealth 抓取真实 TradeMe 车辆数据
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// 搜索配置
const MODELS = [
  { name: 'Corolla', brand: 'toyota', path: 'toyota/corolla' },
  { name: 'Vitz', brand: 'toyota', path: 'toyota/vitz' },
  { name: 'Wish', brand: 'toyota', path: 'toyota/wish' },
  { name: 'RAV4', brand: 'toyota', path: 'toyota/rav4' },
  { name: 'Honda Fit', brand: 'honda', path: 'honda/fit' },
  { name: 'Demio', brand: 'mazda', path: 'mazda/demio' },
  // v4.1 新增
  { name: 'Aqua', brand: 'toyota', path: 'toyota/aqua' },
  { name: 'Swift', brand: 'suzuki', path: 'suzuki/swift' },
  { name: 'Prius', brand: 'toyota', path: 'toyota/prius' },
  { name: 'Axela', brand: 'mazda', path: 'mazda/axela' },
  { name: 'Civic', brand: 'honda', path: 'honda/civic' },
  { name: 'Tiida', brand: 'nissan', path: 'nissan/tiida' },
];

const REGIONS = [
  { name: 'Auckland', code: '100003' },
  { name: 'Waikato', code: '100010' },
];

function buildSearchURL(model, region) {
  let yearMin = 2005;
  if (model.name === 'Honda Fit' || model.name === 'Demio' || model.name === 'Civic') yearMin = 2006;
  if (model.name === 'Aqua') yearMin = 2012;
  return `https://www.trademe.co.nz/a/motors/cars/${model.path}/search?price_min=2500&price_max=8000&year_min=${yearMin}&odometer_max=160000&region=${region.code}`;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min, max) {
  return delay(min + Math.random() * (max - min));
}

async function scrapeSearchPage(page, url, modelName, regionName) {
  console.log(`\n  🔍 ${modelName} in ${regionName}`);
  console.log(`     ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await randomDelay(2000, 4000);

  // Check for listings
  const listings = await page.evaluate(() => {
    const results = [];
    // TradeMe search results - try multiple selectors
    const cards = document.querySelectorAll('[class*="ListingCard"], [class*="listing-card"], .tm-motors-search-card, a[href*="/listing/"]');

    if (cards.length === 0) {
      // Fallback: try to find any listing links
      const links = document.querySelectorAll('a[href*="/a/motors/cars/"]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('/listing/')) {
          results.push({
            url: href.startsWith('http') ? href : 'https://www.trademe.co.nz' + href,
            title: link.textContent.trim().substring(0, 200)
          });
        }
      });
    } else {
      cards.forEach(card => {
        const link = card.tagName === 'A' ? card : card.querySelector('a[href*="/listing/"]');
        if (link) {
          const href = link.getAttribute('href');
          results.push({
            url: href.startsWith('http') ? href : 'https://www.trademe.co.nz' + href,
            title: link.textContent.trim().substring(0, 200)
          });
        }
      });
    }

    // Deduplicate by URL
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  });

  console.log(`     Found ${listings.length} listing links`);

  // Also try to get total count from page
  const pageInfo = await page.evaluate(() => {
    const body = document.body.innerText;
    const countMatch = body.match(/(\d+)\s+result/i) || body.match(/Showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)/i);
    return {
      totalText: countMatch ? countMatch[0] : 'unknown',
      bodySnippet: body.substring(0, 500)
    };
  });
  console.log(`     Page info: ${pageInfo.totalText}`);

  return listings;
}

async function scrapeDetailPage(page, listingUrl, modelName, regionName) {
  try {
    await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(1500, 3500);

    const data = await page.evaluate(() => {
      const getText = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim() : '';
      };

      // Get the full page text for parsing
      const bodyText = document.body.innerText;

      // Title
      const title = document.querySelector('h1')?.textContent?.trim() || '';

      // Price - try multiple selectors
      let priceText = '';
      const priceSelectors = [
        '[class*="price"]', '[class*="Price"]',
        '[data-testid*="price"]', '.tm-motors-listing__price'
      ];
      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          priceText = el.textContent.trim();
          if (priceText.includes('$')) break;
        }
      }
      // Also search body text for price pattern
      if (!priceText) {
        const priceMatch = bodyText.match(/\$[\d,]+/);
        if (priceMatch) priceText = priceMatch[0];
      }

      // Extract key details (year, mileage, etc.)
      let year = '';
      let mileage = '';
      let location = '';
      let sellerType = '';
      let description = '';

      // Try to extract from structured data
      const details = document.querySelectorAll('[class*="detail"], [class*="Detail"], [class*="attribute"], [class*="Attribute"], dt, dd, tr, li');
      const detailPairs = {};
      details.forEach(el => {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes('year') || text.includes('registration')) {
          const yearMatch = el.textContent.match(/20\d{2}|19\d{2}/);
          if (yearMatch) year = yearMatch[0];
        }
        if (text.includes('odometer') || text.includes('kilomet') || text.includes('km')) {
          const kmMatch = el.textContent.match(/([\d,]+)\s*km/i);
          if (kmMatch) mileage = kmMatch[1].replace(/,/g, '');
        }
        if (text.includes('location') || text.includes('region')) {
          location = el.textContent.replace(/location|region/gi, '').trim();
        }
        if (text.includes('seller') || text.includes('listed by')) {
          sellerType = el.textContent.trim();
        }
      });

      // Fallback: parse from body text
      if (!year) {
        const ym = bodyText.match(/(?:Year|年份)[:\s]*(20\d{2}|19\d{2})/i) || title.match(/20\d{2}|19\d{2}/);
        if (ym) year = ym[1] || ym[0];
      }
      if (!mileage) {
        const mm = bodyText.match(/([\d,]+)\s*km/i);
        if (mm) mileage = mm[1].replace(/,/g, '');
      }

      // Description - get the main description block
      const descSelectors = [
        '[class*="description"]', '[class*="Description"]',
        '[class*="body"]', '[class*="listing-details"]',
        '[data-testid*="description"]'
      ];
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 20) {
          description = el.textContent.trim();
          break;
        }
      }
      if (!description) {
        // Try to get a reasonable chunk of body text as description
        const paragraphs = document.querySelectorAll('p');
        const texts = [];
        paragraphs.forEach(p => {
          if (p.textContent.trim().length > 20) texts.push(p.textContent.trim());
        });
        description = texts.join('\n').substring(0, 2000);
      }

      // Seller type detection
      if (!sellerType) {
        if (bodyText.toLowerCase().includes('private seller') || bodyText.toLowerCase().includes('private sale')) {
          sellerType = 'Private';
        } else if (bodyText.toLowerCase().includes('dealer') || bodyText.toLowerCase().includes('motor')) {
          sellerType = 'Dealer';
        }
      }

      // Location fallback
      if (!location) {
        const locMatch = bodyText.match(/(Auckland|Waikato|Hamilton|North Shore|Manukau|Waitakere|Papakura|Franklin|Rodney)/i);
        if (locMatch) location = locMatch[0];
      }

      // Posted date
      let postedDate = '';
      const dateMatch = bodyText.match(/Listed?\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/i) ||
                        bodyText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+20\d{2})/i);
      if (dateMatch) postedDate = dateMatch[1];

      // Listing ID from URL
      const urlMatch = window.location.href.match(/listing\/(\d+)/);
      const listingId = urlMatch ? urlMatch[1] : '';

      return {
        title,
        priceText,
        year,
        mileage,
        location,
        sellerType,
        description: description.substring(0, 3000),
        postedDate,
        listingId,
        pageUrl: window.location.href
      };
    });

    // Parse price
    let price = 0;
    if (data.priceText) {
      const pm = data.priceText.replace(/[^0-9.]/g, '');
      price = parseInt(pm) || 0;
    }

    // Parse year
    let year = parseInt(data.year) || 0;

    // Parse mileage
    let mileage = parseInt(data.mileage) || 0;

    // Determine seller type
    let seller = 'Unknown';
    if (data.sellerType.toLowerCase().includes('private')) seller = 'Private';
    else if (data.sellerType.toLowerCase().includes('dealer') || data.sellerType.toLowerCase().includes('motor')) seller = 'Dealer';
    else seller = 'Private'; // Default to private if unclear

    const vehicle = {
      id: 'tm_' + (data.listingId || Date.now()),
      title: data.title,
      model: modelName,
      year: year,
      price: price,
      mileage: mileage,
      location: data.location || regionName,
      seller: seller,
      description: data.description,
      listingUrl: data.pageUrl,
      platform: 'trademe',
      postedDate: data.postedDate || new Date().toISOString().split('T')[0]
    };

    console.log(`     ✅ ${vehicle.title} | $${vehicle.price} | ${vehicle.mileage}km | ${vehicle.year} | ${vehicle.seller}`);
    return vehicle;

  } catch (err) {
    console.log(`     ❌ Error on ${listingUrl}: ${err.message}`);
    return null;
  }
}

// ========== MARKET PRICING (lightweight: search pages only) ==========

function buildPricingSearchURL(model, region) {
  let yearMin = 2005;
  if (model.name === 'Honda Fit' || model.name === 'Demio' || model.name === 'Civic') yearMin = 2006;
  if (model.name === 'Aqua') yearMin = 2012;
  return `https://www.trademe.co.nz/a/motors/cars/${model.path}/search?price_min=8000&price_max=15000&year_min=${yearMin}&odometer_max=160000&region=${region.code}`;
}

async function scrapeSearchPagePrices(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await randomDelay(1500, 3000);
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
      const priceMatch = text.match(/\$([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
      const yearMatch = text.match(/\b(20(?:0[5-9]|1[0-9]|2[0-6]))\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 0;
      if (price >= 7000) {
        results.push({ price, year });
      }
    });
    return results;
  });
}

async function scrapeMarketPricing(page) {
  console.log('\n📊 Scraping market pricing data (search pages only)...');
  const allData = {};
  for (const model of MODELS) {
    allData[model.name] = [];
    for (const region of REGIONS) {
      try {
        const url = buildPricingSearchURL(model, region);
        console.log(`  💰 ${model.name} / ${region.name}`);
        const listings = await scrapeSearchPagePrices(page, url);
        listings.forEach(l => allData[model.name].push({ ...l, region: region.name }));
        console.log(`     ${listings.length} price points`);
        await randomDelay(2000, 4000);
      } catch (e) {
        console.log(`  ❌ ${model.name}/${region.name}: ${e.message}`);
      }
    }
  }

  // Calculate stats by model+year
  const stats = {};
  for (const [model, entries] of Object.entries(allData)) {
    stats[model] = {};
    const yearGroups = {};
    entries.forEach(e => {
      if (e.year > 0) {
        if (!yearGroups[e.year]) yearGroups[e.year] = [];
        yearGroups[e.year].push(e.price);
      }
    });
    for (const [year, prices] of Object.entries(yearGroups)) {
      if (prices.length >= 2) {
        prices.sort((a, b) => a - b);
        stats[model][year] = {
          median: prices[Math.floor(prices.length / 2)],
          count: prices.length,
          min: prices[0],
          max: prices[prices.length - 1]
        };
      }
    }
    const allPrices = entries.map(e => e.price).sort((a, b) => a - b);
    if (allPrices.length > 0) {
      stats[model]._overall = {
        median: allPrices[Math.floor(allPrices.length / 2)],
        count: allPrices.length
      };
    }
  }

  return { raw: allData, stats };
}

async function main() {
  console.log('🚗 Car Scout TradeMe - REAL SCRAPER');
  console.log('====================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  const allVehicles = [];
  const errors = [];

  for (const model of MODELS) {
    for (const region of REGIONS) {
      try {
        const url = buildSearchURL(model, region);
        const listings = await scrapeSearchPage(page, url, model.name, region.name);

        // Visit each listing detail page
        for (const listing of listings) {
          try {
            const vehicle = await scrapeDetailPage(page, listing.url, model.name, region.name);
            if (vehicle && vehicle.price > 0) {
              allVehicles.push(vehicle);
            }
            await randomDelay(2000, 4000);
          } catch (e) {
            errors.push({ url: listing.url, error: e.message });
          }
        }

        await randomDelay(3000, 5000);
      } catch (e) {
        console.log(`  ❌ Error for ${model.name}/${region.name}: ${e.message}`);
        errors.push({ model: model.name, region: region.name, error: e.message });
      }
    }
  }

  // Scrape market pricing (search pages only, no detail pages)
  const marketPricing = await scrapeMarketPricing(page);

  await browser.close();

  // Deduplicate by listing ID
  const seen = new Set();
  const unique = allVehicles.filter(v => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });

  console.log(`\n📊 Results: ${unique.length} vehicles (${errors.length} errors)`);

  // Save to file
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const output = {
    scrapeDate: new Date().toISOString(),
    sources: {
      trademe: { count: unique.length, scraped: true },
      facebook: { count: 0, scraped: false }
    },
    totalCount: unique.length,
    vehicles: unique
  };

  const outPath = path.join(__dirname, '..', 'data', `vehicles_trademe_${dateStr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`💾 Saved: ${outPath}`);

  // Save market pricing data
  const pricingPath = path.join(__dirname, '..', 'data', `market_pricing_${dateStr}.json`);
  fs.writeFileSync(pricingPath, JSON.stringify({
    scrapeDate: new Date().toISOString(),
    stats: marketPricing.stats,
    sampleCounts: Object.fromEntries(
      Object.entries(marketPricing.raw).map(([model, entries]) => [model, entries.length])
    )
  }, null, 2));
  console.log(`💾 Market pricing saved: ${pricingPath}`);

  // Print summary
  console.log('\n📋 Summary:');
  unique.forEach(v => {
    console.log(`   ${v.id} | ${v.title} | $${v.price} | ${v.mileage}km | ${v.year} | ${v.seller} | ${v.location}`);
  });

  return unique;
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

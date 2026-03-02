/**
 * Facebook Marketplace Detail Scraper
 * 访问每个 FB listing 详情页，提取年份、公里数、卖家描述
 * 用提取到的信息更新 fb_search_all.json
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { hasMechanicalIssue, EXCLUDE_KEYWORDS, scoreVehicles } = require('./scoring');

puppeteer.use(StealthPlugin());

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min, max) {
  return delay(min + Math.random() * (max - min));
}

/**
 * 从 FB 详情页提取车辆信息
 */
async function scrapeFbDetail(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(2000, 4000);

    // Check if we got redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('checkpoint')) {
      console.log('     ⚠️ Login required, skipping');
      return { blocked: true };
    }

    // Try clicking "See more" to expand seller description
    try {
      const seeMore = await page.$x("//span[contains(text(),'See more')]");
      if (seeMore.length > 0) {
        await seeMore[0].click();
        await delay(800);
      }
    } catch(e) { /* ignore */ }

    const data = await page.evaluate(() => {
      const bodyText = document.body.innerText || '';
      const title = document.querySelector('h1')?.textContent?.trim() ||
                    document.querySelector('title')?.textContent?.trim() || '';

      // ---- Extract year ----
      const yearPatterns = [
        /\b(19\d{2}|20(?:0[0-9]|1[0-9]|2[0-6]))\s*(?:toyota|honda|mazda|suzuki|nissan)/i,
        /(?:toyota|honda|mazda|suzuki|nissan)\s*(?:\w+\s+)?\b(19\d{2}|20(?:0[0-9]|1[0-9]|2[0-6]))\b/i,
        /(?:my|selling|this)\s+\b(19\d{2}|20(?:0[0-9]|1[0-9]|2[0-6]))\b/i,
        /\b(19\d{2}|20(?:0[0-9]|1[0-9]|2[0-6]))\s*(?:corolla|vitz|wish|rav4|rav\s*4|fit|demio|aqua|swift|prius|axela|civic|tiida)/i,
        /(?:corolla|vitz|wish|rav4|rav\s*4|fit|demio|aqua|swift|prius|axela|civic|tiida)\s*\b(19\d{2}|20(?:0[0-9]|1[0-9]|2[0-6]))\b/i,
      ];
      let year = 0;
      for (const pattern of yearPatterns) {
        const m = bodyText.match(pattern);
        if (m) { year = parseInt(m[1]); break; }
      }
      if (!year) {
        const titleYear = title.match(/\b(19\d{2}|20(?:0[0-9]|1[0-9]|2[0-6]))\b/);
        if (titleYear) year = parseInt(titleYear[1]);
      }

      // ---- Extract mileage ----
      let mileage = 0;

      // Pattern A: standalone large number + km/kms/kmz (like "200000kmz", "150000km")
      // This catches raw mileage numbers WITHOUT needing context words
      const rawKm = bodyText.match(/\b(\d{4,6})\s*(?:km[sz]?)\b/i);
      if (rawKm) {
        const val = parseInt(rawKm[1]);
        if (val >= 10000 && val <= 500000) mileage = val;
      }

      // Pattern B: title shorthand like "369km" or "120kms" = thousands of km
      if (!mileage) {
        const titleKm = title.match(/\b(\d{2,3})\s*(?:km|kms)\b/i);
        if (titleKm) {
          const val = parseInt(titleKm[1]) * 1000;
          if (val >= 50000 && val <= 500000) mileage = val;
        }
      }

      // Pattern C: Chinese notation "24万公里" or "24万km"
      if (!mileage) {
        const wanKm = bodyText.match(/(\d+(?:\.\d+)?)\s*万\s*(?:公里|km|kms)/i);
        if (wanKm) {
          const val = parseFloat(wanKm[1]) * 10000;
          if (val >= 10000 && val <= 500000) mileage = Math.round(val);
        }
      }

      // Pattern D: mileage with context words
      if (!mileage) {
        const mileagePatterns = [
          /(?:done|has done|mileage|odometer|odo|kms?)[:\s]*([\d,]+)\s*(?:km|kms)/i,
          /([\d,]+)\s*(?:km|kms)\s*(?:on the clock|on it|and counting|driven)/i,
          /(?:only|just|low|approx|approximately)\s*([\d,]+)\s*(?:km|kms)/i,
          /([\d]{2,3}),\d{3}\s*(?:km|kms)/i,
          /(?:it'?s?\s+done|driven)\s*([\d,]+)\s*k\b/i,
        ];
        for (const pattern of mileagePatterns) {
          const m = bodyText.match(pattern);
          if (m) {
            const val = parseInt(m[1].replace(/,/g, ''));
            if (val >= 10000 && val <= 500000) { mileage = val; break; }
          }
        }
      }

      // Pattern E: reversed format — label before number
      // Shorthand: "Kms : 192+" → 192 × 1000 = 192,000
      // Full:      "Km: 242161" or "Km: 242,161" → 242,161
      if (!mileage) {
        const revKm = bodyText.match(/\bkms?\s*[:=]\s*([\d,]+)\+?/i);
        if (revKm) {
          let val = parseInt(revKm[1].replace(/,/g, ''));
          if (val >= 50 && val <= 500) val *= 1000;  // shorthand: 2-3 digit = thousands
          if (val >= 10000 && val <= 500000) mileage = val;
        }
      }

      // ---- Detect MANUAL transmission ----
      const isManual = /\bmanual\s*(trans|gear|gearbox|car|vehicle)?\b|(?:5|6)\s*-?\s*speed\s*(manual)?|stick\s*shift/i.test(bodyText)
                    && !/\bautomatic\b/i.test(bodyText);  // if both mentioned, likely listing both options, skip

      // ---- Detect DEALER ----
      const dealerSignals = [
        /financ(?:e|ing)\s*(?:available|avail|option|welcome)/i,
        /\bcar\s*(?:dealer|yard|lot|sales)\b/i,
        /\bwe\s+(?:have|sell|offer|also)\b/i,
        /\bour\s+(?:stock|yard|dealership|cars)\b/i,
        /\btrade[- ]?in[s]?\s+(?:welcome|accepted)\b/i,
        /\btest\s+drive\s+(?:available|welcome)\b/i,
        /\b(?:check|view)\s+(?:our|more)\s+(?:stock|cars|listings)\b/i,
        /\b(?:buy|shop)\s+with\s+confidence\b/i,
      ];
      let isDealer = dealerSignals.some(p => p.test(bodyText));

      // ---- Extract seller description (clean) ----
      // Strategy 1: Find spans that look like actual listing description
      //   - Not sidebar content (no repeated "NZ$" prices)
      //   - Not "Today's picks" section
      //   - Contains car-related words
      let description = '';
      const spans = document.querySelectorAll('span');
      const candidates = [];
      spans.forEach(span => {
        const text = span.textContent.trim();
        if (text.length < 30 || text.length > 3000) return;
        // Skip sidebar content with multiple price listings
        const priceCount = (text.match(/NZ\$/g) || []).length;
        if (priceCount > 2) return;
        // Skip "Today's picks" sidebar
        if (/Today's picks|Similar listings|More from this seller/i.test(text)) return;
        // Skip navigation text
        if (/Marketplace|Home|Notifications|Search/i.test(text.substring(0, 50)) && text.length > 500) return;
        // Prefer text with actual car listing keywords
        const score = (text.match(/km|wof|rego|sell|engine|condition|manual|auto|finance|year|model|reliable|drive|owner|service|warrant|registered|transmission|mileage|公里|万|卖/gi) || []).length;
        if (score > 0) {
          candidates.push({ text, score, len: text.length });
        }
      });

      if (candidates.length > 0) {
        // Pick the one with highest keyword score, tiebreak by shorter length (more focused)
        candidates.sort((a, b) => b.score - a.score || a.len - b.len);
        description = candidates[0].text;
      }

      // Strategy 2 fallback: get text after "Seller's description" or "Description"
      if (!description || description.length < 30) {
        const descHeaders = Array.from(document.querySelectorAll('span'));
        for (const h of descHeaders) {
          if (/^(Seller'?s?\s*description|Description|详细说明)$/i.test(h.textContent.trim())) {
            // Walk up to find the container, then get the next text block
            let parent = h.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
              const next = parent.nextElementSibling;
              if (next && next.textContent.trim().length > 20) {
                description = next.textContent.trim().substring(0, 1500);
                break;
              }
              parent = parent.parentElement;
            }
            if (description) break;
          }
        }
      }

      // ---- Extract seller name ----
      // FB shows seller name near "Listed by" or in a profile link area
      let sellerName = '';
      const sellerPatterns = [
        /Listed (?:by|in)\s+(.+?)(?:\n|$)/i,
      ];
      for (const p of sellerPatterns) {
        const m = bodyText.match(p);
        if (m) { sellerName = m[1].trim(); break; }
      }

      // Check seller name for business keywords (e.g. "Carmart Vehicle Sales")
      if (sellerName && !isDealer) {
        const nameLower = sellerName.toLowerCase();
        if (/\b(?:sales|motors?|dealer|trading|imports?|automotive|ltd|limited|enterprise|warehouse)\b/.test(nameLower)) isDealer = true;
        if (/\b(?:car|auto|vehicle)\s*(?:mart|hub|zone|city|world|shop|store|centre|center)\b/.test(nameLower)) isDealer = true;
      }

      // ---- Extract location ----
      const locMatch = bodyText.match(/(Auckland|Waikato|Hamilton|Manukau|North Shore|Waitakere|Papakura|Franklin|Henderson|Albany|Christchurch|Wellington|Tauranga)/i);
      const location = locMatch ? locMatch[0] : '';

      return {
        title,
        year,
        mileage,
        isManual,
        isDealer,
        sellerName,
        location,
        description: (description || '').substring(0, 1500),
        blocked: false
      };
    });

    return data;
  } catch (e) {
    if (e.message.includes('timeout') || e.message.includes('Navigation')) {
      console.log(`     ⚠️ Page timeout`);
      return { blocked: true };
    }
    console.log(`     ❌ Error: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('📱 Facebook Marketplace Detail Scraper');
  console.log('=======================================\n');

  const dataDir = path.join(__dirname, '..', 'data');

  // Load FB data
  let fbData;
  try {
    fbData = JSON.parse(fs.readFileSync(path.join(dataDir, 'fb_search_all.json'), 'utf8'));
  } catch (e) {
    console.error('No fb_search_all.json found. Run build-fb-data.js first.');
    process.exit(1);
  }

  const vehicles = fbData.vehicles;
  console.log(`Total FB listings: ${vehicles.length}`);

  // ---- SMART TARGETING: pre-score with defaults, only scrape top candidates ----
  const fbMinPrice = {
    'RAV4': 3000, 'Corolla': 2500, 'Honda Fit': 2500, 'Vitz': 2500, 'Wish': 2500, 'Demio': 2500,
    'Aqua': 3500, 'Swift': 2500, 'Prius': 3000, 'Axela': 3000, 'Civic': 3000, 'Tiida': 2500
  };
  const eligible = vehicles.filter(v => {
    const minP = fbMinPrice[v.model] || 2500;
    if (v.price < minP || v.price > 8000) return false;
    if (v.year > 0 && v.year < 2005) return false;
    if (v.mileage > 0 && v.mileage > 160000) return false;
    if (v.isManual || v.isDealer) return false;
    return true;
  });

  // Pre-score with defaults to find best candidates
  const preScoreInput = eligible.map(v => ({
    ...v,
    year: v.year || 2008,
    mileage: v.mileage || 80000,
    location: v.location || 'Auckland',
    description: v.description || '',
    postedDate: v.postedDate || new Date().toISOString().split('T')[0],
    seller: v.seller || 'Private'
  }));

  const preScored = scoreVehicles(preScoreInput);
  preScored.sort((a, b) => (b.flipScore || 0) - (a.flipScore || 0));

  console.log(`Pre-scored: ${preScored.length} eligible → picking top candidates to scrape`);

  // Only scrape top 15 by flip score (not already enriched)
  const maxScrape = 15;
  const scrapeList = preScored
    .filter(v => !v.description || v.description.length < 30)  // skip already enriched
    .slice(0, maxScrape)
    .map(ps => vehicles.find(orig => orig.id === ps.id))       // map back to original objects
    .filter(Boolean);

  console.log(`Scraping: ${scrapeList.length} detail pages (top ${maxScrape} by pre-score)\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Set extra headers to look more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-NZ,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  });

  let updated = 0;
  let failed = 0;
  let blocked = 0;

  for (let i = 0; i < scrapeList.length; i++) {
    const vehicle = scrapeList[i];
    console.log(`[${i + 1}/${scrapeList.length}] ${vehicle.model} $${vehicle.price} (year:${vehicle.year || '?'})`);
    console.log(`  ${vehicle.listingUrl}`);

    const detail = await scrapeFbDetail(page, vehicle.listingUrl);

    if (!detail) {
      failed++;
      continue;
    }

    if (detail.blocked) {
      blocked++;
      if (blocked >= 3) {
        console.log('\n⛔ Too many blocks, FB is rate-limiting. Stopping.');
        break;
      }
      continue;
    }

    // Update vehicle data
    let changes = [];
    if (detail.year > 0 && vehicle.year === 0) {
      vehicle.year = detail.year;
      changes.push(`year:${detail.year}`);
    }
    if (detail.mileage > 0 && (vehicle.mileage === 0 || vehicle.mileage < 1000)) {
      vehicle.mileage = detail.mileage;
      changes.push(`${detail.mileage}km`);
    }
    if (detail.title && detail.title.length > 5) {
      vehicle.detailTitle = detail.title;
      changes.push('title');
    }
    if (detail.description && detail.description.length > 20) {
      vehicle.description = detail.description;
      changes.push('desc');
    }
    if (detail.location && !vehicle.location) {
      vehicle.location = detail.location;
      changes.push(`loc:${detail.location}`);
    }
    if (detail.sellerName) {
      vehicle.sellerName = detail.sellerName;
    }
    // Save flags
    if (detail.isManual) {
      vehicle.isManual = true;
      changes.push('⚙️MANUAL');
    }
    if (detail.isDealer) {
      vehicle.isDealer = true;
      changes.push('🏪DEALER');
    }

    if (changes.length > 0) {
      console.log(`  ✅ ${changes.join(' | ')}`);
      updated++;
    } else {
      console.log(`  ⚪ No new data extracted`);
    }

    // Longer delays for FB to avoid rate limiting
    await randomDelay(4000, 8000);
  }

  await browser.close();

  // Save enriched data
  fbData.enrichedDate = new Date().toISOString();
  fbData.enrichmentStats = { updated, failed, blocked, total: scrapeList.length };
  fs.writeFileSync(path.join(dataDir, 'fb_search_all.json'), JSON.stringify(fbData, null, 2));

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log(`Updated: ${updated} | Failed: ${failed} | Blocked: ${blocked}`);

  const withYear = vehicles.filter(v => v.year > 0);
  const pre2005 = withYear.filter(v => v.year < 2005);
  const post2005 = withYear.filter(v => v.year >= 2005);
  const highKm = vehicles.filter(v => v.mileage > 160000);
  const hasMech = vehicles.filter(v => hasMechanicalIssue(v.description));

  const manualCount = vehicles.filter(v => v.isManual).length;
  const dealerCount = vehicles.filter(v => v.isDealer).length;

  console.log(`\n📋 Data quality after enrichment:`);
  console.log(`  Year known: ${withYear.length}/${vehicles.length}`);
  console.log(`  Pre-2005 (exclude): ${pre2005.length}`);
  console.log(`  2005+ (keep): ${post2005.length}`);
  console.log(`  >160K km (exclude): ${highKm.length}`);
  console.log(`  Mechanical issues (exclude): ${hasMech.length}`);
  console.log(`  Manual transmission (exclude): ${manualCount}`);
  console.log(`  Dealer listings (exclude): ${dealerCount}`);
  console.log(`  Unknown year: ${vehicles.length - withYear.length}`);

  console.log(`\n💾 Saved: fb_search_all.json`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

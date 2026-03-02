/**
 * Fix TradeMe scraped data - post-processing
 * 1. Extract year from title (not page year)
 * 2. Clean location (remove "Member since" junk)
 * 3. Standardize postedDate to YYYY-MM-DD
 * 4. Re-scrape detail pages for better description
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay(min, max) { return delay(min + Math.random() * (max - min)); }

// Parse date like "01 February 2026" to "2026-02-01"
function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  const m = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (m) {
    const mon = months[m[2].toLowerCase().substring(0,3)] || '01';
    return `${m[3]}-${mon}-${m[1].padStart(2,'0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

// Clean location
function cleanLocation(loc) {
  if (!loc) return '';
  // Remove "Member since..." and "View seller..."
  let clean = loc.replace(/\s*Member since.*$/i, '').replace(/\s*View seller.*$/i, '').trim();
  return clean;
}

// Extract year from title like "2008 Toyota Corolla Gx"
function extractYearFromTitle(title) {
  const m = title.match(/(20\d{2}|19\d{2})/);
  return m ? parseInt(m[1]) : 0;
}

async function rescrapeDetails(browser, vehicle) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    await page.goto(vehicle.listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(1500, 3000);

    const data = await page.evaluate(() => {
      const body = document.body.innerText;

      // ---- Year ----
      let year = 0;
      // Look for "Year XXXX" pattern in key details
      const yearMatch = body.match(/Year\s*\n?\s*(20\d{2}|19\d{2})/i);
      if (yearMatch) year = parseInt(yearMatch[1]);

      // ---- Mileage ----
      let mileage = 0;
      const kmMatch = body.match(/(?:Odometer|Kilometres)\s*\n?\s*([\d,]+)\s*km/i);
      if (kmMatch) mileage = parseInt(kmMatch[1].replace(/,/g, ''));
      if (!mileage) {
        const kmMatch2 = body.match(/([\d,]+)\s*km/i);
        if (kmMatch2) mileage = parseInt(kmMatch2[1].replace(/,/g, ''));
      }

      // ---- Location ----
      let location = '';
      // TradeMe typically shows location near seller info
      const locPatterns = [
        /Located in\s+([^\n]+)/i,
        /Location\s*\n?\s*([^\n]+)/i,
      ];
      for (const pat of locPatterns) {
        const lm = body.match(pat);
        if (lm) { location = lm[1].trim(); break; }
      }
      // Fallback: find Auckland/Waikato mentions
      if (!location) {
        const cityMatch = body.match(/(Auckland City|North Shore|Manukau|Waitakere|Papakura|Franklin|Rodney|Albany|Henderson|Auckland|Hamilton|Waikato|Te Awamutu|Cambridge|Tauranga|Queenstown|Wellington|Christchurch|Palmerston North|Kapiti|Whakatane)/i);
        if (cityMatch) location = cityMatch[0];
      }

      // ---- Seller type ----
      let seller = '';
      if (body.match(/private\s+seller/i) || body.match(/private\s+sale/i)) {
        seller = 'Private';
      } else if (body.match(/dealer/i) || body.match(/licensed\s+motor/i)) {
        seller = 'Dealer';
      }

      // ---- Description ----
      let description = '';
      // Look for the listing description section
      // TradeMe typically has a description area after key details
      const allText = body;

      // Try to find description block - usually after "Description" heading
      const descMatch = allText.match(/Description\s*\n([\s\S]{20,2000}?)(?=\n\s*(?:Questions|Seller|Payment|Shipping|Pick up|Report|Share|Watch|$))/i);
      if (descMatch) {
        description = descMatch[1].trim();
      }

      // If no description found, look for longer text blocks
      if (!description || description.length < 20) {
        // Get all paragraphs that look like descriptions
        const paragraphs = [];
        const lines = allText.split('\n');
        let inDesc = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.toLowerCase() === 'description') {
            inDesc = true;
            continue;
          }
          if (inDesc && line.length > 15) {
            paragraphs.push(line);
          }
          if (inDesc && (line.toLowerCase().includes('questions') || line.toLowerCase().includes('seller information') || line.toLowerCase().includes('payment options'))) {
            break;
          }
        }
        if (paragraphs.length > 0) {
          description = paragraphs.join('\n');
        }
      }

      // ---- Posted Date ----
      let postedDate = '';
      const dateMatch = body.match(/Listed\s*\n?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
      if (dateMatch) postedDate = dateMatch[1];

      // ---- Transmission ----
      let transmission = '';
      const transMatch = body.match(/(?:Transmission|Gearbox)\s*\n?\s*(Automatic|Manual|CVT|Auto)/i);
      if (transMatch) transmission = transMatch[1];

      // ---- Engine ----
      let engine = '';
      const engMatch = body.match(/(?:Engine|Engine size)\s*\n?\s*([\d.]+\s*(?:cc|L))/i);
      if (engMatch) engine = engMatch[1];

      // ---- WOF ----
      let wof = '';
      const wofMatch = body.match(/(?:WOF|Warrant)\s*(?:expires?)?\s*\n?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
      if (wofMatch) wof = wofMatch[1];

      // ---- Registration ----
      let rego = '';
      const regoMatch = body.match(/(?:Rego|Registration)\s*(?:expires?)?\s*\n?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
      if (regoMatch) rego = regoMatch[1];

      return {
        year, mileage, location, seller, description: description.substring(0, 3000),
        postedDate, transmission, engine, wof, rego,
        bodySnippet: body.substring(0, 800)
      };
    });

    await page.close();
    return data;
  } catch (err) {
    console.log(`     ❌ Re-scrape error for ${vehicle.id}: ${err.message}`);
    await page.close();
    return null;
  }
}

async function main() {
  console.log('🔧 Fixing TradeMe data...\n');

  const dataDir = path.join(__dirname, '..', 'data');
  const srcFile = path.join(dataDir, 'vehicles_trademe_20260228.json');
  const raw = JSON.parse(fs.readFileSync(srcFile, 'utf8'));

  console.log(`Loaded ${raw.vehicles.length} vehicles\n`);
  console.log('Re-scraping detail pages for better data...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const fixed = [];

  for (const v of raw.vehicles) {
    console.log(`  Processing ${v.id}: ${v.title}`);

    // Re-scrape detail page
    const detail = await rescrapeDetails(browser, v);
    await randomDelay(2000, 4000);

    // Fix year - prefer detail page, fallback to title
    let year = (detail && detail.year > 1990 && detail.year < 2026) ? detail.year : extractYearFromTitle(v.title);

    // Fix mileage - prefer detail page value if reasonable
    let mileage = (detail && detail.mileage > 0) ? detail.mileage : v.mileage;

    // Fix location
    let location = (detail && detail.location) ? detail.location : cleanLocation(v.location);

    // Fix seller
    let seller = (detail && detail.seller) ? detail.seller : v.seller;

    // Fix description
    let description = (detail && detail.description && detail.description.length > 20)
      ? detail.description
      : v.description;

    // Add WOF/rego info to description if available
    if (detail) {
      const extras = [];
      if (detail.wof) extras.push(`WOF expires: ${detail.wof}`);
      if (detail.rego) extras.push(`Rego expires: ${detail.rego}`);
      if (detail.transmission) extras.push(`Transmission: ${detail.transmission}`);
      if (detail.engine) extras.push(`Engine: ${detail.engine}`);
      if (extras.length > 0) {
        description = description + '\n[Key details] ' + extras.join(' | ');
      }
    }

    // Fix postedDate
    let postedDate = (detail && detail.postedDate) ? parseDate(detail.postedDate) : parseDate(v.postedDate);

    const fixedVehicle = {
      ...v,
      year,
      mileage,
      location,
      seller,
      description,
      postedDate
    };

    console.log(`     → Year:${year} | ${mileage}km | ${location} | ${seller} | Posted:${postedDate}`);
    console.log(`     → Desc: ${description.substring(0, 80)}...`);
    fixed.push(fixedVehicle);
  }

  await browser.close();

  // Save fixed data
  const output = {
    ...raw,
    scrapeDate: new Date().toISOString(),
    vehicles: fixed
  };

  const outPath = path.join(dataDir, 'vehicles_trademe_20260228.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Fixed data saved: ${outPath}`);
  console.log(`   Total: ${fixed.length} vehicles`);

  // Quick summary
  console.log('\n📋 Fixed Summary:');
  fixed.forEach(v => {
    console.log(`   ${v.id} | ${v.year} ${v.model} | $${v.price} | ${v.mileage}km | ${v.location} | ${v.seller}`);
  });
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

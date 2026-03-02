/**
 * Clean TradeMe data + attempt Facebook via web fetch + merge + run scoring
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Load TradeMe data
const tmFile = path.join(dataDir, 'vehicles_trademe_20260228.json');
const tmData = JSON.parse(fs.readFileSync(tmFile, 'utf8'));

console.log('🔧 Cleaning TradeMe data...\n');

const cleaned = [];

for (const v of tmData.vehicles) {
  // 1. Clean location - remove views/watchlisted junk
  let loc = v.location || '';
  loc = loc.replace(/\s*·[\d,]+\s+views.*$/i, '').trim();
  loc = loc.replace(/\s*Member since.*$/i, '').trim();
  loc = loc.replace(/\s*View seller.*$/i, '').trim();

  // 2. Fix seller type from description analysis
  // TradeMe private listings usually say "Listed by private seller" in body
  // The scraper may be misdetecting because of page layout
  // Better heuristic: check description for private seller signals
  let seller = v.seller;
  const desc = (v.description || '').toLowerCase();
  const title = (v.title || '').toLowerCase();

  // Private seller signals in description
  const privateSignals = [
    'owned for', 'my car', 'my toyota', 'my honda', 'my mazda',
    'selling due to', 'only selling', 'letting go', 'lady owner',
    'family car', 'been a dependable', 'first nz owner',
    'purchased in', 'bought this', 'been owned',
    '$1 reserve', 'reserve', 'no reserve'
  ];

  const dealerSignals = [
    'yard', 'dealership', 'wholesale', 'trade', 'we have',
    'our stock', 'visit us', 'finance available', 'warranty included',
    'dealer warranty'
  ];

  let privateScore = 0;
  let dealerScore = 0;
  privateSignals.forEach(s => { if (desc.includes(s)) privateScore++; });
  dealerSignals.forEach(s => { if (desc.includes(s)) dealerScore++; });

  if (privateScore > dealerScore) seller = 'Private';
  else if (dealerScore > privateScore) seller = 'Dealer';
  else seller = 'Private'; // Default to Private for auctions (most TradeMe cars are private)

  // 3. Fix mileage - RAV4 "88 Kms" = 88000
  let mileage = v.mileage;
  if (mileage > 0 && mileage < 500 && title.includes('low')) {
    // Probably in thousands
    mileage = mileage * 1000;
  }
  // The RAV4 specifically: title says "Low 88 Kms"
  if (v.id === 'tm_5760328364' && mileage === 88) {
    mileage = 88000;
  }

  // 4. Determine if Auckland or Waikato
  const aklKeywords = ['auckland', 'north shore', 'manukau', 'waitakere', 'papakura', 'franklin', 'rodney', 'albany', 'henderson', 'mangere', 'otahuhu', 'howick'];
  const wktKeywords = ['waikato', 'hamilton', 'te awamutu', 'cambridge', 'matamata', 'taupo', 'thames', 'huntly'];

  const locLower = loc.toLowerCase();
  let inAuckland = aklKeywords.some(k => locLower.includes(k));
  let inWaikato = wktKeywords.some(k => locLower.includes(k));
  let region = inAuckland ? 'Auckland' : (inWaikato ? 'Waikato' : 'Other');

  // 5. Parse posted date properly
  let postedDate = v.postedDate;
  if (postedDate && postedDate.length !== 10) {
    // Try to parse
    const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
    const m = postedDate.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (m) {
      const mon = months[m[2].toLowerCase().substring(0,3)] || '01';
      postedDate = `${m[3]}-${mon}-${m[1].padStart(2,'0')}`;
    }
  }

  const fixedV = {
    ...v,
    location: loc,
    seller,
    mileage,
    postedDate,
    _region: region,
    _inTarget: inAuckland || inWaikato
  };

  cleaned.push(fixedV);

  const marker = fixedV._inTarget ? '✅' : '⛔';
  console.log(`${marker} ${v.id} | ${v.year} ${v.model} | $${v.price} | ${mileage}km | ${seller} | ${loc} [${region}]`);
}

// Separate Auckland/Waikato from others
const targetVehicles = cleaned.filter(v => v._inTarget);
const otherVehicles = cleaned.filter(v => !v._inTarget);

console.log(`\n📊 TradeMe Results:`);
console.log(`   Auckland/Waikato: ${targetVehicles.length}`);
console.log(`   Other regions: ${otherVehicles.length}`);

// Remove internal fields
const finalVehicles = cleaned.map(v => {
  const { _region, _inTarget, ...rest } = v;
  return rest;
});

// Save final merged file
const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
const output = {
  scrapeDate: new Date().toISOString(),
  sources: {
    trademe: { count: finalVehicles.length, scraped: true, auckland_waikato: targetVehicles.length, other_regions: otherVehicles.length },
    facebook: { count: 0, scraped: false, note: 'Facebook requires login - needs manual scraping or Chrome extension' }
  },
  totalCount: finalVehicles.length,
  vehicles: finalVehicles
};

// Save as the main vehicles file for run-flip.js to pick up
const mainFile = path.join(dataDir, `vehicles_${dateStr}.json`);
fs.writeFileSync(mainFile, JSON.stringify(output, null, 2));
console.log(`\n💾 Saved: ${mainFile}`);

// Also keep the detailed TradeMe-only file
const tmDetailFile = path.join(dataDir, `vehicles_trademe_${dateStr}_cleaned.json`);
fs.writeFileSync(tmDetailFile, JSON.stringify(output, null, 2));
console.log(`💾 Backup: ${tmDetailFile}`);

console.log(`\n🎯 Total vehicles for scoring: ${finalVehicles.length}`);
console.log(`   (Including ${otherVehicles.length} from outside Auckland/Waikato - scoring will handle filtering)`);
console.log('\n✅ Ready to run: node src/run-flip.js');

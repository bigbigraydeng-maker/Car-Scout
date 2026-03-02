/**
 * Build Facebook data from search page extractions
 * Then visit top candidates' detail pages via Puppeteer for full info
 */
const fs = require('fs');
const path = require('path');

// All listings collected from Facebook Marketplace search pages
const rawListings = `
fb_1298964372288821|4500|0|Corolla
fb_934624399123030|4850|2008|Corolla
fb_4517915568484583|4700|0|Corolla
fb_1121152100089663|3800|2000|Corolla
fb_2416233108877328|5000|0|Corolla
fb_26363820233222772|4950|0|Corolla
fb_1453557432790630|4200|0|Corolla
fb_914814861256156|2150|0|Corolla
fb_2193385931192567|3700|0|Corolla
fb_1651128239244674|3800|0|Corolla
fb_1194741956135821|4500|0|Corolla
fb_1425943525812337|4000|0|Corolla
fb_2033160207478269|3500|0|Corolla
fb_914478637721556|3100|0|Corolla
fb_2265106050969783|2000|0|Corolla
fb_913414931646337|2250|0|Corolla
fb_2336388303538519|4900|0|Corolla
fb_902757019288503|3500|0|Corolla
fb_988397347693867|3500|0|Corolla
fb_949621647632319|2650|0|Corolla
fb_1459383725913531|3400|0|Corolla
fb_789834726811091|2850|0|Corolla
fb_851311424607893|4990|0|Corolla
fb_860252013395872|5000|0|Corolla
fb_1948453912453469|3950|0|Vitz
fb_1656009735558232|3800|0|Vitz
fb_1224269869029259|3500|0|Vitz
fb_1866245587389368|3800|0|Vitz
fb_1597815661528320|4500|0|Vitz
fb_890882133790041|4200|0|Vitz
fb_1487752453078360|2500|0|Vitz
fb_906215222029025|2700|0|Vitz
fb_1877414756216276|3400|2007|Vitz
fb_2138835280267623|4900|0|Vitz
fb_1227219426290226|3550|0|Vitz
fb_1560517028343380|3800|0|Vitz
fb_904579235701331|3500|0|Vitz
fb_1984933532399906|3500|0|Vitz
fb_26059544326972272|4800|0|Vitz
fb_914478637721556|3100|0|Vitz
fb_1231777732259337|4950|2008|Vitz
fb_2033600204064912|4200|0|Vitz
fb_1266709548782831|3200|0|Vitz
fb_4230954050552326|3400|0|Vitz
fb_1566651847935074|3100|2002|Vitz
fb_3885449941759063|4999|0|Vitz
fb_1551385385921526|3000|0|Vitz
fb_832946969101905|5000|0|Vitz
fb_2067280204060378|3499|0|Vitz
fb_4197649737162272|4750|0|Vitz
fb_1216388167313135|3500|0|Vitz
fb_1449740576750446|2800|2000|Vitz
fb_867472472298790|3000|0|Vitz
fb_2762867130724691|4800|0|Vitz
fb_2367647657035684|4100|0|Vitz
fb_1555010372219946|4500|0|Wish
fb_817202511388939|3800|2003|Wish
fb_4286016571713817|3800|0|Wish
fb_2719988025006464|4500|0|Wish
fb_4368736670110601|4600|0|Wish
fb_926338716758755|3750|0|Wish
fb_904993308776677|4500|0|Wish
fb_906980671713088|4800|0|Wish
fb_1077603304549576|4800|0|Wish
fb_1957873531820952|3500|0|Wish
fb_1389723919525335|0|0|Wish
fb_955149397079197|4000|0|Wish
fb_903948689043693|3000|0|Wish
fb_1638928960798471|5000|0|Wish
fb_1607541463714788|4700|0|Wish
fb_26627310576870149|4500|2009|Wish
fb_1606702653809248|4150|0|Wish
fb_1235318594689975|4000|0|Wish
fb_843745472021864|4950|0|Wish
fb_750329114727003|3850|0|Wish
fb_1385603446696554|3000|0|Wish
fb_1953797835257776|3600|0|Wish
fb_1615689579449539|3850|0|Wish
fb_907300975545174|4200|0|RAV4
fb_1600796861336642|4000|0|RAV4
fb_790930597278692|3200|0|RAV4
fb_1553305119283711|2200|0|RAV4
fb_1401324788210474|5000|0|RAV4
fb_875502271713019|4500|0|RAV4
fb_2399141770523374|3950|0|RAV4
fb_772967951779752|5000|0|RAV4
fb_4160955097486570|3000|0|RAV4
fb_1897508901180783|4500|0|RAV4
fb_900424522633905|2900|1999|RAV4
fb_1373814154213492|4500|1994|RAV4
fb_1194837212179608|6500|2006|RAV4
fb_891497767026640|2500|2002|RAV4
fb_4076660095928731|2850|2008|RAV4
fb_680272505097832|4000|0|RAV4
fb_684288104365346|4000|1999|RAV4
fb_1861337247853035|4300|0|RAV4
fb_1091706019795652|2200|0|RAV4
fb_1450335862751210|5000|0|RAV4
fb_2362570600804679|2999|0|RAV4
fb_908811398472315|5000|0|RAV4
fb_1513134756400747|3200|0|RAV4
fb_1484194899791970|2200|0|RAV4
fb_846475264515681|3000|2025|RAV4
fb_25329104020108417|3800|0|RAV4
fb_913004387783628|4950|0|RAV4
fb_2073796486703553|5000|0|RAV4
fb_33290180997295286|4600|2020|RAV4
fb_932514785874775|3650|0|RAV4
fb_1622123752260333|3900|0|Honda Fit
fb_962823526068618|4750|0|Honda Fit
fb_3062389767295673|4300|0|Honda Fit
fb_1402334787849939|3950|0|Honda Fit
fb_1280710590630574|3850|0|Honda Fit
fb_986216423830980|3900|0|Honda Fit
fb_937657142542915|4500|0|Honda Fit
fb_1578987603209661|3950|0|Honda Fit
fb_816441021462858|3500|0|Honda Fit
fb_1470037784750653|2500|0|Honda Fit
fb_1267455125327220|3650|0|Honda Fit
fb_878316575205191|4800|0|Honda Fit
fb_1232124539130169|3700|0|Honda Fit
fb_1708627130109812|4100|2009|Honda Fit
fb_26492102970387763|2250|0|Honda Fit
fb_1294906012458391|3300|0|Honda Fit
fb_1960352327882138|4300|0|Honda Fit
fb_2496172280780545|4500|0|Honda Fit
fb_925555653748664|4900|0|Honda Fit
fb_27092224693711120|2800|0|Honda Fit
fb_1210808281034230|4800|2008|Honda Fit
fb_1409910100260611|3950|0|Honda Fit
fb_1330375945780560|4700|0|Honda Fit
fb_820885250784866|4750|0|Honda Fit
fb_1221033423267484|4000|0|Honda Fit
fb_1241854037480624|4700|0|Honda Fit
fb_1300791648744630|3500|0|Honda Fit
fb_25843982851938804|4000|0|Demio
fb_1257831546308983|3500|0|Demio
fb_885341027462098|3800|0|Demio
fb_894888843471038|4000|0|Demio
fb_25975564795435498|4199|0|Demio
fb_1620742345841896|4900|0|Demio
fb_776110285567639|4800|0|Demio
fb_1458033955919351|5000|0|Demio
fb_2364000547371120|3800|0|Demio
fb_2176833109789522|4799|0|Demio
fb_2113919679367102|3800|0|Demio
fb_1897774680889162|4300|0|Demio
fb_1982916732620928|2500|0|Demio
fb_1583408829581508|3700|0|Demio
fb_1637888780725534|4500|0|Demio
fb_766341369515399|2950|0|Demio
fb_4158839007711124|5000|0|Demio
fb_25673259409012174|4200|0|Demio
fb_1603405477451156|2450|0|Demio
fb_1358428086054643|2500|0|Demio
fb_1270714474927692|3199|0|Demio
fb_815689881552977|3500|2012|Demio
fb_2034069753831135|5000|0|Demio
fb_1150714450350476|4500|0|Demio
fb_1365715788209992|4200|0|Demio
fb_1221554909452751|3850|2007|Demio
fb_1122681666580507|5000|0|Demio
fb_1081598050831132|3200|0|Demio
fb_838889619185351|3000|0|Demio
fb_3488904607958575|3500|0|Demio
`.trim();

// Parse raw data
const allFb = [];
const seen = new Set();
rawListings.split('\n').forEach(line => {
  const [id, priceStr, yearStr, model] = line.trim().split('|');
  if (!id || seen.has(id)) return;
  seen.add(id);
  const price = parseInt(priceStr) || 0;
  const year = parseInt(yearStr) || 0;
  const itemId = id.replace('fb_', '');

  allFb.push({
    id,
    title: `${model} (Facebook)`,
    model,
    year,
    price,
    mileage: 0, // Unknown from search page
    location: 'Auckland',
    seller: 'Private', // Facebook is mostly private
    description: '',
    listingUrl: `https://www.facebook.com/marketplace/item/${itemId}/`,
    platform: 'facebook',
    postedDate: new Date().toISOString().split('T')[0]
  });
});

console.log(`Total FB listings parsed: ${allFb.length}`);

// Select TOP candidates for detail page visits
// Priority: lower price = higher flip potential
// Filter out obviously old cars (year < 2005 if known) and price=0
const candidates = allFb
  .filter(v => v.price >= 2000 && v.price <= 5000)
  .filter(v => v.year === 0 || v.year >= 2005) // year=0 means unknown, keep it
  .sort((a, b) => a.price - b.price); // cheapest first

console.log(`Candidates for detail scraping: ${candidates.length}`);

// Pick top 25 by lowest price (most flip potential)
const top25 = candidates.slice(0, 25);
console.log('\nTop 25 for detail scraping:');
top25.forEach((v, i) => {
  console.log(`  ${i+1}. ${v.id} | ${v.model} | $${v.price} | year:${v.year || '?'}`);
});

// Save the URL list for detail scraping
const urlList = top25.map(v => v.listingUrl);
const dataDir = path.join(__dirname, '..', 'data');
fs.writeFileSync(path.join(dataDir, 'fb_detail_urls.json'), JSON.stringify(urlList, null, 2));

// Also save ALL facebook basic data
fs.writeFileSync(path.join(dataDir, 'fb_search_all.json'), JSON.stringify({
  scrapeDate: new Date().toISOString(),
  totalCount: allFb.length,
  vehicles: allFb
}, null, 2));

console.log(`\nSaved: fb_detail_urls.json (${urlList.length} URLs)`);
console.log(`Saved: fb_search_all.json (${allFb.length} vehicles)`);

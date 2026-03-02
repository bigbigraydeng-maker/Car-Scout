/**
 * Run flip scoring on latest data and generate report
 */
const fs = require('fs');
const path = require('path');
const { scoreVehicles } = require('./scoring');
const { generateReport, generateShortReport } = require('./report');

const dataDir = path.join(__dirname, '..', 'data');

// Find latest vehicles file (only YYYYMMDD format, skip _real/_full variants)
const files = fs.readdirSync(dataDir)
  .filter(f => /^vehicles_\d{8}\.json$/.test(f))
  .sort()
  .reverse();

if (files.length === 0) {
  console.error('No vehicle data files found');
  process.exit(1);
}

const latestFile = files[0];
console.log('Loading:', latestFile);

// Extract date from filename for output paths
const dateMatch = latestFile.match(/(\d{8})/);
const dateStr = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0].replace(/-/g, '');

const data = JSON.parse(fs.readFileSync(path.join(dataDir, latestFile), 'utf8'));
console.log('Input vehicles:', data.vehicles.length);

// Score
const scored = scoreVehicles(data.vehicles);
console.log('Qualified after flip filter:', scored.length);

scored.forEach(function(v, i) {
  console.log('  ' + v.flipGrade + ' | ' + v.year + ' ' + v.model +
    ' | $' + v.price + ' | profit $' + v.estimatedNetProfit +
    ' (' + v.profitMargin + '%) | turnover ' + v.turnoverGrade +
    ' | flip ' + v.flipScore);
});

// Save scored data
const scoredPath = path.join(dataDir, `scored_${dateStr}_flip.json`);
fs.writeFileSync(scoredPath, JSON.stringify({
  scoredDate: new Date().toISOString(),
  version: '3.0-flip',
  totalScanned: data.vehicles.length,
  totalQualified: scored.length,
  vehicles: scored
}, null, 2));
console.log('Saved:', scoredPath);

// Generate reports
const fullReport = generateReport(scored);
const shortReport = generateShortReport(scored);

const fullPath = path.join(dataDir, `report_${dateStr}_flip_full.md`);
const shortPath = path.join(dataDir, `report_${dateStr}_flip_short.md`);
fs.writeFileSync(fullPath, fullReport);
fs.writeFileSync(shortPath, shortReport);

console.log('\n========== SHORT REPORT ==========');
console.log(shortReport);
console.log('\n========== FULL REPORT ==========');
console.log(fullReport);

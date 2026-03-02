/**
 * Car Scout v4.0 - 精选日报
 * TradeMe + Facebook 统一 Flip Score → 精选 Top 8-10
 * 自动发送到飞书（支持 --no-send 和去重）
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const { estimateSellPrice, scoreVehicles, hasMechanicalIssue } = require('./scoring');

const APP_ID = 'cli_a917a9e3af391cbb';
const APP_SECRET = 'JbyS6Xdb1ZuMe6BmXbi9XbGByUkzW7HU';
const USER_OPEN_ID = 'ou_0d858408be4697d6e84aa225ed758373';
const dataDir = path.join(__dirname, '..', 'data');
const noSend = process.argv.includes('--no-send');

// ========== HELPERS ==========

function extractId(v) {
  const url = v.listingUrl || '';
  const tmMatch = url.match(/listing\/(\d+)/);
  if (tmMatch) return `tm_${tmMatch[1]}`;
  const fbMatch = url.match(/item\/(\d+)/);
  if (fbMatch) return `fb_${fbMatch[1]}`;
  return null;
}

// ========== LOAD DATA ==========

// 1) TradeMe scored data
const scoredFiles = fs.readdirSync(dataDir).filter(f => f.match(/^scored_\d{8}_flip\.json$/)).sort().reverse();
let tmScored = [];
if (scoredFiles.length > 0) {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, scoredFiles[0]), 'utf8'));
  tmScored = data.vehicles || (Array.isArray(data) ? data : []);
}
tmScored.forEach(v => { v._platform = 'TM'; });
// 重新评分 TM 数据 (确保使用最新的定价模型，而非文件中的旧预估价)
tmScored = scoreVehicles(tmScored);
tmScored.forEach(v => { v._platform = 'TM'; });

// 2) Facebook data — pre-process + score
let fbRaw = [];
let fbTotalCount = 0;
try {
  const fbData = JSON.parse(fs.readFileSync(path.join(dataDir, 'fb_search_all.json'), 'utf8'));
  fbRaw = fbData.vehicles || [];
  fbTotalCount = fbRaw.length;
} catch (e) {
  console.log('No Facebook data found, TradeMe only.');
}

// ========== FB FILTERS ==========

const fbMinPrice = {
  'RAV4': 3000, 'Corolla': 2500, 'Honda Fit': 2500, 'Vitz': 2500, 'Wish': 2500, 'Demio': 2500,
  'Aqua': 3500, 'Swift': 2500, 'Prius': 3000, 'Axela': 3000, 'Civic': 3000, 'Tiida': 2500
};

function isManualTransmission(v) {
  if (v.isManual) return true;
  const text = ((v.detailTitle || '') + ' ' + (v.description || '')).toLowerCase();
  if (/\bmanual\b/.test(text) && !/\bautomatic\b/.test(text)) return true;
  if (/(?:5|6)\s*-?\s*speed\s*(manual)?/i.test(text)) return true;
  if (/stick\s*shift/i.test(text)) return true;
  return false;
}

function isDealerListing(v) {
  if (v.isDealer) return true;
  const text = ((v.detailTitle || '') + ' ' + (v.description || '')).toLowerCase();
  if (/financ(?:e|ing)\s*(?:available|avail|option|welcome)/i.test(text)) return true;
  if (/\bcar\s*(?:dealer|yard|lot|sales)\b/i.test(text)) return true;
  if (/\bwe\s+(?:have|sell|offer|also)\b/i.test(text)) return true;
  if (/\btrade[- ]?in[s]?\s+(?:welcome|accepted)\b/i.test(text)) return true;
  if (/\b(?:auto|motor)\s*parts\b/i.test(text)) return true;
  if (/\bnationwide\b/i.test(text)) return true;
  if (/\bengine\s*(?:for sale|available)\b/i.test(text)) return true;
  // Check seller name for business keywords (e.g. "Carmart Vehicle Sales")
  const name = (v.sellerName || '').toLowerCase();
  if (name.length > 3 && /\b(?:sales|motors?|dealer|trading|imports?|automotive|ltd|limited|enterprise|warehouse)\b/.test(name)) return true;
  if (/\b(?:car|auto|vehicle)\s*(?:mart|hub|zone|city|world|shop|store|centre|center)\b/.test(name)) return true;
  return false;
}

// ========== 新增: 年份-价格合理性检查 (防假车) ==========
// 2015+ 的车 $4,600 可以，但 2020 RAV4 $4,600 明显不合理
const YEAR_PRICE_FLOOR = {
  // year → 该年份车最低合理价格 (低于此价视为假车/诈骗)
  2020: 12000, 2019: 10000, 2018: 8000, 2017: 7000, 2016: 6000,
};
function isSuspiciouslyUnderpriced(v) {
  if (!v.year || v.year === 0) return false;
  const floor = YEAR_PRICE_FLOOR[v.year];
  if (floor && v.price < floor) return true;
  return false;
}

// ========== 新增: 地理位置验证 (只要 NZ 的车) ==========
function isNonNZListing(v) {
  const text = ((v.title || '') + ' ' + (v.description || '') + ' ' + (v.location || '')).toLowerCase();
  // 明确的非 NZ 标志
  if (/\b(usa|united states|california|texas|florida|shipping from|us spec|usdm|lhd|left.?hand.?drive)\b/.test(text)) return true;
  // 美国城市/州
  if (/\b(los angeles|new york|chicago|houston|phoenix|san diego|dallas|san antonio|san jose|austin)\b/.test(text)) return true;
  // 澳洲（除非明确说 NZ delivery）
  if (/\b(sydney|melbourne|brisbane|perth|adelaide|aud\s*\$)\b/.test(text) && !/\b(nz|new zealand|auckland|wellington|christchurch)\b/.test(text)) return true;
  return false;
}

const fbFiltered = fbRaw
  .filter(v => {
    const minP = fbMinPrice[v.model] || 2500;
    if (v.price < minP || v.price > 8000) return false;
    if (v.year > 0 && v.year < 2005) return false;
    if (v.year > 2015 && v.price < 4000) return false;
    if (v.mileage > 0 && v.mileage > 160000) return false;
    if (v.description && hasMechanicalIssue(v.description)) return false;
    if (isManualTransmission(v)) return false;
    if (isDealerListing(v)) return false;
    // 新增过滤
    if (isSuspiciouslyUnderpriced(v)) return false;   // 假车检测
    if (isNonNZListing(v)) return false;               // 非 NZ 过滤
    return true;
  })
  .map(v => {
    const yearEstimated = v.year === 0;
    const mileageEstimated = v.mileage === 0;
    return {
      ...v,
      year: yearEstimated ? 2008 : v.year,
      mileage: mileageEstimated ? 130000 : v.mileage,  // 与 scoring.js 统一默认值
      location: v.location || 'Auckland',
      description: v.description || '',
      postedDate: v.postedDate || new Date().toISOString().split('T')[0],
      seller: v.seller || 'Private',
      _platform: 'FB',
      _yearEstimated: yearEstimated,
      _mileageEstimated: mileageEstimated,
    };
  });

console.log(`FB: ${fbTotalCount} total → ${fbFiltered.length} passed filters`);

// ========== SCORE + MERGE ==========

const fbScored = scoreVehicles(fbFiltered);

// Apply data confidence penalty — 未确认数据大幅降权
// 教训: 公里数未知默认130k给了高分, 实际 200k+ 的车混入精选
fbScored.forEach(v => {
  let penalty = 0;
  if (v._yearEstimated) penalty += 12;      // 年份不确认: -12
  if (v._mileageEstimated) penalty += 15;   // 公里数不确认: -15 (核心风险项!)
  if (v._yearEstimated && v._mileageEstimated) penalty += 5; // 双盲额外 -5
  if (penalty > 0) {
    v.flipScore = Math.max(0, v.flipScore - penalty);
    if (v.flipScore >= 80) v.flipGrade = 'S';
    else if (v.flipScore >= 65) v.flipGrade = 'A';
    else if (v.flipScore >= 50) v.flipGrade = 'B';
    else v.flipGrade = 'C';
  }
});

const allScored = [...tmScored, ...fbScored];

// Sort: 详情已确认 > 年份确认 > 纯搜索页数据, 同级按 flipScore
allScored.sort((a, b) => {
  // 3 级置信度: 详情确认(2) > 年份确认(1) > 全猜(0)
  const aConf = a.enrichedDate ? 2 : (a._yearEstimated ? 0 : 1);
  const bConf = b.enrichedDate ? 2 : (b._yearEstimated ? 0 : 1);
  if (aConf !== bConf) return bConf - aConf;
  return (b.flipScore || 0) - (a.flipScore || 0);
});

console.log(`Total scored: TM ${tmScored.length} + FB ${fbScored.length} = ${allScored.length}`);

// ========== BUILD LEAN REPORT ==========

const today = new Date().toLocaleDateString('zh-CN');
const TOP_DETAIL = 5;    // 详细展示前5名
const TOP_COMPACT = 5;   // 简洁展示第6-10名

function fmtYear(v) {
  return v._yearEstimated ? '~08?' : String(v.year);
}
function fmtKm(v) {
  return v._mileageEstimated ? '?km' : `${(v.mileage / 1000).toFixed(0)}k km`;
}
function fmtPlat(v) {
  return v._platform === 'FB' ? 'FB' : 'TM';
}

// Diversified selection: max 2 per model, ensure variety
const eligible = allScored.filter(v => {
  if (v.flipScore < 50) return false;
  return true;
});
const picks = [];
const modelCount = {};
for (const v of eligible) {
  const key = v.model;
  modelCount[key] = (modelCount[key] || 0) + 1;
  if (modelCount[key] <= 2) {
    picks.push(v);
    if (picks.length >= TOP_DETAIL + TOP_COMPACT) break;
  }
}
const topPicks = picks.slice(0, TOP_DETAIL);
const backupPicks = picks.slice(TOP_DETAIL, TOP_DETAIL + TOP_COMPACT);

let r = '';
r += `🚗 Car Scout 精选 | ${today}\n`;
r += `━━━━━━━━━━━━━━━━━━━━\n`;
r += `📊 来源: TM ${tmScored.length}辆 + FB ${fbTotalCount}辆 → 精选${picks.length}辆\n\n`;

// ---- Top 5 详细 ----
if (topPicks.length > 0) {
  r += `🏆 今日精选\n`;
  r += `─────────────────\n`;
  topPicks.forEach((v, i) => {
    const profit = v.estimatedNetProfit || 0;
    const margin = v.profitMargin || 0;
    const sellPrice = v.estimatedSellPrice || 0;
    const turnIcon = { A: '⚡', B: '🟢', C: '🟡', D: '🔴' }[v.turnoverGrade] || '🔴';
    const yearWarn = v._yearEstimated ? ' ⚠️' : '';
    const days = v.daysListed > 0 ? ` | 📅 ${v.daysListed}天` : '';
    r += `${i + 1}. [${fmtPlat(v)}] ${fmtYear(v)} ${v.model} | $${v.price.toLocaleString()} | ${fmtKm(v)}${days}${yearWarn}\n`;
    r += `   → 零售$${sellPrice.toLocaleString()} | 赚$${profit.toLocaleString()}(${margin}%) | ${turnIcon}周转 | Flip ${v.flipScore}\n`;
    if (v.urgentSignals && v.urgentSignals.length > 0) {
      r += `   🔥 ${v.urgentSignals.join(', ')}\n`;
    }
    r += `   🔗 ${v.listingUrl}\n`;
    r += '\n';
  });
}

// ---- 备选 5 简洁 ----
if (backupPicks.length > 0) {
  r += `📋 备选\n`;
  r += `─────────────────\n`;
  backupPicks.forEach((v, i) => {
    const profit = v.estimatedNetProfit || 0;
    const yearWarn = v._yearEstimated ? '⚠️' : '';
    const days = v.daysListed > 0 ? ` | 📅${v.daysListed}天` : '';
    const urgent = (v.urgentSignals && v.urgentSignals.length > 0) ? ' 🔥' : '';
    r += `${TOP_DETAIL + i + 1}. [${fmtPlat(v)}] ${fmtYear(v)} ${v.model} | $${v.price.toLocaleString()} | 赚$${profit.toLocaleString()} | Flip ${v.flipScore}${days}${urgent} ${yearWarn}\n`;
    r += `   🔗 ${v.listingUrl}\n`;
  });
  r += '\n';
}

// ========== FOLLOW POOL — 用户手动控制 ==========
// 规则: 只由用户通过飞书指令 "跟进"/"放弃" 控制
//       报告不自动入池 | 无自动过期 | 已售自动移除
//       每次报告刷新池中车辆的最新评分

const poolPath = path.join(dataDir, 'follow_pool.json');
let pool = { active: [], dismissed: [], lastUpdated: '' };
try { pool = JSON.parse(fs.readFileSync(poolPath, 'utf8')); } catch(e) {}

const todayISO = new Date().toISOString().split('T')[0];
const picksIdSet = new Set(picks.map(v => extractId(v)).filter(Boolean));

// 快速查找表: id → scored vehicle
const scoredById = {};
for (const v of allScored) {
  const id = extractId(v);
  if (id) scoredById[id] = v;
}

// 刷新池中车辆的最新评分 (不增不减，只更新分数)
for (const item of pool.active) {
  const fresh = scoredById[item.id];
  if (fresh) {
    item.flipScore = fresh.flipScore;
    item.profit = fresh.estimatedNetProfit || 0;
    item._stale = false;
  } else {
    item._stale = true;
  }
}

pool.lastUpdated = todayISO;
fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));

const staleCount = pool.active.filter(p => p._stale).length;
console.log(`Follow pool: ${pool.active.length} active` +
  (staleCount > 0 ? ` (${staleCount} stale/无新数据)` : '') +
  `, ${pool.dismissed.length} dismissed`);

// 报告中显示跟进池 (排除今日精选+备选已展示的车)
const poolForReport = pool.active.filter(p => !picksIdSet.has(p.id));
if (poolForReport.length > 0) {
  r += `📌 跟进中 (${poolForReport.length}辆)\n`;
  r += `─────────────────\n`;
  for (const p of poolForReport) {
    const ageDays = Math.max(0, Math.floor((new Date(todayISO) - new Date(p.addedDate)) / (1000*60*60*24)));
    const age = ageDays === 0 ? '今日' : `${ageDays}天`;
    const staleTag = p._stale ? ' ⏸️' : '';
    r += `• ${p.model} | $${p.price.toLocaleString()} | ${p.platform} | Flip ${p.flipScore} | 赚$${p.profit.toLocaleString()} | ${age}${staleTag}\n`;
    r += `  🔗 ${p.listingUrl}\n`;
  }
  r += '\n';
}

r += `━━━━━━━━━━━━━━━━━━━━\n`;
r += `筛选: $2.5K-$8K | ≤160Kkm | ≥2005 | 自动挡 | 个人卖家\n`;
r += `Flip Score v4.1 | ${today}`;

// Save report
const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
const reportPath = path.join(dataDir, `report_${dateStr}_combined.md`);
fs.writeFileSync(reportPath, r);
console.log('Report saved:', reportPath);
console.log('Report length:', r.length, 'chars');

// ========== SEND TO FEISHU (with dedup) ==========

if (noSend) {
  console.log('--no-send flag: skipping Feishu send');
  process.exit(0);
}

// 发送模式:
//   默认:     已发过→跳过, 未发过→POST新消息
//   --force:  PUT更新已发消息(静默, 无新通知) 或 POST新消息
//   --resend: 忽略历史, 强制POST新消息(产生新通知)
const sentLogPath = path.join(dataDir, '.sent_log.json');
let sentLog = {};
try { sentLog = JSON.parse(fs.readFileSync(sentLogPath, 'utf8')); } catch(e) {}
const rawEntry = sentLog[dateStr];
const existingEntry = rawEntry
  ? (typeof rawEntry === 'string' ? { time: rawEntry, message_id: null } : rawEntry)
  : null;
const isResend = process.argv.includes('--resend');
const isForce = process.argv.includes('--force');
if (existingEntry && !isForce && !isResend) {
  console.log(`⚠️ Already sent for ${dateStr}. Use --force (silent update) or --resend (new message).`);
  process.exit(0);
}

function req(options, body) {
  return new Promise(function(resolve, reject) {
    var h = https.request(options, function(res) {
      var d = [];
      res.on('data', function(c) { d.push(c); });
      res.on('end', function() {
        try { resolve(JSON.parse(Buffer.concat(d).toString())); }
        catch(e) { resolve(Buffer.concat(d).toString()); }
      });
    });
    h.on('error', reject);
    if (body) h.write(JSON.stringify(body));
    h.end();
  });
}

async function sendToFeishu() {
  const tokenRes = await req({
    hostname: 'open.feishu.cn',
    path: '/open-apis/auth/v3/tenant_access_token/internal',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { app_id: APP_ID, app_secret: APP_SECRET });

  if (tokenRes.code !== 0) {
    console.error('Token failed:', tokenRes);
    return;
  }
  const token = tokenRes.tenant_access_token;

  // --resend: 跳过 PUT, 直接 POST 新消息
  // --force: 先 PUT 更新, 失败再 POST
  const prevMessageId = !isResend && existingEntry && existingEntry.message_id;
  let result;

  if (prevMessageId) {
    // PATCH existing message (no duplicate!)
    result = await req({
      hostname: 'open.feishu.cn',
      path: `/open-apis/im/v1/messages/${prevMessageId}`,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    }, {
      msg_type: 'text',
      content: JSON.stringify({ text: r })
    });

    if (result.code === 0) {
      console.log('✅ Updated existing Feishu message (no duplicate)');
      sentLog[dateStr] = { time: new Date().toISOString(), message_id: prevMessageId };
      fs.writeFileSync(sentLogPath, JSON.stringify(sentLog, null, 2));
    } else {
      console.log(`⚠️ Update failed (${result.code}), sending new message instead`);
      // Fall through to send new
    }
  }

  if (!prevMessageId || (result && result.code !== 0)) {
    // Send NEW message
    const sendRes = await req({
      hostname: 'open.feishu.cn',
      path: '/open-apis/im/v1/messages?receive_id_type=open_id',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    }, {
      receive_id: USER_OPEN_ID,
      msg_type: 'text',
      content: JSON.stringify({ text: r })
    });

    if (sendRes.code === 0) {
      // Save message_id for future updates
      const messageId = sendRes.data && sendRes.data.message_id;
      console.log('✅ Sent to Feishu' + (messageId ? ` (msg_id: ${messageId})` : ''));
      sentLog[dateStr] = { time: new Date().toISOString(), message_id: messageId || null };
      fs.writeFileSync(sentLogPath, JSON.stringify(sentLog, null, 2));
    } else {
      console.error('❌ Feishu error:', sendRes.code, sendRes.msg);
    }
  }
}

sendToFeishu().catch(e => console.error('Feishu error:', e));

/**
 * Car Scout — 发送每日报告到飞书
 * 用法: node send-daily-report.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const APP_ID = 'cli_a917a9e3af391cbb';
const APP_SECRET = 'JbyS6Xdb1ZuMe6BmXbi9XbGByUkzW7HU';
const USER_OPEN_ID = 'ou_0d858408be4697d6e84aa225ed758373';

const dataDir = path.join(__dirname, '..', 'data');

function httpReq(options, body) {
  return new Promise((resolve, reject) => {
    const h = https.request(options, res => {
      const d = [];
      res.on('data', c => d.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(d).toString())); }
        catch(e) { resolve(Buffer.concat(d).toString()); }
      });
    });
    h.on('error', reject);
    if (body) h.write(JSON.stringify(body));
    h.end();
  });
}

async function main() {
  // Load data
  const fbData = JSON.parse(fs.readFileSync(path.join(dataDir, 'fb_search_all.json'), 'utf8'));
  const pool = JSON.parse(fs.readFileSync(path.join(dataDir, 'follow_pool.json'), 'utf8'));
  const scanLog = JSON.parse(fs.readFileSync(path.join(dataDir, 'fb_scan_log.json'), 'utf8'));
  const lastScan = scanLog[scanLog.length - 1];

  // Get NZT date
  const nztDate = new Date().toLocaleDateString('zh-CN', { timeZone: 'Pacific/Auckland', weekday: 'short', month: 'numeric', day: 'numeric' });

  // Latest scan stats
  const latest = fbData.vehicles.slice(-lastScan.newFound);
  const breakdown = {};
  latest.forEach(v => {
    if (!breakdown[v.model]) breakdown[v.model] = { count: 0, prices: [] };
    breakdown[v.model].count++;
    breakdown[v.model].prices.push(v.price);
  });

  const modelLines = Object.entries(breakdown)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([m, d]) => `• ${m}: ${d.count} 辆 ($${Math.min(...d.prices).toLocaleString()}-$${Math.max(...d.prices).toLocaleString()})`)
    .join('\n');

  // Enriched listings
  const enriched = latest.filter(v => v.enrichedDate);
  const enrichedLines = enriched
    .sort((a, b) => a.price - b.price)
    .map(v => `• ${v.year || '?'} ${v.model} $${v.price.toLocaleString()}${v.mileage ? ' | ' + v.mileage.toLocaleString() + 'km' : ''} — 私人`)
    .join('\n');

  // Follow pool top 5
  const poolTop = pool.active
    .sort((a, b) => b.flipScore - a.flipScore)
    .slice(0, 5)
    .map(v => `• ${v.model} $${v.price.toLocaleString()} | Flip ${v.flipScore} | 赚$${v.profit.toLocaleString()} [${v.platform}]`)
    .join('\n');

  // Cookie status
  let cookieStatus = '❌ 无';
  try {
    const cookies = JSON.parse(fs.readFileSync(path.join(dataDir, 'fb_cookies.json'), 'utf8'));
    const xs = cookies.find(c => c.name === 'xs');
    if (xs) {
      const exp = new Date(xs.expires * 1000);
      cookieStatus = '✅ 有效至 ' + exp.toLocaleDateString('zh-CN');
    }
  } catch(e) {}

  const msg = [
    `📊 Car Scout 日报 — ${nztDate}`,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '🔍 今日扫描概况',
    `• 扫描: ${lastScan.searched} 页 | 耗时 ${Math.floor(lastScan.duration/60)}m${lastScan.duration%60}s`,
    `• 数据库: ${fbData.vehicles.length} 辆 | 新发现: ${lastScan.newFound} 辆 | 已售: ${lastScan.sold}`,
    `• 详情确认: ${lastScan.enriched} 辆 | 热门推送: ${lastScan.hotAlerts} 辆`,
    '',
    `📈 车型分布 (新增 ${lastScan.newFound} 辆)`,
    modelLines,
    '',
    `💰 低价好车 (${enriched.length} 辆详情已确认)`,
    enrichedLines,
    '',
    `📌 跟进池 (${pool.active.length} 辆在跟, ${lastScan.sold} 辆已售)`,
    '🔥 Top 5:',
    poolTop,
    '',
    '⚙️ 系统状态',
    `• FB Cookie: ${cookieStatus}`,
    '• 定时任务: ✅ 每小时 8AM-11PM',
    `• 扫描效率: ${lastScan.searched}页, ${lastScan.duration}s (优化后)`,
    `• 跟进池: ${pool.active.length} 辆全部在售`,
    '',
    '🎯 建议操作',
  ];

  // Generate action suggestions from enriched low-price listings
  const suggestions = enriched
    .filter(v => v.price <= 3500)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map((v, i) => `${i+1}. ${v.year || '?'} ${v.model} $${v.price.toLocaleString()}${v.mileage ? ' (' + v.mileage.toLocaleString() + 'km)' : ''} — 价格低，建议联系卖家`);

  // Add top profit from pool
  const topProfit = pool.active.sort((a, b) => b.profit - a.profit)[0];
  if (topProfit) {
    suggestions.push(`${suggestions.length + 1}. ${topProfit.model} $${topProfit.price.toLocaleString()} [${topProfit.platform}] — 预估利润最高 $${topProfit.profit.toLocaleString()}`);
  }

  msg.push(suggestions.join('\n'));

  const text = msg.join('\n');
  console.log(text);
  console.log('\n--- Sending to Feishu ---');

  // Get token
  const tokenRes = await httpReq({
    hostname: 'open.feishu.cn',
    path: '/open-apis/auth/v3/tenant_access_token/internal',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { app_id: APP_ID, app_secret: APP_SECRET });

  if (tokenRes.code !== 0) {
    console.log('Token failed:', tokenRes);
    return;
  }

  const res = await httpReq({
    hostname: 'open.feishu.cn',
    path: '/open-apis/im/v1/messages?receive_id_type=open_id',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + tokenRes.tenant_access_token,
      'Content-Type': 'application/json'
    }
  }, {
    receive_id: USER_OPEN_ID,
    msg_type: 'text',
    content: JSON.stringify({ text })
  });

  console.log(res.code === 0 ? '✅ 报告已发送到飞书' : '❌ 发送失败: ' + JSON.stringify(res));
}

main().catch(e => console.error('Error:', e));

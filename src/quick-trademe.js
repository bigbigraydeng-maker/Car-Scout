/**
 * Car Scout - Quick TradeMe Report
 * 快速生成今日 TradeMe 报告
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function quickTradeMeReport() {
  console.log('🚗 Car Scout - 快速 TradeMe 报告\n');
  
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  // 车型列表
  const searches = [
    { brand: 'toyota', model: 'corolla' },
    { brand: 'toyota', model: 'vitz' },
    { brand: 'toyota', model: 'yaris' },
    { brand: 'honda', model: 'civic' },
    { brand: 'honda', model: 'fit' },
    { brand: 'mazda', model: 'mazda3' },
  ];
  
  const allVehicles = [];
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    for (const { brand, model } of searches) {
      const url = `https://www.trademe.co.nz/a/motors/cars/${brand}/search?price_min=2000&price_max=5000&year_min=2002&seller_type=private&search_string=${brand}%20${model}`;
      
      console.log(`🔍 ${brand} ${model}...`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(2000);
        
        const vehicles = await page.evaluate(() => {
          const results = [];
          const seen = new Set();
          
          document.querySelectorAll('a[href*="/listing/"]').forEach(link => {
            const text = link.innerText || '';
            
            // 提取价格
            const priceMatch = text.match(/\$([\d,]+)/);
            if (!priceMatch) return;
            const price = parseInt(priceMatch[1].replace(/,/g, ''));
            if (price < 2000 || price > 5000) return;
            
            // 提取年份
            const yearMatch = text.match(/\b(200[2-9]|201[0-9])\b/);
            if (!yearMatch) return;
            const year = parseInt(yearMatch[1]);
            
            // 提取里程
            const kmMatch = text.match(/([\d,]+)\s*km/i);
            const mileage = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;
            if (mileage > 160000) return;
            
            // 检查个人卖家
            if (!text.toLowerCase().includes('private seller')) return;
            
            const href = link.getAttribute('href');
            const url = href.startsWith('http') ? href : `https://trademe.co.nz${href}`;
            
            if (seen.has(url)) return;
            seen.add(url);
            
            results.push({
              title: `${year} ${brand} ${model}`,
              price,
              year,
              mileage,
              url: url.split('?')[0],
              source: 'TradeMe'
            });
          });
          
          return results;
        });
        
        allVehicles.push(...vehicles);
        console.log(`   ✅ ${vehicles.length} 辆`);
        
      } catch (err) {
        console.log(`   ⚠️ 跳过: ${err.message.substring(0, 30)}`);
      }
    }
    
  } finally {
    await browser.close();
  }
  
  // 去重
  const seen = new Set();
  const unique = allVehicles.filter(v => {
    const key = `${v.title}-${v.price}-${v.mileage}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // 评分排序
  unique.sort((a, b) => {
    const scoreA = (a.price <= 3500 ? 40 : 20) + (a.mileage <= 100000 ? 30 : 10);
    const scoreB = (b.price <= 3500 ? 40 : 20) + (b.mileage <= 100000 ? 30 : 10);
    return scoreB - scoreA;
  });
  
  // 保存
  const today = new Date().toISOString().split('T')[0];
  const data = {
    date: today,
    total: unique.length,
    vehicles: unique
  };
  
  fs.writeFileSync(path.join(dataDir, `trademe_report_${today}.json`), JSON.stringify(data, null, 2));
  
  // 打印报告
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 今日 TradeMe 报告');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`共找到 ${unique.length} 辆车\n`);
  
  console.log('🏆 TOP 5 推荐:\n');
  unique.slice(0, 5).forEach((v, i) => {
    console.log(`${i+1}. ${v.title}`);
    console.log(`   💰 $${v.price.toLocaleString()}`);
    console.log(`   🛣️ ${v.mileage.toLocaleString()} km`);
    console.log(`   🔗 ${v.url}`);
    console.log();
  });
  
  console.log('✅ 报告已保存');
  console.log(`💡 下一步: 手动检查 Facebook 补充数据`);
  
  return data;
}

quickTradeMeReport().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});

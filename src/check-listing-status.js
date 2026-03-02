/**
 * check-listing-status.js
 * 检查车辆链接是否仍在售（已售/下架检测）
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// 检查单个链接状态
async function checkListingStatus(browser, url) {
  const page = await browser.newPage();
  
  try {
    // 设置超时
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // 等待页面加载
    await new Promise(r => setTimeout(r, 2000));
    
    // 检查页面内容判断状态
    const status = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      const titleText = document.title.toLowerCase();
      
      // 检查已售标记
      if (bodyText.includes('sold') || bodyText.includes('已售') || 
          bodyText.includes('listing closed') || bodyText.includes('no longer available') ||
          titleText.includes('sold')) {
        return 'SOLD';
      }
      
      // 检查 TradeMe 已售
      if (bodyText.includes('auction closed') || bodyText.includes('listing expired')) {
        return 'SOLD';
      }
      
      // 检查 Facebook Marketplace 已售
      if (bodyText.includes('pending') && bodyText.includes('sale')) {
        return 'PENDING';
      }
      
      // 检查错误页面
      if (bodyText.includes('page not found') || bodyText.includes('404') ||
          bodyText.includes('broken') || bodyText.includes('unavailable')) {
        return 'UNAVAILABLE';
      }
      
      // 检查是否有价格信息（在售的标志）
      const hasPrice = bodyText.includes('$') || 
                       document.querySelector('[class*="price"], [class*="Price"]') !== null;
      
      if (hasPrice) {
        return 'AVAILABLE';
      }
      
      return 'UNKNOWN';
    });
    
    await page.close();
    return status;
    
  } catch (error) {
    await page.close();
    if (error.message.includes('404') || error.message.includes('not found')) {
      return 'UNAVAILABLE';
    }
    return 'ERROR';
  }
}

// 批量检查车辆列表
async function checkListingsStatus(listings, maxCheck = 10) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  const toCheck = listings.slice(0, maxCheck);
  
  console.log(`🔍 检查 ${toCheck.length} 辆车是否仍在售...`);
  
  for (let i = 0; i < toCheck.length; i++) {
    const listing = toCheck[i];
    console.log(`  ${i + 1}/${toCheck.length} 检查: ${listing.title?.substring(0, 30) || 'Unknown'}...`);
    
    const status = await checkListingStatus(browser, listing.url);
    results.push({
      ...listing,
      status
    });
    
    // 延迟避免请求过快
    await new Promise(r => setTimeout(r, 1500));
  }
  
  await browser.close();
  
  const available = results.filter(r => r.status === 'AVAILABLE');
  const sold = results.filter(r => r.status === 'SOLD');
  const unavailable = results.filter(r => ['UNAVAILABLE', 'ERROR'].includes(r.status));
  
  console.log(`\n📊 检查结果:`);
  console.log(`  ✅ 在售: ${available.length} 辆`);
  console.log(`  ❌ 已售: ${sold.length} 辆`);
  console.log(`  ⚠️  不可用: ${unavailable.length} 辆`);
  
  return {
    available,
    sold,
    unavailable,
    all: results
  };
}

// 如果直接运行
if (require.main === module) {
  // 测试
  const testListings = [
    {
      id: 'test1',
      title: '2007 Corolla',
      url: 'https://www.facebook.com/marketplace/item/26302106482746028/'
    }
  ];
  
  checkListingsStatus(testListings).then(results => {
    console.log('\n详细结果:', JSON.stringify(results, null, 2));
  });
}

module.exports = { checkListingStatus, checkListingsStatus };

# Facebook Edge Scraper 问题分析报告

## 📊 监控结果

**监控时间**: 15分钟 (2026-02-25)
**进程状态**: 已终止 (marine-shell)
**数据结果**: 0 辆车被抓取

---

## 🔍 问题诊断

### 核心问题：页面选择器失效

Facebook Marketplace 页面结构已更改，导致现有的 CSS 选择器无法匹配任何元素。

**当前使用的选择器（已失效）**:
```javascript
const selectors = [
  'a[href*="/marketplace/item/"]',           // ❌ 失效
  'div[role="article"] a[href*="/marketplace/"]',  // ❌ 失效
  '[data-testid="marketplace_search_result"] a'    // ❌ 失效
];
```

**现象**: 
- 登录成功 ✓
- 页面加载成功 ✓
- 滚动执行成功 ✓
- 但每个搜索都返回 **"找到 0 个列表"** ✗

---

## 🛠️ 修复建议

### 方案 1：更新选择器（推荐）

需要人工检查当前 Facebook Marketplace 页面结构，更新选择器。可能的新选择器方向：

```javascript
// 可能的替代选择器（需要验证）
const newSelectors = [
  'a[href*="/marketplace/item/"]',  // 基础链接 - 可能仍然有效，但结构变化
  '[role="feed"] a',                // Feed 容器内的链接
  '[data-pagelet="MarketplaceSearch"] a[href*="/item/"]',  // 新的 pagelet 结构
  'div[class*="x9f619"] a[href*="marketplace"]',  // 使用类名模式（Facebook 使用自动化类名）
  'span:has-text("$")',             // 通过价格文本定位
];
```

### 方案 2：使用 Playwright 的 Locator API

使用更智能的定位方式，不依赖具体选择器：

```javascript
// 通过文本内容定位
const listings = await page.locator('text=/\\$[0-9,]+/').locator('..').all();

// 或通过图片+价格组合定位
const cards = await page.locator('img').filter({ hasText: /\$/ }).all();
```

### 方案 3：使用浏览器扩展或 API

考虑使用官方或第三方的 Marketplace API（如果有的话），或者使用专门的爬虫服务。

### 方案 4：降级到 TradeMe 优先

在 Facebook 修复之前，将 TradeMe 作为主要数据源。

---

## ✅ 立即行动建议

### 1. 使用 TradeMe 数据（立即生效）

TradeMe Scraper 工作正常，建议用户：
- ✅ 继续使用 TradeMe 作为主要数据源
- ✅ TradeMe 有个人卖家筛选功能，数据质量较高
- ✅ TradeMe 结构稳定，维护成本低

### 2. 调试 Facebook 选择器

在浏览器中打开 Facebook Marketplace，手动检查元素：

```bash
# 1. 打开 Edge 浏览器
# 2. 访问 https://www.facebook.com/marketplace/auckland/search/?query=toyota%20corolla
# 3. 按 F12 打开开发者工具
# 4. 检查车辆卡片的 HTML 结构
# 5. 更新 src/facebook-private-scraper.js 中的选择器
```

### 3. 添加调试模式

为 scraper 添加截图和 HTML 保存功能，便于诊断：

```javascript
// 在 extractListings 之前添加
await page.screenshot({ path: 'debug_facebook.png', fullPage: true });
const html = await page.content();
fs.writeFileSync('debug_facebook.html', html);
```

---

## 📝 代码修复示例

以下是修复 `extractListings` 函数的示例：

```javascript
async extractListings(page, config) {
  try {
    // 先截图调试
    await page.screenshot({ path: 'debug_listing.png', fullPage: true });
    
    return await page.evaluate(({ searchBrand, searchModel }) => {
      const items = [];
      const seen = new Set();
      
      // 更新的选择器列表（2026-02-25）
      const selectors = [
        // 尝试找到所有包含 marketplace/item 的链接
        'a[href*="/marketplace/item/"]',
        // 通过价格符号定位父元素
        'span:contains("$")',
        // 通过角色定位（Facebook 常用）
        '[role="article"]',
        // 更通用的容器
        'div[class*="x1lliihq"] a',  // Facebook 常用的自动生成的类名模式
      ];
      
      let elements = [];
      
      // 尝试所有选择器
      for (const selector of selectors) {
        try {
          if (selector.includes(':contains')) {
            // 自定义 contains 逻辑
            const allSpans = document.querySelectorAll('span');
            elements = Array.from(allSpans).filter(el => el.textContent.includes('$'));
          } else {
            elements = document.querySelectorAll(selector);
          }
          if (elements.length > 0) {
            console.log(`✅ 选择器 ${selector} 找到 ${elements.length} 个元素`);
            break;
          }
        } catch (e) {
          console.log(`❌ 选择器 ${selector} 失败: ${e.message}`);
        }
      }
      
      // 如果还是没有找到，打印调试信息
      if (elements.length === 0) {
        console.log('⚠️ 警告：未找到任何列表元素');
        console.log('页面标题:', document.title);
        console.log('页面URL:', window.location.href);
        return [];
      }
      
      // ... 继续处理逻辑
      
    }, { searchBrand: config.brand, searchModel: config.model });
    
  } catch (err) {
    console.error('提取列表失败:', err.message);
    return [];
  }
}
```

---

## 🎯 结论

| 项目 | 状态 | 建议 |
|------|------|------|
| TradeMe | ✅ 正常 | 继续使用 |
| Facebook | ❌ 失效 | 需要更新选择器 |
| Skykiwi | ⏳ 待配置 | 等待交接 |

**建议用户立即切换到 TradeMe 数据源**，同时我们修复 Facebook Scraper 的选择器问题。

---

## 📞 下一步

1. **短期**：使用 TradeMe 数据生成今日报告
2. **中期**：修复 Facebook 选择器（需要人工检查页面结构）
3. **长期**：考虑使用更稳定的 API 或第三方服务

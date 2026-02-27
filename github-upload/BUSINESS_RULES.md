# Car Scout Toyota - 业务规则更新

## 重要限制

### ✅ 允许的货源
- **Facebook Marketplace** - 个人卖家
- **TradeMe** - 个人卖家列表

### ❌ 禁止的货源
- 车行/Dealer
- 汽车经销商
- 批发渠道

---

## 识别个人卖家的方法

### Facebook Marketplace
**个人卖家特征：**
- 卖家名称是普通人名（非公司名）
- 主页显示个人照片和生活内容
- 车辆描述口语化，有个人故事
- 通常只有1-3辆车在卖

**车行特征（需排除）：**
- 卖家名包含 "Motors", "Cars", "Auto", "Dealer"
- 主页有大量车辆列表
- 描述专业格式化
- 有公司联系方式

### TradeMe
**个人卖家特征：**
- 卖家类型标注为 "Private seller"
- 评价数量少（<10）
- 车辆描述有个人使用经历

**车行特征（需排除）：**
- 卖家类型标注为 "Dealer"
- 评价数量多（>50）
- 专业车辆展示图片

---

## 抓取策略调整

### 1. Facebook Marketplace
```javascript
// 提取卖家信息并判断是否为个人
const isPrivateSeller = (sellerInfo) => {
  const businessKeywords = ['motors', 'cars', 'auto', 'dealer', 'sales', 'ltd', 'limited'];
  const sellerName = sellerInfo.name.toLowerCase();
  
  // 检查是否包含商业关键词
  for (const kw of businessKeywords) {
    if (sellerName.includes(kw)) return false;
  }
  
  // 检查车辆数量（个人通常<3辆）
  if (sellerInfo.listingCount > 5) return false;
  
  return true;
};
```

### 2. TradeMe
```javascript
// TradeMe API或页面都有明确的卖家类型标记
const sellerType = listing.seller.type; // 'private' | 'dealer'
if (sellerType === 'dealer') {
  skipListing(); // 跳过车行
}
```

---

## 新增验证字段

每辆车必须记录：
- `sellerType`: 'private' | 'dealer' | 'unknown'
- `sellerName`: 卖家名称
- `sellerListingCount`: 该卖家的车辆数量
- `isVerifiedPrivate`: 是否确认为个人卖家

---

## 筛选流程

```
抓取车辆信息
    ↓
判断卖家类型
    ↓
├─ 个人卖家 → 继续评分
└─ 车行/Dealer → 跳过
    ↓
进入7维度评分模型
    ↓
生成报告（仅含个人卖家）
```

---

## 注意事项

1. **Facebook识别难度**：Marketplace不直接显示卖家类型，需要通过主页内容判断
2. **TradeMe较容易**：有明确的卖家类型标记
3. **误判风险**：部分个人卖家可能看起来像车行（如车迷收藏多辆车）
4. **建议**：优先抓取TradeMe（规则明确），Facebook作为补充

---

## 下一步行动

1. 修改抓取脚本，添加卖家类型识别
2. 优先开发TradeMe抓取器
3. 优化Facebook的个人卖家判断逻辑

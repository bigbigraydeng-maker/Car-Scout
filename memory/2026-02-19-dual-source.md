# Car Scout Toyota - 双数据源开发记录

## 日期
2026-02-19

## 新增功能

### 1. TradeMe 抓取器 ✅
**文件**: `src/trademe-scraper.js`

**特点**:
- 直接URL参数筛选个人卖家 (`seller_type=private`)
- 支持分页抓取
- 自动去重
- 保存结构化数据

**优势**:
- ✅ 稳定可靠
- ✅ 信息完整
- ✅ 速度快
- ✅ 反爬少

### 2. Facebook 个人卖家专用版 ✅
**文件**: `src/facebook-private-scraper.js`

**特点**:
- 智能识别个人卖家 vs 车行
- 检查卖家名称关键词
- 统计卖家车辆数量
- 只保留个人卖家

**识别逻辑**:
```javascript
商业关键词 = ['motors', 'cars', 'auto', 'dealer', 'sales', 'ltd', 'limited']
如果 卖家名包含以上关键词 → 跳过
如果 卖家车辆数量 > 5 → 跳过
否则 → 保留（个人卖家）
```

### 3. 统一运行入口 ✅
**文件**: `src/run-all.js`

**流程**:
```
1. 抓取 TradeMe
2. 抓取 Facebook
3. 合并去重
4. 100分制评分
5. 生成报告
```

### 4. 配置文件更新 ✅
**文件**: `search_config.json`

**新增**:
```json
"sources": {
  "trademe": { "enabled": true, "priority": 1 },
  "facebook": { 
    "enabled": true, 
    "priority": 2,
    "business_keywords": [...]
  }
}
```

---

## 文件结构更新

```
workspace-car-scout-toyota/
├── src/
│   ├── scraper.js                    # 原版（已修复选择器）
│   ├── scraper-lite.js               # 简化版
│   ├── trademe-scraper.js            # ⭐ 新增：TradeMe抓取
│   ├── facebook-private-scraper.js   # ⭐ 新增：Facebook个人卖家版
│   ├── run-all.js                    # ⭐ 新增：统一运行入口
│   ├── scoring.js                    # 评分模型
│   └── report.js                     # 报告生成
├── data/                             # 数据存储
├── BUSINESS_RULES.md                 # ⭐ 新增：业务规则
├── README-DUAL-SOURCE.md             # ⭐ 新增：双数据源说明
└── search_config.json                # 更新：支持双数据源
```

---

## 待测试项目

- [ ] TradeMe抓取器实际运行测试
- [ ] Facebook个人卖家识别准确率测试
- [ ] 统一运行流程测试
- [ ] 评分模型在真实数据上的效果

---

## 建议运行顺序

1. **先测试 TradeMe**（最稳定）
   ```bash
   node src/trademe-scraper.js
   ```

2. **再测试 Facebook**（需要登录）
   ```bash
   node src/facebook-private-scraper.js
   ```

3. **最后运行完整流程**
   ```bash
   node src/run-all.js
   ```

---

## 下一步

等待用户测试反馈，根据实际运行情况进一步优化：
- TradeMe抓取成功率
- Facebook个人卖家识别准确率
- 评分模型合理性
- 报告格式改进

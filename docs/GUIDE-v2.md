# 🚗 Car Scout v2.0 - 完整使用指南

## 系统概述

Car Scout 是一个完整的二手车收购管理系统，包含：
- 🤖 **自动抓取**：Facebook Marketplace车辆数据
- 🗄️ **智能数据库**：自动去重、价格监控
- 📊 **可视化看板**：HTML交互式管理界面
- 🔄 **全流程管理**：从发现到重新上架的完整工作流
- 📱 **飞书集成**：支持飞书多维表格同步

---

## 🚀 快速开始

### 1. 初始化系统
```bash
npm run setup
```

### 2. 运行抓取
```bash
npm run scrape
```
- 浏览器会自动打开
- 首次需要手动登录Facebook
- 登录后自动抓取并保存数据

### 3. 生成报告
```bash
npm run report
```
生成：
- 📊 可视化HTML看板
- 📤 飞书导入模板
- 📋 今日待办清单

### 4. 打开看板
```bash
npm run dashboard
```
在浏览器中打开可视化看板

---

## 📋 常用命令

### 查看车辆
```bash
# 列出所有活跃车辆
npm run scout list

# 只显示今日新增
npm run scout list --today

# 按状态筛选
npm run scout list --status=purchased

# 查看车辆详情
npm run scout view fb_123456789
```

### 推进工作流
```bash
# 推进车辆到下一阶段
npm run scout advance [车辆ID] [阶段]

# 示例
npm run scout advance fb_123456789 contacted
npm run scout advance fb_123456789 viewing
npm run scout advance fb_123456789 purchased
```

### 查看待办
```bash
npm run scout todos
```

---

## 🔄 完整工作流程

### 阶段说明

| 阶段 | 说明 | 生成文档 |
|------|------|----------|
| 📥 **new** | 新发现的车辆 | - |
| 📞 **contacted** | 已联系卖家 | - |
| 📅 **viewing** | 预约看车 | 看车清单 |
| 🔍 **inspecting** | 车检中 | 车检报告模板 |
| 💰 **negotiating** | 议价中 | - |
| ✅ **purchased** | 已购买 | - |
| 🧹 **cleaning** | 清理中 | 清理清单 |
| 🔄 **reselling** | 已上架 | - |
| 🏁 **sold** | 已售出 | - |
| ❌ **abandoned** | 已放弃 | - |

### 工作流程示例

```
发现车辆 → 联系卖家 → 预约看车 → 车检 → 议价 → 
购买 → 清理整备 → 拍照上架 → 售出
```

### 推进示例

```bash
# 1. 新发现 → 已联系
npm run scout advance fb_123456789 contacted

# 2. 已联系 → 预约看车
npm run scout advance fb_123456789 viewing "预约周六下午2点看车"

# 3. 预约看车 → 车检中
npm run scout advance fb_123456789 inspecting

# 4. 车检中 → 议价中
npm run scout advance fb_123456789 negotiating "车况良好，准备出价$3200"

# 5. 议价中 → 已购买
npm run scout advance fb_123456789 purchased "成交价$3300"

# 6. 已购买 → 清理中
npm run scout advance fb_123456789 cleaning

# 7. 清理中 → 已上架
npm run scout advance fb_123456789 reselling

# 8. 已上架 → 已售出
npm run scout advance fb_123456789 sold "售价$4500，利润$800"
```

---

## 📊 可视化看板

### 看板功能

运行 `npm run dashboard` 后会生成HTML看板，包含：

1. **统计概览**
   - 总车辆数
   - 今日新增
   - 已购买数
   - 看车/车检中

2. **工作流程图**
   - 可视化展示各阶段车辆数量
   - 一眼看出工作进度

3. **车辆卡片**
   - 显示价格、里程、优先级
   - 状态标签
   - 快速链接到Facebook
   - 一键推进按钮

4. **分类视图**
   - 今日新增
   - 待看车
   - 车检中
   - 清理中
   - 已上架

### 查看方式

```bash
# 生成并查看路径
npm run dashboard

# 然后用浏览器打开显示的路径
# 例如: reports/visual/dashboard_2024-01-15.html
```

---

## 📱 飞书集成

### 配置飞书表格

1. **生成配置模板**
```bash
npm run feishu
```

2. **在飞书创建多维表格**
   - 打开飞书 → 多维表格
   - 创建新表格
   - 按 `config/feishu-table.json` 配置字段

3. **导入数据**
```bash
npm run report
# 使用生成的 exports/import_YYYY-MM-DD.json 导入
```

### 飞书表格字段

包含以下模块：
- 📋 基础信息（ID、标题、年份、价格等）
- ⭐ 评分与优先级
- 🔄 生命周期状态
- 📅 看车记录
- 🔍 车检记录
- 💰 购买记录
- 🧹 清理记录
- 📸 上架记录
- 📈 财务统计

---

## 📁 文件结构

```
car-scout-toyota/
├── src/
│   ├── dashboard.js              # 主控制面板
│   ├── facebook-scraper-v4.js   # 新版抓取器
│   ├── vehicle-database.js      # 数据库核心
│   ├── vehicle-workflow-manager.js # 流程管理
│   ├── visual-report-generator.js # 可视化报告
│   └── feishu-table-integration.js # 飞书集成
├── database/
│   └── vehicles.json            # 车辆数据库
├── workflow/
│   ├── checklist_[ID].md        # 看车清单
│   ├── inspection_[ID].md       # 车检报告
│   ├── cleaning_[ID].md         # 清理清单
│   └── todos_YYYY-MM-DD.md      # 待办清单
├── reports/
│   ├── visual/                  # HTML看板
│   └── daily/                   # 每日报告
├── exports/                     # 导出文件
├── data/                        # 抓取数据
└── auth/                        # 登录状态
```

---

## 💡 使用技巧

### 1. 批量操作

```bash
# 同时推进多辆车到看车阶段
# 在dashboard.js中修改支持
```

### 2. 优先级管理

系统根据以下因素自动计算优先级（0-9分）：
- 价格越低分越高
- 里程越低分越高
- 年份越新分越高

### 3. 价格监控

数据库会自动：
- 记录价格变动历史
- 检测价格更新
- 在报告中提示

### 4. 自动清理

系统会：
- 自动标记7天未更新的车辆为"expired"
- 保留90天的历史数据
- 自动清理过期数据

---

## 🛠️ 高级配置

### 修改筛选条件

编辑 `search_config.json`：

```json
{
  "mileage": { "max_km": 160000 },
  "year_range": { "min": 2002 },
  "price_range": { "min_nzd": 2000, "max_nzd": 5000 }
}
```

### 自定义工作流

编辑 `src/vehicle-workflow-manager.js`：

```javascript
getWorkflowStages() {
  return [
    { id: 'new', name: '📥 新发现', next: ['contacted'] },
    // 添加自定义阶段
  ];
}
```

---

## ❓ 常见问题

### Q: 为什么每次都要登录Facebook？
A: 首次登录后会保存状态，如果浏览器cookie过期才需要重新登录。

### Q: 如何同时管理多辆车？
A: 系统支持多车并行，每辆车有独立ID，可以在看板中同时查看所有车辆。

### Q: 数据会丢失吗？
A: 数据库会自动保存，每个任务后都有备份。建议定期导出数据。

### Q: 如何导出数据？
```bash
npm run scout export backup.json
```

---

## 📞 技术支持

如有问题，请查看：
1. 日志文件：`logs/` 目录
2. 数据库文件：`database/vehicles.json`
3. 错误报告：`data/errors_*.json`

---

## 📝 更新日志

### v2.0.0 (2024-02-28)
- ✅ 新增可视化HTML看板
- ✅ 新增完整工作流管理
- ✅ 新增飞书表格集成
- ✅ 新增智能去重系统
- ✅ 新增价格监控
- ✅ 新增今日待办
- ✅ 优化里程提取逻辑
- ✅ 修复登录状态保存

### v1.0.0 (2024-02-20)
- 🎉 初始版本发布
- ✅ Facebook抓取功能
- ✅ 基础评分系统
- ✅ Markdown报告

---

**Happy Car Scouting! 🚗💨**

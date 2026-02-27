# 🚗 Car Scout v2.0

**智能二手车抓取与全流程管理系统**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/car-scout)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ 核心功能

- 🤖 **自动抓取** - Facebook Marketplace车辆数据
- 🗄️ **智能去重** - 自动识别重复车辆，避免信息冗余
- 📊 **可视化看板** - HTML交互式管理界面
- 🔄 **全流程管理** - 从发现到重新上架的完整工作流
- 📱 **飞书集成** - 支持飞书多维表格同步
- 💰 **价格监控** - 追踪价格变动，把握最佳时机

## 🚀 5分钟快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化系统
```bash
npm run setup
```

### 3. 运行抓取
```bash
npm run scrape
```
- 浏览器自动打开
- 首次登录Facebook（之后自动）
- 等待抓取完成

### 4. 生成报告
```bash
npm run report
```

### 5. 打开看板
```bash
npm run dashboard
```
然后用浏览器打开生成的HTML文件

---

## 📋 常用命令速查

```bash
# 抓取车辆
npm run scrape

# 生成完整报告
npm run report

# 打开可视化看板
npm run dashboard

# 查看今日待办
npm run scout todos

# 列出所有车辆
npm run scout list

# 查看今日新增
npm run scout list --today

# 推进车辆到下一阶段
npm run scout advance [ID] [阶段]

# 查看车辆详情
npm run scout view [ID]

# 配置飞书表格
npm run feishu
```

---

## 🔄 工作流程

```
📥 新发现 → 📞 已联系 → 📅 预约看车 → 🔍 车检中 → 
💰 议价中 → ✅ 已购买 → 🧹 清理中 → 🔄 已上架 → 🏁 已售出
```

### 阶段推进示例

```bash
# 联系卖家
npm run scout advance fb_123 contacted

# 预约看车（自动生成看车清单）
npm run scout advance fb_123 viewing "周六下午2点"

# 车检（生成车检报告模板）
npm run scout advance fb_123 inspecting

# 购买
npm run scout advance fb_123 purchased "成交价$3300"

# 清理整备（生成清理清单）
npm run scout advance fb_123 cleaning

# 上架销售
npm run scout advance fb_123 reselling
```

---

## 📊 可视化看板

运行 `npm run dashboard` 后，浏览器打开HTML文件可查看：

- 📈 **统计概览** - 总车辆、今日新增、待办事项
- 🎯 **工作流图** - 各阶段车辆分布
- 🚗 **车辆卡片** - 价格、里程、优先级、快速操作
- 📅 **今日待办** - 高优先级任务提醒

---

## 📱 飞书集成

1. **生成配置**
```bash
npm run feishu
```

2. **在飞书创建表格**
- 打开飞书 → 多维表格
- 按配置创建字段

3. **导入数据**
```bash
npm run report
# 导入生成的JSON文件
```

---

## 🎯 系统特点

### 智能去重
- 基于Facebook Item ID唯一识别
- 自动检测重复车辆
- 只推送新增和更新的车辆

### 价格监控
- 记录价格变动历史
- 自动检测价格更新
- 在报告中提示变动

### 优先级评分
根据价格、里程、年份自动计算（0-9分）

### 增量报告
- 只显示新增和更新的车辆
- 避免每天信息重复
- 今日待办自动生成

---

## 📁 项目结构

```
car-scout-toyota/
├── src/              # 源代码
├── database/         # 车辆数据库
├── workflow/         # 工作流文档
├── reports/          # 生成的报告
├── exports/          # 导出文件
├── data/             # 抓取数据
└── docs/             # 文档
```

---

## 🛠️ 技术栈

- **Node.js** - 运行时
- **Playwright** - 浏览器自动化
- **原生JavaScript** - 数据处理
- **HTML/CSS** - 可视化看板

---

## 📝 详细文档

- [完整使用指南](docs/GUIDE-v2.md)
- [配置说明](search_config.json)

---

## 🐛 故障排除

### 登录问题
如果每次都要求登录：
```bash
# 删除旧登录状态
rm auth/facebook_auth.json
# 重新运行抓取
npm run scrape
```

### 里程提取错误
已修复常见问题，如果仍有异常：
- 检查车辆描述中的里程格式
- 手动查看Facebook页面确认

### 数据丢失
```bash
# 查看数据库
node -e "console.log(JSON.parse(require('fs').readFileSync('database/vehicles.json')).vehicles.length)"
```

---

## 🤝 贡献

欢迎提交Issue和PR！

---

## 📄 License

MIT License © 2024 Car Scout

---

**🚗 Happy Car Scouting!**

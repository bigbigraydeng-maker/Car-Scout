# Car Scout Toyota v2.0 - 项目启动记录

## 启动时间
2026-02-18 22:34 NZT

## 项目概述
基于历史Car Scout项目重构的Facebook Marketplace Toyota二手车抓取机器人

## 合并的历史项目经验

### 来自 workspace-car-scout
✅ **valuator.py** - 利润计算逻辑和市场参考价表
✅ **scraper.py** - Facebook抓取经验和错误处理
✅ **report_generator.py** - Markdown报告格式和联系策略
✅ **search_config.json** - 配置结构和参数设计
✅ **SKILL.md** - Rate limiting和安全措施

## 核心功能
- 每日抓取Auckland和Waikato地区Toyota车辆
- 价格范围：2000-5000 NZD
- 目标车型：Corolla, Vitz, RAV4
- 年份要求：>= 2002
- 100分制智能评分（7维度）
- 智能采购价计算
- 风险等级评估

## 已创建/更新文件

### 核心脚本
- ✅ `src/scraper.js` - 抓取脚本（v2.0，合并历史经验）
- ✅ `src/scoring.js` - 评分模型（v2.0，含利润分析）
- ✅ `src/report.js` - 报告生成（v2.0，Markdown格式）

### 配置文件
- ✅ `search_config.json` - 搜索配置（可自定义）
- ✅ `SKILL.md` - 技能定义（v2.0）
- ✅ `AGENTS.md` - 角色定义（v2.0）
- ✅ `SOUL.md` - 机器人个性
- ✅ `ROBOT_GUIDELINES.md` - 独立工作指南
- ✅ `README.md` - 使用说明（v2.0）
- ✅ `package.json` - 项目配置

### 目录结构
- ✅ `data/` - 数据存储
- ✅ `logs/` - 执行日志
- ✅ `reports/daily/` - 每日报告
- ✅ `src/` - 源代码
- ✅ `skills/` - 技能文件
- ✅ `memory/` - 工作记录

## 评分模型（7维度，100分）

| 维度 | 权重 | 来源 |
|------|------|------|
| 车型流通 | 20分 | v2.0新增 |
| 年份 | 15分 | v2.0新增 |
| 公里数 | 15分 | v2.0新增 |
| 价格性价比 | 20分 | 合并历史项目 |
| WOF | 10分 | v2.0新增 |
| 卖家动机 | 10分 | 合并历史项目 |
| 图片质量 | 10分 | v2.0新增 |

## 利润分析（来自历史项目）

### 流动性评级
- High (>30%)
- Medium-High (20-30%)
- Medium (15-20%)
- Low-Medium (10-15%)
- Low (<10%)

### Deal评分
- 9分: 强烈推荐
- 8分: 推荐
- 7分: 可接受
- 6分: 考虑
- 5分: 不建议

## 定时任务
- ✅ 已配置每日08:00 NZT自动执行
- ✅ 任务ID: 4b5eb184-d302-42f2-a993-914c6bc6fa30

## 改进项（相比历史项目）

### 新增功能
1. 🆕 增加Waikato地区支持
2. 🆕 专注Toyota三款车型（Corolla/Vitz/RAV4）
3. 🆕 100分制评分系统（原项目为Deal Score）
4. 🆕 采购价计算公式（地区差异化）
5. 🆕 风险等级评定（低/中/高）
6. 🆕 配置文件驱动（JSON配置）
7. 🆕 错误日志记录
8. 🆕 更完善的报告格式（文本+Markdown）

### 技术改进
1. 🆕 Node.js实现（原Python）
2. 🆕 Playwright替代Puppeteer
3. 🆕 更完善的数据提取逻辑
4. 🆕 配置文件化所有参数
5. 🆕 更好的错误处理和重试机制

## 待完成事项

### 技术准备
- [ ] 安装Playwright依赖
- [ ] 测试Facebook登录
- [ ] 验证抓取逻辑

### 首次运行
- [ ] 手动执行测试抓取
- [ ] 验证评分模型
- [ ] 检查报告格式

### 生产就绪
- [ ] 确认定时任务正常运行
- [ ] 监控首次自动执行

## 注意事项

1. Facebook登录可能需要手动操作（Human-in-the-loop）
2. 首次运行建议先测试单个地区
3. 评分模型可根据实际效果微调
4. 定期备份data目录数据
5. 遵守Rate Limiting，避免被封

## 历史项目引用

原项目位置: `workspace-car-scout/`
- 创建时间: 早于2026-02-18
- 主要贡献: 利润分析逻辑、安全配置、报告格式

---

项目已准备就绪，基于历史项目经验重构，功能更完善！

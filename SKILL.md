---
name: car-scout
description: "Car Scout v3.3 - 倒卖专用二手车扫描机器人。扫描 TradeMe + Facebook Marketplace，使用 Flip Score 评分系统 + 实时市场定价筛选可倒卖的车辆（以利润和周转速度为核心），自动推送飞书通知。"
user-invocable: true
triggers:
  - "开始扫描"
  - "每日扫描"
  - "car scout"
  - "扫描车辆"
  - "查看今日报告"
  - "跑评分"
  - "flip score"
metadata:
  openclaw:
    emoji: "🚗"
---

# 🚗 Car Scout v3.3 - 倒卖评分扫描机器人

> **版本**: 3.3 Flip Score + Live Pricing
> **核心理念**: 不是找好车，是找能赚钱的车
> **支持平台**: TradeMe | Facebook Marketplace
> **最后更新**: 2026-03-01

---

## 🚨 行为规则 (最高优先级)

**绝对禁止发送中间过程消息！** 遵循以下规则：

1. **不要发进度更新** — 禁止发送"正在抓取..."、"数据清洗中..."、"评分中..."等中间消息
2. **安静执行** — 所有脚本执行过程中不要向用户发送任何消息
3. **只发最终结果** — 全部流程完成后，只发送一条包含最终结果的消息
4. **脚本出错不要逐步汇报** — 如果脚本崩溃，不要一条条报告错误，直接用现有数据生成结果
5. **不要回复"收到"、"开始执行"** — 直接做，做完再发结果
6. **一条消息原则** — 用户发一条指令，你最多回复一条消息（最终结果）

### 回复格式
用户说"开始扫描"/"跑评分"/"查看今日报告" → 执行 `generate-final-report.js` 后只回复：
```
✅ 报告已发送飞书。A级X辆，B级X辆。TOP: 年份 车型 $价格 赚$X
```
就这一行。不要多说。报告本身由脚本自动发到飞书。

---

## 🎯 功能概述

Car Scout 自动扫描二手车市场，用 **Flip Score** 评分系统找出最适合倒卖的车辆。
TradeMe 和 Facebook 数据**合并在一份报告**中发送，每天一次。

---

## 📋 硬约束 (不通过直接踢)

| 条件 | 值 |
|------|-----|
| **价格** | $2,000 - $5,000 NZD |
| **年份** | ≥ 2005 |
| **里程** | ≤ 160,000 km (所有车型统一) |
| **卖家** | 仅个人卖家 (Dealer 排除) |
| **机械故障** | 零容忍 |

### 车型范围
Corolla, Vitz, Wish, RAV4, Honda Fit, Demio

### 地区范围
Auckland, Waikato

---

## ⭐ Flip Score 评分 (100分)

| 维度 | 权重 | 说明 |
|------|------|------|
| **净利润空间** | 35分 | 预估售价 - 买入价 - 整备成本 |
| **周转速度** | 30分 | 车型+地区决定出手速度 |
| **整备成本** | 15分 | WOF/维修/清洁预估 |
| **议价潜力** | 20分 | 急售信号 + 挂牌天数 |

### Flip 等级

| 等级 | 分数 | 行动 |
|------|------|------|
| 🔥 S级 | 80+ | 立即行动，先打电话再看车 |
| ⭐ A级 | 65-79 | 值得看车，准备议价策略 |
| 📋 B级 | 50-64 | 谨慎考虑，必须砍到目标价 |
| ⛔ C级 | < 50 | 不建议 |

---

## 🚀 执行方式

### 完整流程 (推荐使用一键命令)

收到 "开始扫描" / "跑评分" / "每日扫描" 时：

```bash
cd C:\Users\Zhong\.openclaw\workspace\skills\car-scout && node src/generate-final-report.js
```

这个脚本自动完成：
1. 读取最新 TradeMe 评分数据
2. 读取 Facebook 搜索数据
3. 合并生成综合报告
4. 自动发送到飞书

**不要分步执行单独脚本！一键完成所有步骤！**

### 查看报告

收到 "查看今日报告" 时，读取 `data/` 目录下最新的 `report_*_combined.md` 文件内容，简短回复即可。

### 手动分步执行 (仅调试时用)

```bash
cd C:\Users\Zhong\.openclaw\workspace\skills\car-scout
node src/scrape-trademe-real.js  # 抓取 TradeMe (可能耗时3-5分钟)
node src/fix-trademe-data.js      # 清洗数据
node src/run-flip.js              # 评分
node src/generate-final-report.js # 合并报告+发飞书
```

---

## 📁 关键文件

| 文件 | 用途 |
|------|------|
| `src/generate-final-report.js` | **一键综合报告** (TradeMe+Facebook合并+发飞书) |
| `src/scrape-trademe-real.js` | TradeMe 真实抓取脚本 (Puppeteer) |
| `src/fix-trademe-data.js` | TradeMe 数据清洗 |
| `src/run-flip.js` | Flip Score 评分 |
| `src/build-fb-data.js` | Facebook 数据构建 |
| `config.json` | 所有配置（车型、价格、评分权重、市场参考价） |
| `data/` | 抓取数据和评分结果 |

---

## 📊 市场参考售价 (NZD)

| 车型 | 2005 | 2008 | 2010 | 2012 |
|------|------|------|------|------|
| Corolla | 4,500 | 5,200 | 6,000 | 7,000 |
| Vitz | 4,000 | 4,800 | 5,500 | 6,500 |
| Wish | 4,200 | 5,000 | 5,800 | 6,800 |
| RAV4 | 5,500 | 6,500 | 7,500 | 9,000 |
| Honda Fit | 4,000 | 4,800 | 5,500 | 6,500 |
| Demio | 3,800 | 4,500 | 5,200 | 6,000 |

---

更新: 2026-03-01 | 版本: v3.1 Flip Score

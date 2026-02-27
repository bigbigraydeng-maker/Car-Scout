# Facebook Auto-Inquiry 使用说明

## 功能概述

当 Facebook Marketplace 上的车辆没有显示里程时，**自动发送站内信询问卖家**，并定期检查回复。

## 工作流程

```
1. 搜索车辆列表
   ↓
2. 进入详情页检查
   ↓
3. 判断是否有里程信息
   ├── 有里程 → 直接保存数据 ✅
   └── 无里程 → 发送站内信询问 📧
                      ↓
               添加到"待回复列表"
                      ↓
4. 下次运行时检查回复
   ├── 有回复 → 保存完整数据 ✅
   └── 无回复 → 保留在列表中 ⏳
```

## 消息模板

```
Hi, I'm interested in your [车辆标题]. 
Could you please tell me the current mileage/odometer reading? 
Thanks!
```

## 使用方法

### 单次运行
```bash
node src/facebook-auto-inquiry.js
```

### 设置定时任务（每4小时检查一次）
```bash
# 添加到 cron 任务
0 */4 * * * cd /path/to/workspace && node src/facebook-auto-inquiry.js
```

## 输出文件

| 文件 | 说明 |
|------|------|
| `data/facebook_inquiry_YYYY-MM-DD.json` | 抓取结果 |
| `data/pending_inquiries.json` | 待回复列表 |

## 数据结构

### pending_inquiries.json
```json
{
  "lastUpdated": "2026-02-27T02:00:00.000Z",
  "inquiries": [
    {
      "title": "2004 Toyota Corolla",
      "price": 4500,
      "url": "https://www.facebook.com/marketplace/item/...",
      "seller": { "name": "John Doe" },
      "inquiryTime": "2026-02-27T01:00:00.000Z",
      "inquirySent": true
    }
  ]
}
```

## 注意事项

1. **发送限制**: Facebook 可能有发送频率限制，建议不要一次询问太多
2. **回复时间**: 卖家可能需要几小时到几天回复
3. **消息管理**: 定期检查 Facebook Messenger 确认消息状态

## 待优化项

- [ ] 自动检测 Messenger 回复
- [ ] 自动提取回复中的里程数字
- [ ] 超过7天无回复自动移除
- [ ] 批量询问功能（带延迟）

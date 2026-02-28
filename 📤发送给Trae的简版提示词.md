# Trae，请帮我完成Facebook自动化配置

## 项目背景
Car Scout二手车抓取系统需要实现Facebook Marketplace自动化。
- 网站已部署：https://car-scout.onrender.com/
- TradeMe已实现云端自动化
- 需要本地Facebook自动化方案

## 请创建以下3个文件

### 文件1：src/auto-sync.js
功能：主同步脚本，每天自动运行
- 运行Facebook抓取
- 合并数据到数据库
- 筛选超里程车辆（>16万km剔除）
- 生成看板
- 推送到GitHub

要求：
- 超时设置（抓取10分钟）
- 清晰的步骤日志
- 错误处理（失败继续下一步）

### 文件2：src/merge-facebook.js
功能：合并Facebook数据到主数据库
- 查找最新的facebook_*.json文件
- 根据URL去重
- 计算优先级（年份+里程+价格）
- 添加firstSeen/lastSeen时间戳
- 保存到database/vehicles.json

### 文件3：setup-windows-task.bat
功能：配置Windows定时任务
- 每天早上9点运行auto-sync.js
- 检查Node.js存在
- 删除旧任务避免冲突
- 提供管理命令提示

## 项目路径
C:\Users\Zhong\.openclaw\workspace-car-scout-toyota\

## 已有文件（可直接调用）
- src/facebook-scraper-v4.js - Facebook抓取器
- src/filter-by-mileage.js - 里程筛选
- src/dashboard.js - 看板生成
- database/vehicles.json - 数据库

## 成功标准
1. 运行node src/auto-sync.js能成功执行所有步骤
2. 双击setup-windows-task.bat能创建定时任务
3. 数据能正确合并并推送到GitHub
4. Render网站能显示最新数据

## 详细需求参考
完整的技术要求和代码规范见：🎯Trae执行提示词.md

请直接创建这3个文件，确保代码完整可运行！

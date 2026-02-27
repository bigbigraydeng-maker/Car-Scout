#!/bin/bash
# Car Scout Toyota - Facebook抓取启动脚本
# 每4小时执行一次，只抓取部分任务避免超时

cd C:/Users/Zhong/.openclaw/workspace-car-scout-toyota

# 设置执行时间限制（10分钟）
timeout 600 node src/scraper-lite.js

# 发送通知（可选）
echo "Car Scout抓取完成: $(date)" >> logs/cron.log

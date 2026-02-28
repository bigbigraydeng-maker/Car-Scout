#!/bin/bash

# Render服务器自动抓取配置脚本
# 保存为 setup-auto-scrape.sh

echo "🚀 配置Render服务器自动抓取..."

# 1. 进入项目目录
cd /opt/render/project/src

# 2. 安装依赖（如果还没有）
echo "📦 检查依赖..."
npm list playwright || npm install

# 3. 创建数据目录
echo "📁 创建数据目录..."
mkdir -p ../database
mkdir -p ../data
mkdir -p ../logs

# 4. 创建初始数据库文件（如果不存在）
if [ ! -f "../database/vehicles.json" ]; then
  echo '📝 创建初始数据库...'
  echo '{
    "vehicles": [],
    "lastUpdate": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "version": "1.0"
  }' > ../database/vehicles.json
fi

# 5. 运行TradeMe抓取器（不需要登录）
echo "🔍 开始抓取TradeMe数据..."
node trademe-scraper.js

# 6. 检查结果
if [ -f "../data/trademe_$(date +%Y-%m-%d).json" ]; then
  echo "✅ TradeMe抓取成功！"
  # 合并到数据库
  node merge-trademe.js 2>/dev/null || echo "⚠️  合并脚本需要手动运行"
else
  echo "⚠️  抓取可能未完成，请检查日志"
fi

echo "🎉 配置完成！"
echo ""
echo "📊 查看数据："
echo "  数据库：../database/vehicles.json"
echo "  日志：../logs/"

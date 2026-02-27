# 🚗 Car Scout

**智能二手车抓取与全流程管理系统**

[![Render](https://img.shields.io/badge/Deploy-Render-green)](https://render.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

## ✨ 功能特性

- 🤖 **自动抓取** - Facebook Marketplace车辆数据
- 🗄️ **智能去重** - 自动识别重复车辆
- 📊 **可视化管理** - Web界面查看所有车辆
- 🔄 **全流程追踪** - 从发现到上架完整管理
- 🌐 **在线共享** - 合伙人远程访问
- 📱 **移动适配** - 手机/电脑都能用

## 🚀 快速开始

### 在线演示
访问演示地址查看效果：
```
https://car-scout-demo.onrender.com
```

### 本地使用

```bash
# 1. 安装依赖
npm install

# 2. 启动Web服务器
npm start

# 3. 访问 http://localhost:3000
```

### 一键部署到Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 📋 使用流程

### 每天3步
1. **抓取车辆** - 运行抓取脚本
2. **生成报告** - 生成今日报告
3. **查看看板** - 查看所有车辆状态

### 工作流程
```
📥 新发现 → 📞 已联系 → 📅 预约看车 → 🔍 车检中 → 
💰 议价中 → ✅ 已购买 → 🧹 清理中 → 🔄 已上架 → 🏁 已售出
```

## 📁 项目结构

```
car-scout/
├── src/                    # 源代码
│   ├── web-server.js      # Web服务器
│   ├── facebook-scraper-v4.js  # 抓取器
│   ├── vehicle-database.js     # 数据库
│   └── ...
├── database/              # 车辆数据
├── reports/               # 生成报告
├── workflow/              # 工作文档
├── 1-开始抓取.bat        # 抓取脚本
├── 2-生成报告.bat        # 报告脚本
└── 启动Web服务器.bat     # 启动服务器
```

## 🛠️ 技术栈

- **Node.js** - 运行时
- **Playwright** - 浏览器自动化
- **原生JavaScript** - 数据处理
- **HTML/CSS** - 可视化界面

## 📝 文档

- [完全零基础指南](完全零基础指南.md) - 详细使用教程
- [Render部署指南](Render部署完整指南.md) - 部署教程
- [项目交付文档](项目完整交付文档.md) - 项目总结

## 🤝 合伙人访问

部署后，合伙人可通过浏览器访问：
```
https://your-app.onrender.com
```

无需安装任何软件，手机电脑都能用！

## 📄 License

MIT License © 2024 Car Scout

---

**Happy Car Scouting! 🚗💨**

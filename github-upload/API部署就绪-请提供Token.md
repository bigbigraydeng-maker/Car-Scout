# ✅ API自动部署已准备就绪

## 📦 已创建的部署文件

### 🔧 核心部署脚本
| 文件 | 作用 |
|------|------|
| **auto-deploy.js** | 完整自动部署脚本（推荐） |
| **deploy-simple.js** | 简化版部署脚本 |
| **API自动部署.bat** | Windows交互式部署界面 |

### ⚙️ 配置文件
| 文件 | 作用 |
|------|------|
| **.env.example** | 环境变量配置模板 |
| **package.json** | 已添加部署脚本 |

### 📖 文档
| 文件 | 内容 |
|------|------|
| **API部署指南.md** | 详细使用说明 |
| **GitHub+Render快速上手.md** | 快速开始指南 |

---

## 🚀 三种部署方式

### 方式1：交互式部署（推荐首次使用）
```bash
双击运行：API自动部署.bat
```
按提示输入API Token即可。

### 方式2：配置文件部署
```bash
1. 复制 .env.example 为 .env
2. 填写API信息
3. 运行：npm run deploy
```

### 方式3：环境变量部署
```bash
# Windows
set GITHUB_TOKEN=your_token
set GITHUB_OWNER=your_username
set RENDER_API_KEY=your_key
node auto-deploy.js

# Mac/Linux
export GITHUB_TOKEN=your_token
export GITHUB_OWNER=your_username
export RENDER_API_KEY=your_key
node auto-deploy.js
```

---

## 🔑 需要准备的API Token

### 1. GitHub Personal Access Token
- 获取地址：https://github.com/settings/tokens
- 权限：勾选 **repo**（完整仓库权限）
- 格式：`ghp_xxxxxxxxxxxxxxxxxxxx`

### 2. Render API Key
- 获取地址：https://dashboard.render.com/u/settings/api-keys
- 点击："Create API Key"
- 格式：`rnd_xxxxxxxxxxxxxxxxxxxx`

---

## 📋 部署流程（自动完成）

```
┌─────────────────────────────────────┐
│  1. 创建GitHub仓库                   │
│     POST /user/repos                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. 上传代码到GitHub                 │
│     git push origin main            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. 创建Render Web Service          │
│     POST /v1/services               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. 等待部署完成                     │
│     检查服务状态                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. 输出访问地址                     │
│     https://car-scout-xxx.render.com│
└─────────────────────────────────────┘
```

---

## 🎯 部署后效果

合伙人访问地址示例：
```
https://car-scout-abc123.onrender.com
```

### 页面显示：
1. **统计概览** - 8辆车分布在各阶段
2. **筛选标签** - 点击只看特定阶段
3. **车辆卡片** - 价格、里程、优先级、状态
4. **自动刷新** - 每30秒更新数据

---

## ⚡ 快速开始

### 第1步：获取API Token（2分钟）
1. GitHub：https://github.com/settings/tokens → 创建Token → 勾选repo
2. Render：https://dashboard.render.com/u/settings/api-keys → 创建API Key

### 第2步：运行部署（1分钟）
```bash
双击：API自动部署.bat
```
输入Token，等待3分钟，完成！

### 第3步：分享地址
将输出的地址分享给合伙人，例如：
```
https://car-scout-abc123.onrender.com
```

---

## 🔐 安全提醒

1. **Token保密** - 不要分享给他人
2. **不要上传** - .env文件已加入.gitignore
3. **定期更换** - 建议每3个月更换一次
4. **本地存储** - 只在本地使用，不上传到GitHub

---

## ❓ 遇到问题？

### Token无效
- 检查是否复制完整（不要有多余空格）
- 检查GitHub Token是否有"repo"权限
- 检查Render API Key是否有效

### 部署失败
- 检查网络连接
- 检查用户名是否正确
- 查看错误提示信息

### 如何重新部署
```bash
# 修改代码后
npm run deploy
# 会自动更新GitHub并重新部署
```

---

## ✅ 准备就绪！

现在您可以通过API自动完成部署：

1. **获取Token** - 从GitHub和Render获取API Token
2. **运行脚本** - 双击 `API自动部署.bat`
3. **完成部署** - 3分钟后获得在线地址
4. **分享地址** - 合伙人即可访问

**所有部署脚本已准备就绪，等待您的API Token！** 🚀

---

**下一步：获取API Token并开始部署！**

查看详细指南：`API部署指南.md`

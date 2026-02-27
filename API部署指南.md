# 🚀 API自动部署指南

## 快速开始（3分钟）

### 第1步：获取API Token（2分钟）

#### GitHub Token
1. 打开 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选权限：
   - ✅ **repo** (完整控制仓库)
4. 点击 "Generate token"
5. **复制保存Token**（只显示一次！）

#### Render API Key
1. 打开 https://dashboard.render.com/u/settings/api-keys
2. 点击 "Create API Key"
3. 输入名称："Car Scout Deploy"
4. 点击 "Create"
5. **复制保存API Key**（只显示一次！）

---

### 第2步：配置并运行（1分钟）

#### 方式1：使用环境变量（推荐）

**Windows:**
```cmd
set GITHUB_TOKEN=ghp_xxxxxxxxxx
set GITHUB_OWNER=你的GitHub用户名
set GITHUB_REPO=car-scout
set RENDER_API_KEY=rnd_xxxxxxxxxx

node auto-deploy.js
```

**Mac/Linux:**
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxx
export GITHUB_OWNER=你的GitHub用户名
export GITHUB_REPO=car-scout
export RENDER_API_KEY=rnd_xxxxxxxxxx

node auto-deploy.js
```

#### 方式2：使用配置文件

1. 复制 `.env.example` 为 `.env`
2. 用记事本打开 `.env` 文件
3. 填写您的Token：
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-github-username
GITHUB_REPO=car-scout
RENDER_API_KEY=rnd_xxxxxxxxxxxxxxxxxxxx
```
4. 保存文件
5. 双击运行 `API自动部署.bat`

---

## 🎉 完成！

部署成功后，您会得到：

```
✅ 部署成功！

═══════════════════════════════════════
  GitHub: https://github.com/用户名/car-scout
  访问地址: https://car-scout-xxxx.onrender.com
═══════════════════════════════════════
```

**将访问地址分享给合伙人即可！**

---

## 📋 API权限说明

### GitHub Token需要权限：
- **repo** - 完整控制仓库
  - 创建仓库
  - 推送代码
  - 管理仓库设置

### Render API Key权限：
- 创建Web Service
- 管理部署
- 查看服务状态

---

## 🔐 安全提示

1. **Token保密** - 不要分享给他人，不要在代码中硬编码
2. **定期更换** - 建议每3个月更换一次Token
3. **使用后删除** - 如果Token泄露，立即在GitHub/Render删除
4. **本地存储** - 建议保存在本地环境变量，不要上传到GitHub

---

## ❓ 常见问题

### Q: Token无效？
**A:** 
- 检查Token是否复制完整
- 检查GitHub Token是否有"repo"权限
- 检查Render API Key是否有效

### Q: 部署失败？
**A:**
- 检查网络连接
- 检查用户名是否正确
- 查看错误信息提示

### Q: 如何重新部署？
**A:**
```bash
# 修改代码后
node auto-deploy.js
# 会自动更新GitHub并重新部署
```

---

## 📞 获取帮助

- GitHub API文档：https://docs.github.com/en/rest
- Render API文档：https://render.com/docs/api

---

**现在就去获取Token并开始部署吧！** 🚀

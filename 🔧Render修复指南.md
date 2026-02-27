# 🔧 Render 部署修复指南

## 问题
Render仍在使用旧的启动命令 `node src/web-server.js`

## 解决方案

### 方法1：在Render Dashboard中修改（推荐）

1. 打开 https://dashboard.render.com
2. 找到 **car-scout** 服务
3. 点击 **Settings** 标签
4. 找到 **Start Command**
5. 修改为：
   ```
   node index.js
   ```
6. 点击 **Save Changes**
7. 点击 **Manual Deploy** → **Deploy latest commit**
8. 等待部署完成

### 方法2：删除并重新创建服务

如果方法1无效：

1. 在Render Dashboard中删除 car-scout 服务
2. 点击 **New +** → **Web Service**
3. 选择 **Car-Scout** 仓库
4. 配置：
   - **Name**: car-scout
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js` ⚠️ 注意是这个
   - **Plan**: Free
5. 点击 **Create Web Service**

### 方法3：使用Shell命令修复

在Render Dashboard中：

1. 进入 car-scout 服务
2. 点击 **Shell** 标签
3. 运行：
   ```bash
   cat render.yaml
   ```
4. 确认显示 `startCommand: node index.js`
5. 如果不正确，需要重新部署

---

## ✅ 验证修复

部署完成后，访问：
```
https://car-scout-xxx.onrender.com
```

应该能看到车辆管理看板！

---

## 📝 重要提醒

**为什么出现这个问题？**
- 之前配置是 `node src/web-server.js`
- 现在已经改为 `node index.js`
- 但Render可能缓存了旧配置

**修复后的文件结构：**
```
project/
├── index.js          ← 入口文件（新增）
├── package.json
├── render.yaml       ← 已更新
├── src/
│   ├── web-server.js
│   └── ...
```

---

## 🚀 推荐操作

**最简单的方法：删除服务重新创建**

这样确保使用最新的配置！

---

**需要其他帮助吗？**

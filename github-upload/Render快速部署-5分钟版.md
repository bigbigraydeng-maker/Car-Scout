# 🚀 Render快速部署（5分钟搞定）

## 超简单3步法

---

### 第1步：上传代码到GitHub（2分钟）

1. 打开 https://github.com/new
2. 输入名称：`car-scout`，点击创建
3. 在项目文件夹中执行：

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/你的用户名/car-scout.git
git push -u origin main
```

---

### 第2步：在Render创建服务（2分钟）

1. 打开 https://dashboard.render.com
2. 用GitHub登录
3. 点击 **New +** → **Web Service**
4. 选择 `car-scout` 仓库
5. 填写：
   - Name: `car-scout`
   - Build Command: `npm install`
   - Start Command: `node src/web-server.js`
   - Plan: **Free**
6. 点击 **Create Web Service**

---

### 第3步：获取地址（1分钟）

等待部署完成（2-3分钟），您会得到：

```
https://car-scout-xxxx.onrender.com
```

**这就是合伙人访问地址！**

---

## 📱 合伙人如何使用

1. 手机/电脑浏览器打开上述地址
2. 即可查看所有车辆
3. 页面每30秒自动刷新

---

## ⚠️ 重要提醒

### 免费版会"休眠"
- 15分钟无人访问后进入休眠
- 下次访问需要等待10-30秒唤醒
- **解决方法：每天早上自己访问一次**

### 数据会丢失吗？
- 数据库在 `database/vehicles.json`
- Render会定期重置（很少发生）
- **建议：每周备份一次数据库文件**

---

## 🔧 如何更新代码？

修改代码后执行：
```bash
git add .
git commit -m "更新"
git push origin main
```

Render会自动重新部署！

---

## ❓ 遇到问题？

查看详细指南：**Render部署完整指南.md**

---

**现在就开始部署吧！🚀**

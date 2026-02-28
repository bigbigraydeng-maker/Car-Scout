# 📘 Facebook自动化 - 本地实施方案

## 🚀 一键配置（10分钟）

### 前提条件
- ✅ Windows电脑（每天开机）
- ✅ Node.js已安装
- ✅ Facebook已登录（有有效的cookies）

---

## 步骤1：双击配置定时任务

1. **右键** `setup-windows-task.bat`
2. 选择 **"以管理员身份运行"**
3. 看到 ✅ "定时任务创建成功"

**完成！** 现在每天早上9点自动运行。

---

## 步骤2：立即测试

打开命令行，执行：
```bash
cd C:\Users\Zhong\.openclaw\workspace-car-scout-toyota
node src/auto-sync.js
```

观察输出：
- ✅ 抓取完成 → 数据已更新
- ❌ 验证码出现 → 需要人工处理（打开浏览器登录）

---

## 步骤3：验证GitHub同步

1. 打开 https://github.com/bigbigraydeng-maker/Car-Scout
2. 查看 `database/vehicles.json`
3. 应该看到更新时间和车辆数据

---

## 工作流程

### 每天早上9点：
```
Windows自动运行 → 抓取Facebook → 合并数据 → 推送到GitHub → Render自动更新
```

### 你需要做的：
- ✅ 保持电脑开机（或设置自动开机）
- ⚠️ 偶尔处理验证码（一周1-2次）
- ✅ 查看网站数据是否正常

---

## 常见问题

### Q: 电脑关机了怎么办？
**A:** 任务会在下次开机时补运行，或手动运行一次。

### Q: 出现验证码怎么办？
**A:** 
1. 脚本会暂停
2. 你打开Facebook浏览器
3. 完成验证
4. 重新运行脚本

### Q: 推送GitHub失败？
**A:** 检查GitHub Token是否过期，需要重新配置。

### Q: 想改时间？
**A:** 打开"任务计划程序"，找到 CarScoutFacebookScraper，修改触发器时间。

---

## 备选：手动运行

如果不想配置定时任务，每天手动双击：
```
1. 双击 1-开始抓取.bat
2. 等待完成
3. 数据自动保存
```

---

## 技术原理

```
本地定时任务
    ↓ 调用 Node.js
    ↓ 运行 facebook-scraper-v4.js（使用已保存的登录状态）
    ↓ 抓取数据
    ↓ 合并到 database/vehicles.json
    ↓ git push 到 GitHub
    ↓ Render检测到更新，自动重新部署
    ↓ 网站显示最新数据
```

**为什么安全？**
- 使用你日常登录的浏览器环境
- 不频繁切换IP
- 抓取频率低（每天一次）
- 模拟真人操作

---

## 🎉 完成！

现在你有：
- ✅ TradeMe：完全云端自动化（每天自动更新）
- ✅ Facebook：本地自动化（每天自动同步）
- ✅ 网站：自动显示最新数据

**基本实现全自动！** 每周只需花5分钟检查一次即可。

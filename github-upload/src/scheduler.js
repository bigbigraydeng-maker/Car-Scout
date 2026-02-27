/**
 * 定时任务配置
 * - 每天 8:00 更新 TradeMe 数据
 * - 每小时检查卖家回复
 */

const cron = require('node-cron');
const { exec } = require('child');
const fs = require('fs');
const path = require('path');

// 每天 8:00 抓取 TradeMe 数据
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ [' + new Date().toISOString() + '] 开始每日 TradeMe 数据更新...');
  
  try {
    // 运行 TradeMe 抓取脚本
    exec('node src/step1-trademe.js', { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ TradeMe 抓取失败:', error);
        return;
      }
      console.log('✅ TradeMe 数据更新完成');
      console.log(stdout);
      
      // 运行利润分析
      exec('node src/calculate-profit.js', { cwd: process.cwd() }, (err) => {
        if (!err) {
          console.log('✅ 利润分析完成');
        }
      });
    });
  } catch (err) {
    console.error('❌ 定时任务错误:', err);
  }
});

// 每小时检查 TradeMe 消息（模拟检查）
cron.schedule('0 * * * *', async () => {
  console.log('⏰ [' + new Date().toISOString() + '] 检查卖家回复...');
  
  // 检查消息记录文件
  const messagesFile = path.join(__dirname, '..', 'data', 'trademe_messages.json');
  
  if (fs.existsSync(messagesFile)) {
    const messages = JSON.parse(fs.readFileSync(messagesFile));
    const unreadCount = messages.filter(m => !m.read).length;
    
    if (unreadCount > 0) {
      console.log(`📩 您有 ${unreadCount} 条未读消息！`);
      
      // 发送通知（如果需要）
      messages.filter(m => !m.read).forEach(m => {
        console.log(`   - ${m.sender}: ${m.preview}`);
      });
    } else {
      console.log('📭 没有新消息');
    }
  }
});

console.log('✅ 定时任务已启动');
console.log('   - 每天 8:00 更新 TradeMe 数据');
console.log('   - 每小时检查卖家回复');
console.log('   - 按 Ctrl+C 停止\n');

// 保持运行
setInterval(() => {}, 1000);

/**
 * TradeMe 消息监控
 * 每小时检查一次卖家回复
 */

const fs = require('fs');
const path = require('path');

const CHECK_INTERVAL = 60 * 60 * 1000; // 1小时
const MESSAGES_FILE = path.join(__dirname, '..', 'data', 'trademe_messages.json');
const LAST_CHECK_FILE = path.join(__dirname, '..', 'data', 'last_check.txt');

// 模拟消息数据（实际应从 TradeMe API 或页面获取）
function checkMessages() {
  const now = new Date();
  console.log('\n' + '═'.repeat(60));
  console.log('📧 TradeMe 消息检查 -', now.toLocaleString());
  console.log('═'.repeat(60));
  
  // 检查是否有新消息文件
  if (!fs.existsSync(MESSAGES_FILE)) {
    console.log('ℹ️  暂无消息记录');
    console.log('💡 提示：TradeMe 消息需要手动在网站中查看');
    console.log('   登录 https://www.trademe.co.nz 查看消息\n');
    return;
  }
  
  try {
    const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    const lastCheck = fs.existsSync(LAST_CHECK_FILE) 
      ? new Date(fs.readFileSync(LAST_CHECK_FILE, 'utf8'))
      : new Date(0);
    
    // 筛选新消息
    const newMessages = messages.filter(m => new Date(m.timestamp) > lastCheck);
    
    if (newMessages.length === 0) {
      console.log('📭 没有新消息\n');
    } else {
      console.log(`📩 发现 ${newMessages.length} 条新消息！\n`);
      
      newMessages.forEach((m, i) => {
        console.log(`${i+1}. 🚗 ${m.vehicle || '未知车辆'}`);
        console.log(`   来自: ${m.sender}`);
        console.log(`   时间: ${new Date(m.timestamp).toLocaleString()}`);
        console.log(`   内容: ${m.content.substring(0, 100)}...`);
        console.log(`   🔗 ${m.link || '查看详情: https://www.trademe.co.nz/MyTradeMe/Messages'}\n`);
      });
      
      // 标记为已读
      messages.forEach(m => {
        if (newMessages.includes(m)) m.read = true;
      });
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    }
    
    // 更新最后检查时间
    fs.writeFileSync(LAST_CHECK_FILE, now.toISOString());
    
  } catch (err) {
    console.error('❌ 检查消息失败:', err.message);
  }
}

// 立即检查一次
checkMessages();

// 每小时检查
console.log('\n⏰ 已设置每小时自动检查');
console.log('   下次检查:', new Date(Date.now() + CHECK_INTERVAL).toLocaleString());
console.log('   按 Ctrl+C 停止监控\n');

setInterval(checkMessages, CHECK_INTERVAL);

// 保持运行
setInterval(() => {}, 1000);

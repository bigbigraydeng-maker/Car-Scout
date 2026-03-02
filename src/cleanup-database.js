/**
 * cleanup-database.js
 * 清理低分旧车数据，只保留值得跟进的车
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const FOLLOWING_FILE = path.join(DATA_DIR, 'following.md');

// 加载配置
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
const { minFlipScore, maxAgeDays } = config.dataRetention;

console.log('🧹 开始清理数据库...');
console.log(`📊 保留规则: Flip Score ≥ ${minFlipScore}, 最大年龄 ${maxAgeDays} 天`);

// 读取跟进列表ID
function getFollowingIds() {
  try {
    const content = fs.readFileSync(FOLLOWING_FILE, 'utf8');
    const matches = content.match(/\/marketplace\/item\/(\d+)\//g);
    return matches ? matches.map(m => m.match(/(\d+)/)[1]) : [];
  } catch (e) {
    return [];
  }
}

// 清理JSON数据文件
function cleanupJsonFiles() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const followingIds = getFollowingIds();
  let cleaned = 0;
  let kept = 0;
  
  files.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (!Array.isArray(data)) {
        // 单个车辆对象
        if (shouldKeep(data, followingIds)) {
          kept++;
        } else {
          fs.unlinkSync(filePath);
          cleaned++;
        }
        return;
      }
      
      // 数组格式
      const originalCount = data.length;
      const filtered = data.filter(item => shouldKeep(item, followingIds));
      
      if (filtered.length === 0) {
        fs.unlinkSync(filePath);
        cleaned++;
      } else if (filtered.length < originalCount) {
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        kept += filtered.length;
        cleaned += (originalCount - filtered.length);
      } else {
        kept += originalCount;
      }
    } catch (e) {
      console.log(`  ⚠️ 跳过 ${file}: ${e.message}`);
    }
  });
  
  console.log(`\n📈 清理结果:`);
  console.log(`  ✅ 保留: ${kept} 辆车`);
  console.log(`  🗑️ 删除: ${cleaned} 辆车`);
}

// 判断是否保留
function shouldKeep(item, followingIds) {
  // 跟进列表优先保留
  if (item.id && followingIds.includes(String(item.id))) {
    return true;
  }
  
  // Flip Score 检查
  const flipScore = item.flipScore || item.flip?.score || 0;
  if (flipScore >= minFlipScore) {
    return true;
  }
  
  // 年龄检查
  const listingDate = item.listingDate || item.date || item.createdAt;
  if (listingDate) {
    const age = (Date.now() - new Date(listingDate).getTime()) / (1000 * 60 * 60 * 24);
    if (age <= 3) { // 新车给3天观察期
      return true;
    }
  }
  
  return false;
}

// 主函数
function main() {
  const followingIds = getFollowingIds();
  console.log(`📌 跟进列表: ${followingIds.length} 辆车`);
  
  cleanupJsonFiles();
  
  console.log('\n✅ 清理完成');
}

main();

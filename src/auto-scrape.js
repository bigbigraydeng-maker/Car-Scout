#!/usr/bin/env node

/**
 * 自动抓取脚本 - 每天定时运行
 * 1. 抓取TradeMe（不需要登录）
 * 2. 合并到数据库
 * 3. 筛选超里程车辆
 * 4. 生成看板
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Car Scout 自动抓取系统');
console.log('========================');
console.log('时间:', new Date().toISOString());
console.log('');

// 确保目录存在
const dirs = ['database', 'data', 'logs', 'reports', 'reports/visual', 'reports/daily'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 创建目录: ${dir}`);
  }
});

// 确保数据库存在
const dbPath = path.join(__dirname, '..', 'database', 'vehicles.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({
    vehicles: [],
    lastUpdate: new Date().toISOString(),
    version: '1.0'
  }, null, 2));
  console.log('✅ 创建初始数据库');
}

const projectRoot = path.join(__dirname, '..');

async function runCommand(command, description) {
  console.log(`\n🔹 ${description}...`);
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: projectRoot,
      timeout: 300000  // 5分钟超时
    });
    console.log(`✅ ${description}完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${description}失败:`, error.message);
    return false;
  }
}

async function main() {
  console.log('📦 开始自动抓取流程...\n');
  
  // 1. 运行TradeMe抓取
  await runCommand('node src/trademe-scraper.js', '抓取TradeMe数据');
  
  // 2. 合并到数据库
  await runCommand('node src/merge-trademe.js', '合并数据到数据库');
  
  // 3. 筛选超里程车辆
  await runCommand('node src/filter-by-mileage.js', '筛选超里程车辆');
  
  // 4. 生成看板
  await runCommand('node src/dashboard.js dashboard', '生成可视化看板');
  
  // 5. 显示统计
  console.log('\n📊 抓取完成统计：');
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log(`   数据库车辆总数: ${db.vehicles.length}`);
    
    const newVehicles = db.vehicles.filter(v => v.status === 'new');
    console.log(`   新发现车辆: ${newVehicles.length}`);
    
    const trademeVehicles = db.vehicles.filter(v => v.source === 'trademe');
    console.log(`   TradeMe车辆: ${trademeVehicles.length}`);
    
    const fbVehicles = db.vehicles.filter(v => !v.source || v.source === 'facebook');
    console.log(`   Facebook车辆: ${fbVehicles.length}`);
    
  } catch (e) {
    console.log('   无法读取统计数据');
  }
  
  console.log('\n🎉 自动抓取完成！');
  console.log('网站数据已更新: https://car-scout.onrender.com/');
}

main().catch(error => {
  console.error('\n❌ 自动抓取出错:', error.message);
  process.exit(1);
});

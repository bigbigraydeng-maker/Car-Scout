#!/usr/bin/env node

/**
 * 本地自动同步脚本
 * 每天自动抓取Facebook并推送到GitHub
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Facebook自动同步');
console.log('===================');
console.log('时间:', new Date().toLocaleString());
console.log('');

try {
  // 1. 抓取Facebook
  console.log('🔍 步骤1: 抓取Facebook...');
  execSync('node src/facebook-scraper-v4.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    timeout: 600000  // 10分钟超时
  });
  console.log('✅ Facebook抓取完成\n');

  // 2. 合并数据
  console.log('📊 步骤2: 合并数据...');
  execSync('node src/merge-facebook.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ 数据合并完成\n');

  // 3. 筛选超里程
  console.log('🚗 步骤3: 筛选超里程车辆...');
  execSync('node src/filter-by-mileage.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ 筛选完成\n');

  // 4. 生成看板
  console.log('📈 步骤4: 生成看板...');
  execSync('node src/dashboard.js dashboard', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ 看板生成完成\n');

  // 5. 推送到GitHub
  console.log('📤 步骤5: 推送到GitHub...');
  const date = new Date().toISOString().split('T')[0];
  
  try {
    execSync('git add database/ data/ reports/', { cwd: path.join(__dirname, '..') });
    execSync(`git commit -m "Auto sync: ${date} Facebook data"`, { 
      cwd: path.join(__dirname, '..'),
      stdio: 'ignore'
    });
    execSync('git push origin main', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 60000
    });
    console.log('✅ 推送到GitHub成功\n');
  } catch (e) {
    console.log('⚠️  GitHub推送失败（可能token过期或网络问题）\n');
  }

  console.log('🎉 自动同步完成！');
  console.log('网站将在Render自动更新（约2分钟）');
  console.log('访问: https://car-scout.onrender.com/');

} catch (error) {
  console.error('\n❌ 自动同步失败:', error.message);
  console.log('\n可能原因：');
  console.log('1. Facebook需要重新登录');
  console.log('2. 出现验证码需要人工处理');
  console.log('3. 网络连接问题');
  process.exit(1);
}
